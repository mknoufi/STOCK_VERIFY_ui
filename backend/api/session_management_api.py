"""
Session Management API - Enhanced session tracking with heartbeat
Extends existing session API with rack-based workflow support
"""

import logging
import time
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend.api.response_models import PaginatedResponse
from backend.api.schemas import Session, SessionCreate
from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.services.lock_manager import get_lock_manager
from backend.services.redis_service import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["Session Management"])


# Models


class SessionDetail(BaseModel):
    """Detailed session information"""

    session_id: str
    user_id: str
    rack_id: Optional[str] = None
    floor: Optional[str] = None
    status: str  # active, paused, completed
    started_at: float
    last_heartbeat: float
    completed_at: Optional[float] = None
    item_count: int = 0
    verified_count: int = 0


class SessionStats(BaseModel):
    """Session statistics"""

    session_id: str
    total_items: int
    verified_items: int
    damage_items: int
    pending_items: int
    duration_seconds: float
    items_per_minute: float


class HeartbeatResponse(BaseModel):
    """Heartbeat response"""

    success: bool
    session_id: str
    rack_lock_renewed: bool
    user_presence_updated: bool
    lock_ttl_remaining: int
    message: str


# Endpoints


@router.get("/", response_model=PaginatedResponse[Session])
async def get_sessions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    user_id: Optional[str] = Query(None, description="Filter by user"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> PaginatedResponse[Session]:
    """
    Get all sessions with pagination
    """
    from backend.server import db

    # Build query
    query = {}
    if status:
        query["status"] = status

    if user_id:
        # Only supervisors can view other users' sessions
        if current_user["role"] != "supervisor" and user_id != current_user["username"]:
            raise HTTPException(status_code=403, detail="Access denied")
        query["staff_user"] = user_id
    elif current_user["role"] != "supervisor":
        # Regular users only see their own sessions
        query["staff_user"] = current_user["username"]

    # Get total count
    total = await db.sessions.count_documents(query)

    # Get paginated sessions
    skip = (page - 1) * page_size
    sessions_cursor = (
        db.sessions.find(query).sort("started_at", -1).skip(skip).limit(page_size)
    )
    sessions = await sessions_cursor.to_list(length=page_size)

    # DEBUG LOGGING
    logger.info(f"SESSION QUERY: {query}")
    logger.info(f"SESSIONS FOUND: {len(sessions)} (Total: {total})")
    # END DEBUG LOGGING

    # Convert to response models
    result = []
    for session in sessions:
        # Ensure all required fields are present
        # Handle _id if present (pydantic might ignore it if not in model, or we should remove it)
        if "_id" in session:
            del session["_id"]
        result.append(Session(**session))

    return PaginatedResponse.create(
        items=result,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=Session)
async def create_session(
    session_data: SessionCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Session:
    """Create a new session"""
    import uuid
    from datetime import datetime

    from backend.server import db

    # Input validation
    warehouse = session_data.warehouse.strip()
    if not warehouse:
        raise HTTPException(status_code=400, detail="Warehouse name cannot be empty")

    # Create Session object
    session = Session(
        id=str(uuid.uuid4()),
        warehouse=warehouse,
        staff_user=current_user["username"],
        staff_name=current_user.get("full_name", current_user["username"]),
        type=session_data.type or "STANDARD",
        status="OPEN",
        started_at=datetime.utcnow(),
    )

    # Insert into db.sessions
    await db.sessions.insert_one(session.model_dump())

    # Also create entry in verification_sessions for compatibility with new features
    verification_session = {
        "session_id": session.id,
        "user_id": current_user["username"],
        "status": "active",
        "started_at": time.time(),
        "last_heartbeat": time.time(),
        "rack_id": None,
        "floor": None,
    }
    await db.verification_sessions.insert_one(verification_session)

    return session


@router.get("/active", response_model=list[SessionDetail])
async def get_active_sessions(
    user_id: Optional[str] = Query(None, description="Filter by user"),
    rack_id: Optional[str] = Query(None, description="Filter by rack"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[SessionDetail]:
    """
    Get all active sessions

    Filters:
    - user_id: Filter by specific user
    - rack_id: Filter by specific rack
    """
    from backend.server import db

    # Build query
    query: dict[str, Any] = {"status": {"$in": ["active", "paused"]}}

    if user_id:
        # Only supervisors can view other users' sessions
        if current_user["role"] != "supervisor" and user_id != current_user["username"]:
            raise HTTPException(status_code=403, detail="Access denied")
        query["user_id"] = user_id

    if rack_id:
        query["rack_id"] = rack_id

    # Get sessions
    sessions_cursor = db.verification_sessions.find(query).sort("started_at", -1)
    sessions = await sessions_cursor.to_list(length=100)

    # Get item counts for each session
    result = []
    for session in sessions:
        # Count items in session
        item_count = await db.verification_records.count_documents(
            {"session_id": session["session_id"]}
        )

        verified_count = await db.verification_records.count_documents(
            {"session_id": session["session_id"], "status": "finalized"}
        )

        result.append(
            SessionDetail(
                session_id=session["session_id"],
                user_id=session["user_id"],
                rack_id=session.get("rack_id"),
                floor=session.get("floor"),
                status=session["status"],
                started_at=session["started_at"],
                last_heartbeat=session["last_heartbeat"],
                completed_at=session.get("completed_at"),
                item_count=item_count,
                verified_count=verified_count,
            )
        )

    return result


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session_detail(
    session_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SessionDetail:
    """Get detailed session information"""
    from backend.server import db

    session = await db.verification_sessions.find_one({"session_id": session_id})

    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # Check access
    if (
        current_user["role"] != "supervisor"
        and session["user_id"] != current_user["username"]
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get counts
    item_count = await db.verification_records.count_documents(
        {"session_id": session_id}
    )

    verified_count = await db.verification_records.count_documents(
        {"session_id": session_id, "status": "finalized"}
    )

    return SessionDetail(
        session_id=session["session_id"],
        user_id=session["user_id"],
        rack_id=session.get("rack_id"),
        floor=session.get("floor"),
        status=session["status"],
        started_at=session["started_at"],
        last_heartbeat=session["last_heartbeat"],
        completed_at=session.get("completed_at"),
        item_count=item_count,
        verified_count=verified_count,
    )


@router.get("/{session_id}/stats", response_model=SessionStats)
async def get_session_stats(
    session_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SessionStats:
    """Get session statistics"""
    from backend.server import db

    session = await db.verification_sessions.find_one({"session_id": session_id})

    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # Check access
    if (
        current_user["role"] != "supervisor"
        and session["user_id"] != current_user["username"]
    ):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get item statistics
    pipeline: list[dict[str, Any]] = [
        {"$match": {"session_id": session_id}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "verified": {
                    "$sum": {"$cond": [{"$eq": ["$status", "finalized"]}, 1, 0]}
                },
                "damage": {"$sum": "$damage_qty"},
            }
        },
    ]

    stats_result = await db.verification_records.aggregate(pipeline).to_list(1)

    if stats_result:
        stats = stats_result[0]
        total_items = stats.get("total", 0)
        verified_items = stats.get("verified", 0)
        damage_items = int(stats.get("damage", 0))
    else:
        total_items = verified_items = damage_items = 0

    pending_items = total_items - verified_items

    # Calculate duration and rate
    duration = time.time() - session["started_at"]
    items_per_minute = (verified_items / duration * 60) if duration > 0 else 0

    return SessionStats(
        session_id=session_id,
        total_items=total_items,
        verified_items=verified_items,
        damage_items=damage_items,
        pending_items=pending_items,
        duration_seconds=duration,
        items_per_minute=round(items_per_minute, 2),
    )


@router.post("/{session_id}/heartbeat", response_model=HeartbeatResponse)
async def session_heartbeat(
    session_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    redis_service=Depends(get_redis),
) -> HeartbeatResponse:
    """
    Session heartbeat - maintain locks and presence

    Should be called every 20-30 seconds by active clients

    Actions:
    1. Update user heartbeat in Redis
    2. Renew rack lock if session has rack
    3. Update session last_heartbeat in MongoDB
    """
    from backend.server import db

    user_id = current_user["username"]
    lock_manager = get_lock_manager(redis_service)

    # Get session
    session = await db.verification_sessions.find_one({"session_id": session_id})

    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # Verify ownership
    if session["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your session")

    # Update user heartbeat
    await lock_manager.update_user_heartbeat(user_id, ttl=90)

    # Renew rack lock if exists
    rack_lock_renewed = False
    lock_ttl_remaining = 0

    if session.get("rack_id"):
        rack_id = session["rack_id"]
        rack_lock_renewed = await lock_manager.renew_rack_lock(rack_id, user_id, ttl=60)

        if rack_lock_renewed:
            lock_ttl_remaining = await lock_manager.get_rack_lock_ttl(rack_id)

    # Update session last_heartbeat
    await db.verification_sessions.update_one(
        {"session_id": session_id}, {"$set": {"last_heartbeat": time.time()}}
    )

    logger.debug(
        f"Heartbeat: session={session_id}, user={user_id}, "
        f"rack_renewed={rack_lock_renewed}"
    )

    return HeartbeatResponse(
        success=True,
        session_id=session_id,
        rack_lock_renewed=rack_lock_renewed,
        user_presence_updated=True,
        lock_ttl_remaining=max(0, lock_ttl_remaining),
        message="Heartbeat received",
    )


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    redis_service=Depends(get_redis),
) -> dict[str, Any]:
    """
    Complete session and release rack
    """
    from backend.server import db

    user_id = current_user["username"]
    lock_manager = get_lock_manager(redis_service)

    # Get session
    session = await db.verification_sessions.find_one({"session_id": session_id})

    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # Verify ownership
    if session["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your session")

    # Release rack lock if exists
    if session.get("rack_id"):
        await lock_manager.release_rack_lock(session["rack_id"], user_id)

        # Update rack status
        await db.rack_registry.update_one(
            {"rack_id": session["rack_id"]},
            {
                "$set": {
                    "status": "completed",
                    "updated_at": time.time(),
                }
            },
        )

    # Update session
    await db.verification_sessions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": time.time(),
            }
        },
    )

    # Delete session lock from Redis
    await lock_manager.delete_session(session_id)

    logger.info(f"Session {session_id} completed by {user_id}")

    return {
        "success": True,
        "session_id": session_id,
        "status": "completed",
        "message": "Session completed successfully",
    }


@router.get("/user/history")
async def get_user_session_history(
    limit: int = Query(10, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[SessionDetail]:
    """Get user's session history (completed sessions)"""
    from backend.server import db

    user_id = current_user["username"]

    sessions_cursor = (
        db.verification_sessions.find({"user_id": user_id, "status": "completed"})
        .sort("completed_at", -1)
        .limit(limit)
    )

    sessions = await sessions_cursor.to_list(length=limit)

    result = []
    for session in sessions:
        item_count = await db.verification_records.count_documents(
            {"session_id": session["session_id"]}
        )

        verified_count = await db.verification_records.count_documents(
            {"session_id": session["session_id"], "status": "finalized"}
        )

        result.append(
            SessionDetail(
                session_id=session["session_id"],
                user_id=session["user_id"],
                rack_id=session.get("rack_id"),
                floor=session.get("floor"),
                status=session["status"],
                started_at=session["started_at"],
                last_heartbeat=session["last_heartbeat"],
                completed_at=session.get("completed_at"),
                item_count=item_count,
                verified_count=verified_count,
            )
        )

    return result
