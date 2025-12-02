"""
Item Verification API - Verification, filtering, CSV export, and variance tracking
"""

import asyncio
import csv
import io
import logging
from copy import deepcopy
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from backend.auth.dependencies import get_current_user_async as get_current_user

logger = logging.getLogger(__name__)

# These will be initialized at runtime
db: AsyncIOMotorDatabase = None


def init_verification_api(database):
    """Initialize verification API with dependencies"""
    global db
    db = database


verification_router = APIRouter(prefix="/api/v2/erp/items", tags=["Item Verification"])


def _regex_filter(value: Optional[str]) -> Optional[Dict[str, str]]:
    if not value:
        return None
    return {"$regex": value, "$options": "i"}


def build_item_filter_query(
    *,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    floor: Optional[str] = None,
    rack: Optional[str] = None,
    warehouse: Optional[str] = None,
    uom_code: Optional[str] = None,
    verified: Optional[bool] = None,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a MongoDB filter dict for ERP items."""
    filter_query: Dict[str, Any] = {}

    category_filter = _regex_filter(category)
    if category_filter:
        filter_query["category"] = category_filter

    subcategory_filter = _regex_filter(subcategory)
    if subcategory_filter:
        filter_query["subcategory"] = subcategory_filter

    floor_filter = _regex_filter(floor)
    if floor_filter:
        filter_query["floor"] = floor_filter

    rack_filter = _regex_filter(rack)
    if rack_filter:
        filter_query["rack"] = rack_filter

    warehouse_filter = _regex_filter(warehouse)
    if warehouse_filter:
        filter_query["warehouse"] = warehouse_filter

    if uom_code:
        filter_query["uom_code"] = uom_code

    if verified is not None:
        filter_query["verified"] = verified

    if search:
        filter_query["$or"] = [
            {"item_name": {"$regex": search, "$options": "i"}},
            {"item_code": {"$regex": search, "$options": "i"}},
            {"barcode": {"$regex": search, "$options": "i"}},
        ]

    return filter_query


def serialize_mongo_datetime(value: Optional[datetime]) -> str:
    return value.isoformat() if isinstance(value, datetime) else ""


def serialize_item_document(item: Dict[str, Any]) -> Dict[str, Any]:
    """Return a JSON-serializable copy of an ERP item document."""
    serialized = dict(item)
    if "_id" in serialized:
        serialized["_id"] = str(serialized["_id"])

    for field in ("verified_at", "last_scanned_at"):
        if field in serialized:
            serialized[field] = serialize_mongo_datetime(serialized.get(field))

    return serialized


class VerificationRequest(BaseModel):
    verified: bool
    verified_qty: Optional[float] = None
    damaged_qty: Optional[float] = 0.0
    non_returnable_damaged_qty: Optional[float] = 0.0
    item_condition: Optional[str] = "Good"
    serial_number: Optional[str] = None
    notes: Optional[str] = None
    floor: Optional[str] = None
    rack: Optional[str] = None
    session_id: Optional[str] = None
    count_line_id: Optional[str] = None


class ItemUpdateRequest(BaseModel):
    mrp: Optional[float] = None
    sales_price: Optional[float] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    uom: Optional[str] = None


@verification_router.patch("/{item_code}/update-master")
async def update_item_master(
    item_code: str,
    request: ItemUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Update item master details (MRP, Price, Category, etc.)
    """
    try:
        # Get current item
        item = await db.erp_items.find_one({"item_code": item_code})
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_code} not found")

        update_doc = {
            "$set": {
                "last_updated_by": current_user["username"],
                "last_updated_at": datetime.utcnow(),
            }
        }

        if request.mrp is not None:
            update_doc["$set"]["mrp"] = request.mrp
        if request.sales_price is not None:
            update_doc["$set"]["sales_price"] = request.sales_price
        if request.category is not None:
            update_doc["$set"]["category"] = request.category
        if request.subcategory is not None:
            update_doc["$set"]["subcategory"] = request.subcategory
        if request.uom is not None:
            update_doc["$set"]["uom"] = request.uom

        await db.erp_items.update_one({"item_code": item_code}, update_doc)

        # Log the change
        await db.audit_logs.insert_one(
            {
                "action": "MASTER_UPDATE",
                "item_code": item_code,
                "changes": request.dict(exclude_none=True),
                "user": current_user["username"],
                "timestamp": datetime.utcnow(),
            }
        )

        return {"success": True, "message": "Item details updated successfully"}

    except Exception as e:
        logger.error(f"Error updating item master {item_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@verification_router.patch("/{item_code}/verify")
async def verify_item(
    item_code: str,
    request: VerificationRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Mark an item as verified/unverified with user tracking and timestamp
    """
    try:
        # Get current item
        item = await db.erp_items.find_one({"item_code": item_code})
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_code} not found")

        # Calculate variance if verified_qty provided
        # Variance = (Verified/Good + Returnable Damage) - System Qty
        variance = None
        if request.verified_qty is not None:
            system_qty = item.get("stock_qty", 0.0)
            total_assets = request.verified_qty + (request.damaged_qty or 0.0)
            variance = total_assets - system_qty

        # Update item with verification data
        update_doc = {
            "$set": {
                "verified": request.verified,
                "verified_by": current_user["username"],
                "verified_at": datetime.utcnow(),
                "last_scanned_at": datetime.utcnow(),
            }
        }

        if request.verified_qty is not None:
            update_doc["$set"]["verified_qty"] = request.verified_qty
            update_doc["$set"]["variance"] = variance

        # New fields
        if request.damaged_qty is not None:
            update_doc["$set"]["damaged_qty"] = request.damaged_qty
        if request.non_returnable_damaged_qty is not None:
            update_doc["$set"]["non_returnable_damaged_qty"] = request.non_returnable_damaged_qty
        if request.item_condition:
            update_doc["$set"]["item_condition"] = request.item_condition
        if request.serial_number:
            update_doc["$set"]["serial_number"] = request.serial_number
        if request.floor:
            update_doc["$set"]["verified_floor"] = request.floor
        if request.rack:
            update_doc["$set"]["verified_rack"] = request.rack
        if request.session_id:
            update_doc["$set"]["session_id"] = request.session_id

        if request.notes:
            update_doc["$set"]["verification_notes"] = request.notes

        await db.erp_items.update_one({"item_code": item_code}, update_doc)

        # Create variance record if there's a variance OR if we are just recording a verification
        # We should probably record every verification event now, not just variances,
        # to track the "Session" progress.

        verification_log = {
            "item_code": item_code,
            "item_name": item.get("item_name", ""),
            "system_qty": item.get("stock_qty", 0.0),
            "verified_qty": request.verified_qty,
            "damaged_qty": request.damaged_qty,
            "non_returnable_damaged_qty": request.non_returnable_damaged_qty,
            "variance": variance,
            "verified_by": current_user["username"],
            "verified_at": datetime.utcnow(),
            "category": item.get("category", ""),
            "subcategory": item.get("subcategory", ""),
            "floor": request.floor or item.get("floor", ""),
            "rack": request.rack or item.get("rack", ""),
            "warehouse": item.get("warehouse", ""),
            "session_id": request.session_id,
            "count_line_id": request.count_line_id,
            "item_condition": request.item_condition,
            "serial_number": request.serial_number,
        }

        # Insert into verification_logs (new collection for full history)
        await db.verification_logs.insert_one(verification_log)

        # Maintain legacy variance collection for backward compatibility if variance exists
        if variance is not None and variance != 0:
            await db.item_variances.insert_one(verification_log)

        # Get updated item
        updated_item = await db.erp_items.find_one({"item_code": item_code})
        updated_item["_id"] = str(updated_item["_id"])

        return {
            "success": True,
            "item": updated_item,
            "variance": variance,
            "message": f"Item {item_code} marked as {'verified' if request.verified else 'unverified'}",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying item {item_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@verification_router.get("/filtered")
async def get_filtered_items(
    category: Optional[str] = Query(None, description="Filter by category"),
    subcategory: Optional[str] = Query(None, description="Filter by subcategory"),
    floor: Optional[str] = Query(None, description="Filter by floor"),
    rack: Optional[str] = Query(None, description="Filter by rack"),
    warehouse: Optional[str] = Query(None, description="Filter by warehouse"),
    uom_code: Optional[str] = Query(None, description="Filter by UOM code"),
    verified: Optional[bool] = Query(None, description="Filter by verification status"),
    search: Optional[str] = Query(None, description="Search in item name/code"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum results"),
    skip: int = Query(0, ge=0, description="Skip results"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get filtered list of items with various filter options
    """
    try:
        filter_query = build_item_filter_query(
            category=category,
            subcategory=subcategory,
            floor=floor,
            rack=rack,
            warehouse=warehouse,
            uom_code=uom_code,
            verified=verified,
            search=search,
        )

        verified_filter = deepcopy(filter_query)
        verified_filter["verified"] = True

        items_task = db.erp_items.find(filter_query).skip(skip).limit(limit).to_list(length=limit)
        total_count_task = db.erp_items.count_documents(filter_query)
        verified_count_task = db.erp_items.count_documents(verified_filter)

        items, total_count, verified_count = await asyncio.gather(
            items_task, total_count_task, verified_count_task
        )

        items = [serialize_item_document(item) for item in items]
        total_qty = sum(item.get("stock_qty", 0.0) for item in items)

        return {
            "success": True,
            "items": items,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "skip": skip,
                "returned": len(items),
            },
            "statistics": {
                "total_items": total_count,
                "verified_items": verified_count,
                "unverified_items": total_count - verified_count,
                "total_qty": total_qty,
            },
        }

    except Exception as e:
        logger.error(f"Error getting filtered items: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get items: {str(e)}")


@verification_router.get("/export/csv")
async def export_items_csv(
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    floor: Optional[str] = Query(None),
    rack: Optional[str] = Query(None),
    warehouse: Optional[str] = Query(None),
    verified: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Export filtered items to CSV
    """
    try:
        filter_query = build_item_filter_query(
            category=category,
            subcategory=subcategory,
            floor=floor,
            rack=rack,
            warehouse=warehouse,
            verified=verified,
            search=search,
        )

        # Get all matching items
        cursor = db.erp_items.find(filter_query)
        items = await cursor.to_list(length=None)

        # Create CSV in memory
        output = io.StringIO()
        fieldnames = [
            "item_code",
            "item_name",
            "barcode",
            "stock_qty",
            "mrp",
            "category",
            "subcategory",
            "uom_code",
            "uom_name",
            "floor",
            "rack",
            "warehouse",
            "verified",
            "verified_by",
            "verified_at",
            "last_scanned_at",
        ]

        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()

        for item in items:
            row = {
                "item_code": item.get("item_code", ""),
                "item_name": item.get("item_name", ""),
                "barcode": item.get("barcode", ""),
                "stock_qty": item.get("stock_qty", 0.0),
                "mrp": item.get("mrp", 0.0),
                "category": item.get("category", ""),
                "subcategory": item.get("subcategory", ""),
                "uom_code": item.get("uom_code", ""),
                "uom_name": item.get("uom_name", ""),
                "floor": item.get("floor", ""),
                "rack": item.get("rack", ""),
                "warehouse": item.get("warehouse", ""),
                "verified": "Yes" if item.get("verified", False) else "No",
                "verified_by": item.get("verified_by", ""),
                "verified_at": serialize_mongo_datetime(item.get("verified_at")),
                "last_scanned_at": serialize_mongo_datetime(item.get("last_scanned_at")),
            }
            writer.writerow(row)

        output.seek(0)
        filename = f"items_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except Exception as e:
        logger.error(f"Error exporting items to CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")


@verification_router.get("/variances")
async def get_variances(
    category: Optional[str] = Query(None),
    floor: Optional[str] = Query(None),
    rack: Optional[str] = Query(None),
    warehouse: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """
    Get list of items with variances (verified qty != system qty)
    """
    try:
        filter_query = {}

        if category:
            filter_query["category"] = {"$regex": category, "$options": "i"}

        if floor:
            filter_query["floor"] = {"$regex": floor, "$options": "i"}

        if rack:
            filter_query["rack"] = {"$regex": rack, "$options": "i"}

        if warehouse:
            filter_query["warehouse"] = {"$regex": warehouse, "$options": "i"}

        # Only get variances (non-zero)
        filter_query["variance"] = {"$ne": 0}

        # Get total count
        total_count = await db.item_variances.count_documents(filter_query)

        # Get variances
        cursor = (
            db.item_variances.find(filter_query).sort("verified_at", -1).skip(skip).limit(limit)
        )
        variances = await cursor.to_list(length=limit)

        # Convert ObjectId to string
        for variance in variances:
            variance["_id"] = str(variance["_id"])
            if isinstance(variance.get("verified_at"), datetime):
                variance["verified_at"] = variance["verified_at"].isoformat()

        return {
            "success": True,
            "variances": variances,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "skip": skip,
                "returned": len(variances),
            },
        }

    except Exception as e:
        logger.error(f"Error getting variances: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get variances: {str(e)}")


@verification_router.get("/live/users")
async def get_live_users(current_user: dict = Depends(get_current_user)):
    """
    Get list of currently active users (users who have verified items in last hour)
    """
    try:
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)

        # Get distinct users who verified items in last hour
        pipeline = [
            {
                "$match": {
                    "verified_at": {"$gte": one_hour_ago},
                    "verified_by": {"$exists": True, "$ne": None},
                }
            },
            {
                "$group": {
                    "_id": "$verified_by",
                    "last_activity": {"$max": "$verified_at"},
                    "items_verified": {"$sum": 1},
                }
            },
            {"$sort": {"last_activity": -1}},
        ]

        cursor = db.erp_items.aggregate(pipeline)
        users = await cursor.to_list(length=None)

        result = [
            {
                "username": user["_id"],
                "last_activity": (
                    user["last_activity"].isoformat()
                    if isinstance(user["last_activity"], datetime)
                    else user["last_activity"]
                ),
                "items_verified": user["items_verified"],
            }
            for user in users
        ]

        return {"success": True, "users": result, "count": len(result)}

    except Exception as e:
        logger.error(f"Error getting live users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get live users: {str(e)}")


@verification_router.get("/live/verifications")
async def get_live_verifications(
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
):
    """
    Get live feed of recent item verifications
    """
    try:
        # Get recent verifications
        cursor = (
            db.erp_items.find(
                {
                    "verified": True,
                    "verified_at": {"$exists": True},
                }
            )
            .sort("verified_at", -1)
            .limit(limit)
        )

        verifications = await cursor.to_list(length=limit)

        result = []
        for item in verifications:
            result.append(
                {
                    "item_code": item.get("item_code", ""),
                    "item_name": item.get("item_name", ""),
                    "verified_by": item.get("verified_by", ""),
                    "verified_at": (
                        item.get("verified_at").isoformat() if item.get("verified_at") else None
                    ),
                    "floor": item.get("floor", ""),
                    "rack": item.get("rack", ""),
                    "category": item.get("category", ""),
                    "variance": item.get("variance", 0.0),
                }
            )

        return {"success": True, "verifications": result, "count": len(result)}

    except Exception as e:
        logger.error(f"Error getting live verifications: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get live verifications: {str(e)}")
