import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.api.schemas import CountLineCreate
from backend.auth.dependencies import get_current_user
from backend.db.runtime import get_db
from backend.services.activity_log import ActivityLogService

logger = logging.getLogger(__name__)
router = APIRouter()

_activity_log_service: Optional[ActivityLogService] = None


def init_count_lines_api(activity_log_service: ActivityLogService):
    global _activity_log_service
    _activity_log_service = activity_log_service


def _get_db_client(db_override=None):
    """Resolve the active database client, raising if not initialized."""
    if db_override:
        return db_override
    try:
        return get_db()
    except RuntimeError:
        raise HTTPException(status_code=500, detail="Database is not initialized")


def _require_supervisor(current_user: dict):
    if current_user.get("role") not in {"supervisor", "admin"}:
        raise HTTPException(status_code=403, detail="Supervisor access required")


# Helper function to detect high-risk corrections
def detect_risk_flags(erp_item: dict, line_data: CountLineCreate, variance: float) -> List[str]:
    """Detect high-risk correction patterns"""
    risk_flags = []

    # Get values
    erp_qty = erp_item.get("stock_qty", 0)
    erp_mrp = erp_item.get("mrp", 0)
    counted_mrp = line_data.mrp_counted or erp_mrp

    # Calculate percentages safely
    variance_percent = (abs(variance) / erp_qty * 100) if erp_qty > 0 else 100
    mrp_change_percent = ((counted_mrp - erp_mrp) / erp_mrp * 100) if erp_mrp > 0 else 0

    # Rule 1: Large variance
    if abs(variance) > 100 or variance_percent > 50:
        risk_flags.append("LARGE_VARIANCE")

    # Rule 2: MRP reduced significantly
    if mrp_change_percent < -20:
        risk_flags.append("MRP_REDUCED_SIGNIFICANTLY")

    # Rule 3: High value item with variance
    if erp_mrp > 10000 and variance_percent > 5:
        risk_flags.append("HIGH_VALUE_VARIANCE")

    # Rule 4: Serial numbers missing for high-value item
    if erp_mrp > 5000 and (not line_data.serial_numbers or len(line_data.serial_numbers) == 0):
        risk_flags.append("SERIAL_MISSING_HIGH_VALUE")

    # Rule 5: Correction without reason when variance exists
    if abs(variance) > 0 and not line_data.correction_reason and not line_data.variance_reason:
        risk_flags.append("MISSING_CORRECTION_REASON")

    # Rule 6: MRP change without reason
    if (
        abs(mrp_change_percent) > 5
        and not line_data.correction_reason
        and not line_data.variance_reason
    ):
        risk_flags.append("MRP_CHANGE_WITHOUT_REASON")

    # Rule 7: Photo required but missing
    photo_required = (
        abs(variance) > 100
        or variance_percent > 50
        or abs(mrp_change_percent) > 20
        or erp_mrp > 10000
    )
    if (
        photo_required
        and not line_data.photo_base64
        and (not line_data.photo_proofs or len(line_data.photo_proofs) == 0)
    ):
        risk_flags.append("PHOTO_PROOF_REQUIRED")

    return risk_flags


# Helper function to calculate financial impact
def calculate_financial_impact(erp_mrp: float, counted_mrp: float, counted_qty: float) -> float:
    """Calculate revenue impact of MRP change"""
    old_value = erp_mrp * counted_qty
    new_value = counted_mrp * counted_qty
    return new_value - old_value


@router.post("/count-lines")
async def create_count_line(
    request: Request,
    line_data: CountLineCreate,
    current_user: dict = Depends(get_current_user),
):
    db = _get_db_client()

    # Validate session exists
    session = await db.sessions.find_one({"id": line_data.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get ERP item
    erp_item = await db.erp_items.find_one({"item_code": line_data.item_code})
    if not erp_item:
        raise HTTPException(status_code=404, detail="Item not found in ERP")

    # Calculate variance
    variance = line_data.counted_qty - erp_item["stock_qty"]

    # Validate mandatory correction reason for variance
    if abs(variance) > 0 and not line_data.correction_reason and not line_data.variance_reason:
        raise HTTPException(
            status_code=400,
            detail="Correction reason is mandatory when variance exists",
        )

    # Detect risk flags
    risk_flags = detect_risk_flags(erp_item, line_data, variance)

    # Calculate financial impact
    counted_mrp = line_data.mrp_counted or erp_item["mrp"]
    financial_impact = calculate_financial_impact(
        erp_item["mrp"], counted_mrp, line_data.counted_qty
    )

    # Determine approval status based on risk
    # High-risk corrections require supervisor review
    approval_status = "NEEDS_REVIEW" if risk_flags else "PENDING"

    # Duplicate check removed to allow multiple scans of the same item in the same session
    # (e.g. item found in multiple locations within the area)
    # duplicate_check = await db.count_lines.count_documents(...)

    # Create count line with enhanced fields
    count_line = {
        "id": str(uuid.uuid4()),
        "session_id": line_data.session_id,
        "item_code": line_data.item_code,
        "item_name": erp_item["item_name"],
        "barcode": erp_item["barcode"],
        "erp_qty": erp_item["stock_qty"],
        "counted_qty": line_data.counted_qty,
        "variance": variance,
        # Legacy fields
        "variance_reason": line_data.variance_reason,
        "variance_note": line_data.variance_note,
        "remark": line_data.remark,
        "photo_base64": line_data.photo_base64,
        # Enhanced fields
        "damaged_qty": line_data.damaged_qty,
        "damage_included": getattr(line_data, "damage_included", None),
        "item_condition": line_data.item_condition,
        "floor_no": line_data.floor_no,
        "rack_no": line_data.rack_no,
        "mark_location": line_data.mark_location,
        "sr_no": line_data.sr_no,
        "manufacturing_date": line_data.manufacturing_date,
        "category_correction": getattr(line_data, "category_correction", None),
        "subcategory_correction": getattr(line_data, "subcategory_correction", None),
        "correction_reason": (
            line_data.correction_reason.model_dump() if line_data.correction_reason else None
        ),
        "photo_proofs": (
            [p.model_dump() for p in line_data.photo_proofs] if line_data.photo_proofs else None
        ),
        "correction_metadata": (
            line_data.correction_metadata.model_dump() if line_data.correction_metadata else None
        ),
        "approval_status": approval_status,
        "approval_by": None,
        "approval_at": None,
        "rejection_reason": None,
        "risk_flags": risk_flags,
        "financial_impact": financial_impact,
        # User and timestamp
        "counted_by": current_user["username"],
        "counted_at": datetime.utcnow(),
        # MRP tracking
        "mrp_erp": erp_item["mrp"],
        "mrp_counted": line_data.mrp_counted,
        # Additional fields
        "split_section": line_data.split_section,
        "serial_numbers": line_data.serial_numbers,
        # Legacy approval fields
        "status": "pending",
        "verified": False,
        "verified_at": None,
        "verified_by": None,
    }

    await db.count_lines.insert_one(count_line)

    # Update session stats atomically using aggregation
    try:
        pipeline: List[Dict[str, Any]] = [
            {"$match": {"session_id": line_data.session_id}},
            {
                "$group": {
                    "_id": None,
                    "total_items": {"$sum": 1},
                    "total_variance": {"$sum": "$variance"},
                }
            },
        ]
        stats = await db.count_lines.aggregate(pipeline).to_list(1)
        if stats:
            await db.sessions.update_one(
                {"id": line_data.session_id},
                {
                    "$set": {
                        "total_items": stats[0]["total_items"],
                        "total_variance": stats[0]["total_variance"],
                    }
                },
            )
    except Exception as e:
        logger.error(f"Failed to update session stats: {str(e)}")
        # Non-critical error, continue execution

    # Log high-risk correction
    if risk_flags and _activity_log_service:
        await _activity_log_service.log_activity(
            user=current_user["username"],
            role=current_user["role"],
            action="high_risk_correction",
            entity_type="count_line",
            entity_id=count_line["id"],
            details={"risk_flags": risk_flags, "item_code": line_data.item_code},
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )

    # Remove the MongoDB _id field before returning
    count_line.pop("_id", None)
    return count_line


async def verify_stock(
    line_id: str,
    current_user: dict,
    *,
    request: Optional[Request] = None,
    db_override=None,
):
    """Mark a count line as verified. Exposed for direct test usage."""
    _require_supervisor(current_user)
    db_client = _get_db_client(db_override)

    update_result = await db_client.count_lines.update_one(
        {"id": line_id},
        update={
            "$set": {
                "verified": True,
                "verified_by": current_user["username"],
                "verified_at": datetime.utcnow(),
            }
        },
    )
    if update_result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Count line not found")

    if _activity_log_service:
        await _activity_log_service.log_activity(
            user=current_user["username"],
            role=current_user.get("role", ""),
            action="verify_stock",
            entity_type="count_line",
            entity_id=line_id,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )

    return {"message": "Stock verified", "verified": True}


async def unverify_stock(
    line_id: str,
    current_user: dict,
    *,
    request: Optional[Request] = None,
    db_override=None,
):
    """Remove verification metadata from a count line."""
    _require_supervisor(current_user)
    db_client = _get_db_client(db_override)

    update_result = await db_client.count_lines.update_one(
        {"id": line_id},
        update={"$set": {"verified": False, "verified_by": None, "verified_at": None}},
    )
    if update_result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Count line not found")

    if _activity_log_service:
        await _activity_log_service.log_activity(
            user=current_user["username"],
            role=current_user.get("role", ""),
            action="unverify_stock",
            entity_type="count_line",
            entity_id=line_id,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )

    return {"message": "Stock verification removed", "verified": False}


async def get_count_lines(
    session_id: str,
    current_user: dict,
    page: int = 1,
    page_size: int = 50,
    verified: Optional[bool] = None,
    *,
    db_override=None,
):
    """Get count lines with pagination. Shared between routes and tests."""
    skip = (page - 1) * page_size
    filter_query: Dict[str, Any] = {"session_id": session_id}

    if verified is not None:
        filter_query["verified"] = verified

    db_client = _get_db_client(db_override)
    total = await db_client.count_lines.count_documents(filter_query)
    lines_cursor = (
        db_client.count_lines.find(filter_query, {"_id": 0})
        .sort("counted_at", -1)
        .skip(skip)
        .limit(page_size)
    )
    lines = await lines_cursor.to_list(page_size)

    return {
        "items": lines,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": skip + page_size < total,
            "has_prev": page > 1,
        },
    }


@router.put("/count-lines/{line_id}/approve")
async def approve_count_line(
    line_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Approve a count line variance."""
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db = _get_db_client()

    try:
        result = await db.count_lines.update_one(
            {"_id": ObjectId(line_id)},
            {
                "$set": {
                    "status": "APPROVED",
                    "approval_status": "approved",
                    "approved_by": current_user["username"],
                    "approved_at": datetime.utcnow(),
                    "verified": True,
                    "verified_by": current_user["username"],
                    "verified_at": datetime.utcnow(),
                }
            },
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Count line not found")

        return {"success": True, "message": "Count line approved"}
    except Exception as e:
        logger.error(f"Error approving count line {line_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/count-lines/{line_id}/reject")
async def reject_count_line(
    line_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Reject a count line (request recount)."""
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    db = _get_db_client()

    try:
        result = await db.count_lines.update_one(
            {"_id": ObjectId(line_id)},
            {
                "$set": {
                    "status": "REJECTED",
                    "approval_status": "rejected",
                    "rejected_by": current_user["username"],
                    "rejected_at": datetime.utcnow(),
                    "verified": False,
                }
            },
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Count line not found")

        return {"success": True, "message": "Count line rejected"}
    except Exception as e:
        logger.error(f"Error rejecting count line {line_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/count-lines/check/{session_id}/{item_code}")
async def check_item_counted(
    session_id: str,
    item_code: str,
    current_user: dict = Depends(get_current_user),
):
    """Check if an item has already been counted in the session"""
    db = _get_db_client()
    try:
        # Find all count lines for this item in this session
        cursor = db.count_lines.find({"session_id": session_id, "item_code": item_code})
        count_lines = await cursor.to_list(length=None)

        # Convert ObjectId to string
        for line in count_lines:
            line["_id"] = str(line["_id"])

        return {"already_counted": len(count_lines) > 0, "count_lines": count_lines}
    except Exception as e:
        logger.error(f"Error checking item count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/count-lines/session/{session_id}")
async def get_count_lines_route(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    verified: Optional[bool] = Query(None, description="Filter by verification status"),
):
    return await get_count_lines(
        session_id,
        current_user,
        page=page,
        page_size=page_size,
        verified=verified,
    )
