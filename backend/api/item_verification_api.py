"""
Item Verification API - Verification, filtering, CSV export, and variance tracking
"""

import asyncio
import csv
import io
import logging
from copy import deepcopy
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from backend.auth.dependencies import get_current_user_async as get_current_user

logger = logging.getLogger(__name__)

# These will be initialized at runtime
db: AsyncIOMotorDatabase = None
cache_service = None


def init_verification_api(database, cache_svc=None):
    """Initialize verification API with dependencies"""
    global db, cache_service
    db = database
    cache_service = cache_svc


verification_router = APIRouter(prefix="/api/v2/erp/items", tags=["Item Verification"])


def _regex_filter(value: Optional[str]) -> dict[str, Optional[str]]:
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
) -> dict[str, Any]:
    """Create a MongoDB filter dict for ERP items."""
    filter_query: dict[str, Any] = {}

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


def serialize_item_document(item: dict[str, Any]) -> dict[str, Any]:
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
    is_serialized: Optional[bool] = None
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

        # Invalidate cache for this item
        if cache_service:
            # Try to invalidate by barcode if available, otherwise by item_code
            barcode = item.get("barcode")
            if barcode:
                await cache_service.delete_async("items", f"enhanced_{barcode}")
            # Also invalidate by item_code just in case
            await cache_service.delete_async("items", f"enhanced_{item_code}")

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating item master {item_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _calculate_variance(request: VerificationRequest, system_qty: float) -> Optional[float]:
    """Calculates the variance based on verified and damaged quantities."""
    if request.verified_qty is not None:
        total_assets = request.verified_qty + (request.damaged_qty or 0.0)
        return total_assets - system_qty
    return None


def _build_item_update_doc(
    request: VerificationRequest, current_user: dict, existing_item: dict
) -> dict[str, Any]:
    """Builds the update document for the erp_items collection."""
    update_fields = {
        "verified": request.verified,
        "verified_by": current_user["username"],
        "verified_at": datetime.utcnow(),
        "last_scanned_at": datetime.utcnow(),
    }

    if request.verified_qty is not None:
        update_fields["verified_qty"] = request.verified_qty
        update_fields["variance"] = _calculate_variance(
            request, existing_item.get("stock_qty", 0.0)
        )

    # Map request fields to update_fields, handling None values
    field_mapping = {
        "damaged_qty": "damaged_qty",
        "non_returnable_damaged_qty": "non_returnable_damaged_qty",
        "item_condition": "item_condition",
        "serial_number": "serial_number",
        "is_serialized": "is_serialized",
        "notes": "verification_notes",
        "session_id": "session_id",
    }

    for req_field, doc_field in field_mapping.items():
        req_value = getattr(request, req_field)
        if req_value is not None:  # Check for None explicitly, as 0.0 or False are valid
            update_fields[doc_field] = req_value

    # Special handling for serial_number to set is_serialized
    if request.serial_number:
        update_fields["is_serialized"] = True

    # Special handling for floor and rack
    if request.floor:
        update_fields["verified_floor"] = request.floor
        if existing_item.get("floor") in (None, ""):
            update_fields["floor"] = request.floor
    if request.rack:
        update_fields["verified_rack"] = request.rack
        if existing_item.get("rack") in (None, ""):
            update_fields["rack"] = request.rack

    return {"$set": update_fields}


def _build_verification_log_doc(
    request: VerificationRequest,
    current_user: dict,
    item: dict,
    variance: Optional[float],
    is_serialized_from_update: Optional[bool],
) -> dict[str, Any]:
    """Builds the document for verification_logs and item_variances collections."""
    return {
        "item_code": item.get("item_code", ""),
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
        "is_serialized": is_serialized_from_update,
    }


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
        item = await db.erp_items.find_one({"item_code": item_code})
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_code} not found")

        variance = _calculate_variance(request, item.get("stock_qty", 0.0))
        update_doc = _build_item_update_doc(request, current_user, item)

        await db.erp_items.update_one({"item_code": item_code}, update_doc)

        # Invalidate cache for this item
        if cache_service:
            # Try to invalidate by barcode if available, otherwise by item_code
            barcode = item.get("barcode")
            if barcode:
                await cache_service.delete_async("items", f"enhanced_{barcode}")
            # Also invalidate by item_code just in case
            await cache_service.delete_async("items", f"enhanced_{item_code}")

        # Get the actual is_serialized value that was set in the update_doc
        is_serialized_from_update = update_doc["$set"].get("is_serialized")

        verification_log = _build_verification_log_doc(
            request, current_user, item, variance, is_serialized_from_update
        )

        await db.verification_logs.insert_one(verification_log)

        if variance is not None and variance != 0:
            await db.item_variances.insert_one(verification_log)

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

        items_task = (
            db.erp_items.find(filter_query, {"_id": 0})  # Added projection to exclude _id
            .skip(skip)
            .limit(limit)
            .to_list(length=limit)
        )
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
    max_rows: int = Query(10000, ge=1, le=100000, description="Maximum rows to export"),
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

        # Define CSV fieldnames
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
            "verified_qty",
            "damaged_qty",
            "non_returnable_damaged_qty",
            "variance",
            "item_condition",
            "serial_number",
            "is_serialized",
            "session_id",
            "verification_notes",
        ]

        async def generate_csv_rows():
            # Create a StringIO object to write CSV data to
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            yield output.getvalue()  # Yield header row
            output.seek(0)
            output.truncate(0)

            # Get all matching items with a limit
            cursor = db.erp_items.find(filter_query).limit(max_rows)

            count = 0
            async for item in cursor:
                if count >= max_rows:
                    break
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
                    "verified_qty": item.get("verified_qty", 0.0),
                    "damaged_qty": item.get("damaged_qty", 0.0),
                    "non_returnable_damaged_qty": item.get("non_returnable_damaged_qty", 0.0),
                    "variance": item.get("variance", 0.0),
                    "item_condition": item.get("item_condition", ""),
                    "serial_number": item.get("serial_number", ""),
                    "is_serialized": ("Yes" if item.get("is_serialized", False) else "No"),
                    "session_id": item.get("session_id", ""),
                    "verification_notes": item.get("verification_notes", ""),
                }
                writer.writerow(row)
                yield output.getvalue()  # Yield the current row
                output.seek(0)
                output.truncate(0)  # Clear the buffer for the next row
                count += 1

        filename = f"items_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

        return StreamingResponse(
            generate_csv_rows(),
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
