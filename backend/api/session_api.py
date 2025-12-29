import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.api.schemas import Session, SessionCreate
from backend.auth.dependencies import get_current_user
from backend.services.activity_log import ActivityLogService

# Debug: uncomment to verify import
# print(f"DEBUG: session_api imported get_current_user: {get_current_user}")

logger = logging.getLogger(__name__)
router = APIRouter()

_db: Optional[AsyncIOMotorDatabase[Any]] = None
_activity_log_service: Optional[ActivityLogService] = None


def init_session_api(
    db: AsyncIOMotorDatabase, activity_log_service: ActivityLogService
):
    global _db, _activity_log_service
    _db = db
    _activity_log_service = activity_log_service


@router.post("/sessions", response_model=Session)
async def create_session(
    request: Request,
    session_data: SessionCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Session:
    if not _db or not _activity_log_service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Input validation and sanitization
    warehouse = session_data.warehouse.strip()
    if not warehouse:
        raise HTTPException(status_code=400, detail="Warehouse name cannot be empty")
    if len(warehouse) < 2:
        raise HTTPException(
            status_code=400, detail="Warehouse name must be at least 2 characters"
        )
    if len(warehouse) > 100:
        raise HTTPException(
            status_code=400, detail="Warehouse name must be less than 100 characters"
        )
    # Sanitize warehouse name (remove potentially dangerous characters)
    warehouse = (
        warehouse.replace("<", "").replace(">", "").replace('"', "").replace("'", "")
    )

    session = Session(
        warehouse=warehouse,
        staff_user=current_user["username"],
        staff_name=current_user["full_name"],
        type=session_data.type or "STANDARD",
    )
    await _db.sessions.insert_one(session.model_dump())

    # Log activity
    await _activity_log_service.log_activity(
        user=current_user["username"],
        role=current_user["role"],
        action="create_session",
        entity_type="session",
        entity_id=session.id,
        details={"warehouse": session_data.warehouse},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )

    return session


@router.get("/sessions", response_model=dict[str, Any])
async def get_sessions(
    current_user: dict[str, Any] = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict[str, Any]:
    """Get sessions with pagination"""
    if not _db:
        raise HTTPException(status_code=503, detail="Service not initialized")

    skip = (page - 1) * page_size

    if current_user["role"] == "supervisor":
        total = await _db.sessions.count_documents({})
        sessions_cursor = (
            _db.sessions.find().sort("started_at", -1).skip(skip).limit(page_size)
        )
    else:
        filter_query = {"staff_user": current_user["username"]}
        total = await _db.sessions.count_documents(filter_query)
        # Optimize query with projection and batch size
        projection = {"_id": 0}
        sessions_cursor = (
            _db.sessions.find(filter_query, projection)
            .sort("started_at", -1)
            .skip(skip)
            .limit(page_size)
        )
        sessions_cursor.batch_size(min(page_size, 100))

    sessions = await sessions_cursor.to_list(page_size)
    session_items = []
    for session in sessions:
        normalized = dict(session)
        normalized.pop("_id", None)
        session_items.append(Session(**normalized))

    total_pages = (total + page_size - 1) // page_size if total else 0
    has_next = (skip + len(session_items)) < total

    has_previous = page > 1

    legacy_pagination = {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_prev": has_previous,
    }

    return {
        "items": session_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_previous": has_previous,
        "pagination": legacy_pagination,
    }


# Bulk session operations
@router.post("/sessions/bulk/close")
async def bulk_close_sessions(
    session_ids: list[str], current_user: dict = Depends(get_current_user)
):
    """Bulk close sessions (supervisor only)"""
    if not _db or not _activity_log_service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        updated_count = 0
        errors = []

        for session_id in session_ids:
            try:
                result = await _db.sessions.update_one(
                    {"id": session_id},
                    {"$set": {"status": "CLOSED", "closed_at": datetime.utcnow()}},
                )
                if result.modified_count > 0:
                    updated_count += 1
                    # Log activity
                    await _activity_log_service.log_activity(
                        user=current_user["username"],
                        role=current_user["role"],
                        action="bulk_close_session",
                        entity_type="session",
                        entity_id=session_id,
                        details={"operation": "bulk_close"},
                        ip_address=None,
                        user_agent=None,
                    )
            except Exception as e:
                errors.append({"session_id": session_id, "error": str(e)})

        return {
            "success": True,
            "updated_count": updated_count,
            "total": len(session_ids),
            "errors": errors,
        }
    except Exception as e:
        logger.error(f"Bulk close sessions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/bulk/reconcile")
async def bulk_reconcile_sessions(
    session_ids: list[str], current_user: dict = Depends(get_current_user)
):
    """Bulk reconcile sessions (supervisor only)"""
    if not _db or not _activity_log_service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        updated_count = 0
        errors = []

        for session_id in session_ids:
            try:
                result = await _db.sessions.update_one(
                    {"id": session_id},
                    {
                        "$set": {
                            "status": "RECONCILE",
                            "reconciled_at": datetime.utcnow(),
                        }
                    },
                )
                if result.modified_count > 0:
                    updated_count += 1
                    # Log activity
                    await _activity_log_service.log_activity(
                        user=current_user["username"],
                        role=current_user["role"],
                        action="bulk_reconcile_session",
                        entity_type="session",
                        entity_id=session_id,
                        details={"operation": "bulk_reconcile"},
                        ip_address=None,
                        user_agent=None,
                    )
            except Exception as e:
                errors.append({"session_id": session_id, "error": str(e)})

        return {
            "success": True,
            "updated_count": updated_count,
            "total": len(session_ids),
            "errors": errors,
        }
    except Exception as e:
        logger.error(f"Bulk reconcile sessions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions/bulk/export")
async def bulk_export_sessions(
    session_ids: list[str],
    format: str = "excel",
    current_user: dict = Depends(get_current_user),
):
    """Bulk export sessions (supervisor only)"""
    if not _db or not _activity_log_service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        sessions = []
        for session_id in session_ids:
            session = await _db.sessions.find_one({"id": session_id})
            if session:
                sessions.append(session)

        # Log activity
        await _activity_log_service.log_activity(
            user=current_user["username"],
            role=current_user["role"],
            action="bulk_export_sessions",
            entity_type="session",
            entity_id=None,
            details={
                "operation": "bulk_export",
                "count": len(sessions),
                "format": format,
            },
            ip_address=None,
            user_agent=None,
        )

        return {
            "success": True,
            "exported_count": len(sessions),
            "total": len(session_ids),
            "data": sessions,
            "format": format,
        }
    except Exception as e:
        logger.error(f"Bulk export sessions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/analytics")
async def get_sessions_analytics(current_user: dict = Depends(get_current_user)):
    """Get aggregated session analytics (supervisor only)"""
    if not _db:
        raise HTTPException(status_code=503, detail="Service not initialized")

    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        # Aggregation pipeline for efficient server-side calculation
        pipeline: list[dict[str, Any]] = [
            {
                "$group": {
                    "_id": None,
                    "total_sessions": {"$sum": 1},
                    "total_items": {"$sum": "$total_items"},
                    "total_variance": {"$sum": "$total_variance"},
                    "avg_variance": {"$avg": "$total_variance"},
                    "sessions_by_status": {"$push": {"status": "$status", "count": 1}},
                }
            }
        ]

        # Sessions by date
        date_pipeline: list[dict[str, Any]] = [
            {
                "$project": {
                    "date": {"$substr": ["$started_at", 0, 10]},
                    "warehouse": 1,
                    "staff_name": 1,
                    "total_items": 1,
                    "total_variance": 1,
                }
            },
            {"$group": {"_id": "$date", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]

        # Variance by warehouse
        warehouse_pipeline: list[dict[str, Any]] = [
            {
                "$group": {
                    "_id": "$warehouse",
                    "total_variance": {"$sum": {"$abs": "$total_variance"}},
                    "session_count": {"$sum": 1},
                }
            }
        ]

        # Items by staff
        staff_pipeline: list[dict[str, Any]] = [
            {
                "$group": {
                    "_id": "$staff_name",
                    "total_items": {"$sum": "$total_items"},
                    "session_count": {"$sum": 1},
                }
            }
        ]

        # Execute aggregations
        overall = await _db.sessions.aggregate(pipeline).to_list(1)
        by_date = await _db.sessions.aggregate(date_pipeline).to_list(None)
        by_warehouse = await _db.sessions.aggregate(warehouse_pipeline).to_list(None)
        by_staff = await _db.sessions.aggregate(staff_pipeline).to_list(None)

        # Transform results
        sessions_by_date = {item["_id"]: item["count"] for item in by_date}
        variance_by_warehouse = {
            item["_id"]: item["total_variance"] for item in by_warehouse
        }
        items_by_staff = {item["_id"]: item["total_items"] for item in by_staff}

        return {
            "success": True,
            "data": {
                "overall": overall[0] if overall else {},
                "sessions_by_date": sessions_by_date,
                "variance_by_warehouse": variance_by_warehouse,
                "items_by_staff": items_by_staff,
                "total_sessions": overall[0]["total_sessions"] if overall else 0,
            },
        }
    except Exception as e:
        logger.error(f"Analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_session_by_id(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific session by ID"""
    if not _db:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        session = await _db.sessions.find_one({"id": session_id})

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Check permissions
        if (
            current_user["role"] != "supervisor"
            and session.get("staff_user") != current_user["username"]
        ):
            raise HTTPException(status_code=403, detail="Access denied")

        return Session(**session)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
