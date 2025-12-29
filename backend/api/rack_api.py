"""
Rack Management API - Rack claiming, releasing, and status management
Supports multi-user concurrency with Redis-based locking
"""

import logging
import time
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.services.lock_manager import get_lock_manager
from backend.services.pubsub_service import get_pubsub_service
from backend.services.redis_service import get_redis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/racks", tags=["Rack Management"])


# Models


class RackStatus(BaseModel):
    """Rack status information"""

    rack_id: str
    floor: str
    status: str  # available, claimed, active, paused, completed
    claimed_by: Optional[str] = None
    session_id: Optional[str] = None
    lock_expires_at: Optional[float] = None
    updated_at: float


class RackClaimRequest(BaseModel):
    """Rack claim request"""

    floor: str = Field(..., description="Floor where rack is located")


class RackClaimResponse(BaseModel):
    """Rack claim response"""

    success: bool
    rack_id: str
    session_id: str
    floor: str
    lock_ttl: int
    message: str


class RackReleaseResponse(BaseModel):
    """Rack release response"""

    success: bool
    rack_id: str
    message: str


class AvailableRack(BaseModel):
    """Available rack information"""

    rack_id: str
    floor: str
    status: str
    item_count: int = 0  # Estimated items in rack


# Helper Functions


async def get_or_create_rack(db, rack_id: str, floor: str) -> dict:
    """Get rack from registry or create if doesn't exist"""
    rack = await db.rack_registry.find_one({"rack_id": rack_id})

    if not rack:
        # Create new rack
        rack = {
            "rack_id": rack_id,
            "floor": floor,
            "status": "available",
            "claimed_by": None,
            "session_id": None,
            "lock_expires_at": None,
            "created_at": time.time(),
            "updated_at": time.time(),
        }
        await db.rack_registry.insert_one(rack)
        logger.info(f"Created new rack: {rack_id} on {floor}")

    return rack


async def update_rack_status(
    db,
    rack_id: str,
    status: str,
    claimed_by: Optional[str] = None,
    session_id: Optional[str] = None,
    lock_expires_at: Optional[float] = None,
) -> None:
    """Update rack status in database"""
    update_data = {
        "status": status,
        "claimed_by": claimed_by,
        "session_id": session_id,
        "lock_expires_at": lock_expires_at,
        "updated_at": time.time(),
    }

    await db.rack_registry.update_one({"rack_id": rack_id}, {"$set": update_data})


# Endpoints


@router.get("/available", response_model=list[AvailableRack])
async def get_available_racks(
    floor: Optional[str] = Query(None, description="Filter by floor"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[AvailableRack]:
    """
    Get list of available racks

    Filters:
    - floor: Optional floor filter
    - status: Only returns available or paused racks
    """
    from backend.server import db

    # Build query
    query: dict[str, Any] = {"status": {"$in": ["available", "paused"]}}
    if floor:
        query["floor"] = floor

    # Get racks
    racks_cursor = db.rack_registry.find(query).sort("rack_id", 1)
    racks = await racks_cursor.to_list(length=1000)

    # Get item counts (estimated from ERP items)
    result = []
    for rack in racks:
        # Count items in this rack
        item_count = await db.erp_items.count_documents(
            {"rack": rack["rack_id"], "floor": rack["floor"]}
        )

        result.append(
            AvailableRack(
                rack_id=rack["rack_id"],
                floor=rack["floor"],
                status=rack["status"],
                item_count=item_count,
            )
        )

    logger.info(f"Found {len(result)} available racks (floor={floor})")
    return result


@router.get("/floors", response_model=list[str])
async def get_floors(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[str]:
    """Get list of all floors with racks"""
    from backend.server import db

    # Get distinct floors from rack registry
    floors = await db.rack_registry.distinct("floor")

    # If no racks yet, return default floors
    if not floors:
        floors = [
            "Ground",
            "First",
            "Second",
            "Upper Godown",
            "Back Godown",
            "Damage Area",
        ]

    return sorted(floors)


@router.post("/{rack_id}/claim", response_model=RackClaimResponse)
async def claim_rack(
    rack_id: str,
    request: RackClaimRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    redis_service=Depends(get_redis),
    pubsub_service=Depends(get_pubsub_service),
) -> RackClaimResponse:
    """
    Claim a rack for exclusive use

    Process:
    1. Check if rack is available
    2. Acquire Redis lock
    3. Create session
    4. Update rack status
    5. Broadcast update
    """
    from backend.server import db

    user_id = current_user["username"]
    lock_manager = get_lock_manager(redis_service)

    # Get or create rack
    rack = await get_or_create_rack(db, rack_id, request.floor)

    # Check if rack is available
    if rack["status"] not in ["available", "paused"]:
        raise HTTPException(
            status_code=409,
            detail=f"Rack {rack_id} is not available (status: {rack['status']})",
        )

    # Try to acquire lock
    lock_ttl = 60
    acquired = await lock_manager.acquire_rack_lock(rack_id, user_id, ttl=lock_ttl)

    if not acquired:
        current_owner = await lock_manager.get_rack_lock_owner(rack_id)
        raise HTTPException(
            status_code=409,
            detail=f"Rack {rack_id} is locked by {current_owner}",
        )

    try:
        # Create session
        session_id = f"session_{user_id}_{rack_id}_{int(time.time())}"

        session_doc = {
            "session_id": session_id,
            "user_id": user_id,
            "rack_id": rack_id,
            "floor": request.floor,
            "status": "active",
            "started_at": time.time(),
            "last_heartbeat": time.time(),
            "completed_at": None,
        }

        await db.verification_sessions.insert_one(session_doc)

        # Create session lock in Redis
        await lock_manager.create_session_lock(session_id, user_id, rack_id, ttl=3600)

        # Update rack status
        lock_expires_at = time.time() + lock_ttl
        await update_rack_status(
            db,
            rack_id,
            status="active",
            claimed_by=user_id,
            session_id=session_id,
            lock_expires_at=lock_expires_at,
        )

        # Broadcast rack update
        await pubsub_service.publish_rack_update(
            rack_id,
            "claimed",
            {
                "user_id": user_id,
                "session_id": session_id,
                "floor": request.floor,
            },
        )

        logger.info(f"✓ Rack {rack_id} claimed by {user_id} (session: {session_id})")

        return RackClaimResponse(
            success=True,
            rack_id=rack_id,
            session_id=session_id,
            floor=request.floor,
            lock_ttl=lock_ttl,
            message=f"Rack {rack_id} claimed successfully",
        )

    except Exception as e:
        # Release lock on error
        await lock_manager.release_rack_lock(rack_id, user_id)
        logger.error(f"Error claiming rack {rack_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to claim rack: {str(e)}")


@router.post("/{rack_id}/release", response_model=RackReleaseResponse)
async def release_rack(
    rack_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    redis_service=Depends(get_redis),
    pubsub_service=Depends(get_pubsub_service),
) -> RackReleaseResponse:
    """
    Release rack lock

    Process:
    1. Verify ownership
    2. Release Redis lock
    3. Update rack status
    4. Update session status
    5. Broadcast update
    """
    from backend.server import db

    user_id = current_user["username"]
    lock_manager = get_lock_manager(redis_service)

    # Get rack
    rack = await db.rack_registry.find_one({"rack_id": rack_id})
    if not rack:
        raise HTTPException(status_code=404, detail=f"Rack {rack_id} not found")

    # Verify ownership
    if rack["claimed_by"] != user_id:
        raise HTTPException(
            status_code=403,
            detail=f"Rack {rack_id} is not claimed by you",
        )

    # Release lock
    released = await lock_manager.release_rack_lock(rack_id, user_id)

    if not released:
        logger.warning(f"Failed to release Redis lock for rack {rack_id}")

    # Update rack status
    await update_rack_status(db, rack_id, status="available")

    # Update session status
    if rack["session_id"]:
        await db.verification_sessions.update_one(
            {"session_id": rack["session_id"]},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": time.time(),
                }
            },
        )

    # Broadcast update
    await pubsub_service.publish_rack_update(rack_id, "released", {"user_id": user_id})

    logger.info(f"✓ Rack {rack_id} released by {user_id}")

    return RackReleaseResponse(
        success=True, rack_id=rack_id, message=f"Rack {rack_id} released successfully"
    )


@router.post("/{rack_id}/pause")
async def pause_rack(
    rack_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    pubsub_service=Depends(get_pubsub_service),
) -> dict[str, Any]:
    """
    Pause work on rack (keep lock)
    """
    from backend.server import db

    user_id = current_user["username"]

    # Get rack
    rack = await db.rack_registry.find_one({"rack_id": rack_id})
    if not rack:
        raise HTTPException(status_code=404, detail=f"Rack {rack_id} not found")

    # Verify ownership
    if rack["claimed_by"] != user_id:
        raise HTTPException(
            status_code=403, detail=f"Rack {rack_id} is not claimed by you"
        )

    # Update status
    await update_rack_status(
        db,
        rack_id,
        status="paused",
        claimed_by=rack["claimed_by"],
        session_id=rack["session_id"],
        lock_expires_at=rack["lock_expires_at"],
    )

    # Update session
    if rack["session_id"]:
        await db.verification_sessions.update_one(
            {"session_id": rack["session_id"]}, {"$set": {"status": "paused"}}
        )

    # Broadcast update
    await pubsub_service.publish_rack_update(rack_id, "paused", {"user_id": user_id})

    logger.info(f"Rack {rack_id} paused by {user_id}")

    return {"success": True, "rack_id": rack_id, "status": "paused"}


@router.post("/{rack_id}/resume")
async def resume_rack(
    rack_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    pubsub_service=Depends(get_pubsub_service),
) -> dict[str, Any]:
    """
    Resume work on paused rack
    """
    from backend.server import db

    user_id = current_user["username"]

    # Get rack
    rack = await db.rack_registry.find_one({"rack_id": rack_id})
    if not rack:
        raise HTTPException(status_code=404, detail=f"Rack {rack_id} not found")

    # Verify ownership
    if rack["claimed_by"] != user_id:
        raise HTTPException(
            status_code=403, detail=f"Rack {rack_id} is not claimed by you"
        )

    # Verify paused
    if rack["status"] != "paused":
        raise HTTPException(
            status_code=400,
            detail=f"Rack {rack_id} is not paused (status: {rack['status']})",
        )

    # Update status
    await update_rack_status(
        db,
        rack_id,
        status="active",
        claimed_by=rack["claimed_by"],
        session_id=rack["session_id"],
        lock_expires_at=rack["lock_expires_at"],
    )

    # Update session
    if rack["session_id"]:
        await db.verification_sessions.update_one(
            {"session_id": rack["session_id"]},
            {
                "$set": {
                    "status": "active",
                    "last_heartbeat": time.time(),
                }
            },
        )

    # Broadcast update
    await pubsub_service.publish_rack_update(rack_id, "resumed", {"user_id": user_id})

    logger.info(f"Rack {rack_id} resumed by {user_id}")

    return {"success": True, "rack_id": rack_id, "status": "active"}


@router.get("/{rack_id}/status", response_model=RackStatus)
async def get_rack_status(
    rack_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> RackStatus:
    """Get current rack status"""
    from backend.server import db

    rack = await db.rack_registry.find_one({"rack_id": rack_id})
    if not rack:
        raise HTTPException(status_code=404, detail=f"Rack {rack_id} not found")

    return RackStatus(
        rack_id=rack["rack_id"],
        floor=rack["floor"],
        status=rack["status"],
        claimed_by=rack.get("claimed_by"),
        session_id=rack.get("session_id"),
        lock_expires_at=rack.get("lock_expires_at"),
        updated_at=rack["updated_at"],
    )


@router.get("/user/active")
async def get_user_active_racks(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[RackStatus]:
    """Get all racks claimed by current user"""
    from backend.server import db

    user_id = current_user["username"]

    racks_cursor = db.rack_registry.find(
        {"claimed_by": user_id, "status": {"$in": ["active", "paused"]}}
    )
    racks = await racks_cursor.to_list(length=100)

    return [
        RackStatus(
            rack_id=rack["rack_id"],
            floor=rack["floor"],
            status=rack["status"],
            claimed_by=rack.get("claimed_by"),
            session_id=rack.get("session_id"),
            lock_expires_at=rack.get("lock_expires_at"),
            updated_at=rack["updated_at"],
        )
        for rack in racks
    ]
