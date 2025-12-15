"""
Batch Sync API - High-performance batch synchronization
Handles offline queue sync with conflict detection and retry logic
"""

import logging
import time
import uuid
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.middleware.security import batch_rate_limiter
from backend.services.circuit_breaker import get_circuit_breaker
from backend.services.lock_manager import LockManager, get_lock_manager
from backend.services.redis_service import get_redis
from backend.services.sync_conflicts_service import SyncConflictsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sync", tags=["Sync"])


# Request/Response Models


class SyncRecord(BaseModel):
    """Single record to sync"""

    client_record_id: str = Field(..., description="Unique client-side record ID")
    session_id: str = Field(..., description="Session ID")
    rack_id: Optional[str] = Field(None, description="Rack ID")
    floor: Optional[str] = Field(None, description="Floor")
    item_code: str = Field(..., description="Item code")
    verified_qty: float = Field(..., description="Verified quantity")
    damage_qty: float = Field(0, description="Damage quantity")
    serial_numbers: List[str] = Field(default_factory=list, description="Serial numbers")
    mfg_date: Optional[str] = Field(None, description="Manufacturing date")
    mrp: Optional[float] = Field(None, description="MRP")
    uom: Optional[str] = Field(None, description="Unit of measure")
    category: Optional[str] = Field(None, description="Category")
    subcategory: Optional[str] = Field(None, description="Subcategory")
    item_condition: Optional[str] = Field(None, description="Item condition")
    evidence_photos: List[str] = Field(default_factory=list, description="Photo URLs")
    status: str = Field("finalized", description="Record status (partial/finalized)")
    created_at: str = Field(..., description="Client creation timestamp")
    updated_at: str = Field(..., description="Client update timestamp")


class BatchSyncRequest(BaseModel):
    """Batch sync request"""

    records: List[SyncRecord] = Field(..., description="Records to sync")
    batch_id: Optional[str] = Field(None, description="Client batch ID for tracking")


class SyncConflict(BaseModel):
    """Sync conflict details"""

    client_record_id: str
    conflict_type: str  # duplicate_serial, invalid_data, lock_conflict, etc.
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class SyncError(BaseModel):
    """Sync error details"""

    client_record_id: str
    error_type: str
    message: str


class BatchSyncResponse(BaseModel):
    """Batch sync response"""

    ok: List[str] = Field(default_factory=list, description="Successfully synced record IDs")
    conflicts: List[SyncConflict] = Field(
        default_factory=list, description="Records with conflicts"
    )
    errors: List[SyncError] = Field(default_factory=list, description="Failed records")
    batch_id: Optional[str] = Field(None, description="Batch ID from request")
    processing_time_ms: float = Field(..., description="Server processing time")
    total_records: int = Field(..., description="Total records in batch")


# Sync Logic


async def validate_record(
    record: SyncRecord,
    db,
    lock_manager: LockManager,
    sync_service: Optional[SyncConflictsService] = None,
    user_id: Optional[str] = None,
) -> Optional[SyncConflict]:
    """
    Validate a single record before syncing

    Returns:
        SyncConflict if validation fails, None if valid
    """
    # Check for duplicate serial numbers
    if record.serial_numbers:
        for serial in record.serial_numbers:
            existing = await db.item_serials.find_one({"serial_number": serial})
            if existing and existing.get("client_record_id") != record.client_record_id:
                conflict_id = None
                if sync_service and user_id:
                    # Convert ObjectIds in existing to strings for comparison
                    server_data = {
                        k: str(v) if isinstance(v, (ObjectId, uuid.UUID)) else v
                        for k, v in existing.items()
                        if k != "_id"
                    }

                    conflict_id = await sync_service.detect_conflict(
                        entity_type="item_serial",
                        entity_id=str(existing.get("_id")),
                        local_data=record.dict(),
                        server_data=server_data,
                        user=user_id,
                        session_id=record.session_id,
                    )

                return SyncConflict(
                    client_record_id=record.client_record_id,
                    conflict_type="duplicate_serial",
                    message=f"Serial number '{serial}' already exists",
                    details={
                        "serial": serial,
                        "existing_record": str(existing.get("_id")),
                        "conflict_id": conflict_id,
                    },
                )

    # Validate damage qty <= verified qty
    if record.damage_qty > record.verified_qty:
        return SyncConflict(
            client_record_id=record.client_record_id,
            conflict_type="invalid_quantity",
            message="Damage quantity cannot exceed verified quantity",
            details={
                "verified_qty": record.verified_qty,
                "damage_qty": record.damage_qty,
            },
        )

    # Check rack lock (if rack_id provided)
    if record.rack_id:
        owner = await lock_manager.get_rack_lock_owner(record.rack_id)
        if owner and owner != record.session_id:
            return SyncConflict(
                client_record_id=record.client_record_id,
                conflict_type="rack_locked",
                message=f"Rack {record.rack_id} is locked by another session",
                details={"rack_id": record.rack_id, "owner": owner},
            )

    return None


async def sync_single_record(record: SyncRecord, db, user_id: str) -> tuple[bool, Optional[str]]:
    """
    Sync a single record to database

    Returns:
        (success: bool, error_message: Optional[str])
    """
    try:
        # Prepare document
        doc = {
            "client_record_id": record.client_record_id,
            "session_id": record.session_id,
            "rack_id": record.rack_id,
            "floor": record.floor,
            "item_code": record.item_code,
            "verified_qty": record.verified_qty,
            "damage_qty": record.damage_qty,
            "serial_numbers": record.serial_numbers,
            "mfg_date": record.mfg_date,
            "mrp": record.mrp,
            "uom": record.uom,
            "category": record.category,
            "subcategory": record.subcategory,
            "item_condition": record.item_condition,
            "evidence_photos": record.evidence_photos,
            "status": record.status,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
            "sync_status": "synced",
            "synced_by": user_id,
            "synced_at": time.time(),
        }

        # Upsert record
        await db.verification_records.update_one(
            {"client_record_id": record.client_record_id}, {"$set": doc}, upsert=True
        )

        # Insert serial numbers
        if record.serial_numbers:
            serial_docs = [
                {
                    "serial_number": serial,
                    "item_code": record.item_code,
                    "session_id": record.session_id,
                    "rack_id": record.rack_id,
                    "client_record_id": record.client_record_id,
                    "created_at": time.time(),
                }
                for serial in record.serial_numbers
            ]

            # Insert with ignore duplicates
            try:
                await db.item_serials.insert_many(serial_docs, ordered=False)
            except Exception as e:
                # Ignore duplicate key errors
                if "duplicate key" not in str(e).lower():
                    raise

        return True, None

    except Exception as e:
        logger.error(f"Error syncing record {record.client_record_id}: {str(e)}")
        return False, str(e)


@router.post("/batch", response_model=BatchSyncResponse)
async def sync_batch(
    request: BatchSyncRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    redis_service=Depends(get_redis),
) -> BatchSyncResponse:
    """
    Batch sync endpoint - sync multiple records in one request

    Features:
    - Rate limiting: 10 requests per minute per user
    - Validates all records before syncing
    - Detects conflicts (duplicate serials, invalid data, etc.)
    - Uses circuit breaker for resilience
    - Returns detailed success/conflict/error breakdown
    """
    start_time = time.time()

    # Rate limiting check
    user_id = current_user.get("username", str(current_user.get("_id", "unknown")))
    is_allowed, rate_info = batch_rate_limiter.is_allowed(user_id)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Rate limit exceeded for batch sync",
                "retry_after": rate_info.get("retry_after", 60),
                "limit": rate_info.get("limit", 10),
            },
            headers={"Retry-After": str(rate_info.get("retry_after", 60))},
        )

    # Get database
    from backend.server import db

    # Get lock manager
    lock_manager = get_lock_manager(redis_service)

    # Get circuit breaker
    circuit_breaker = get_circuit_breaker(
        "batch_sync",
        failure_threshold=5,
        success_threshold=3,
        timeout=30,
        half_open_max_calls=2,
    )

    # Initialize Sync Service
    sync_service = SyncConflictsService(db) if db else None

    # Check circuit breaker
    if not await circuit_breaker.acquire():
        raise HTTPException(
            status_code=503,
            detail="Sync service temporarily unavailable. Please try again later.",
        )

    ok_records = []
    conflicts = []
    errors = []

    try:
        # Validate all records first
        for record in request.records:
            conflict = await validate_record(
                record, db, lock_manager, sync_service, current_user["username"]
            )
            if conflict:
                conflicts.append(conflict)
            else:
                # Sync valid record
                success, error_msg = await sync_single_record(record, db, current_user["username"])

                if success:
                    ok_records.append(record.client_record_id)
                else:
                    errors.append(
                        SyncError(
                            client_record_id=record.client_record_id,
                            error_type="sync_error",
                            message=error_msg or "Unknown error",
                        )
                    )

        # Record success in circuit breaker
        await circuit_breaker.record_success()

    except Exception as e:
        # Record failure in circuit breaker
        await circuit_breaker.record_failure()
        logger.error(f"Batch sync failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch sync failed: {str(e)}")

    processing_time = (time.time() - start_time) * 1000

    logger.info(
        f"Batch sync completed: {len(ok_records)} ok, "
        f"{len(conflicts)} conflicts, {len(errors)} errors "
        f"({processing_time:.2f}ms)"
    )

    return BatchSyncResponse(
        ok=ok_records,
        conflicts=conflicts,
        errors=errors,
        batch_id=request.batch_id,
        processing_time_ms=processing_time,
        total_records=len(request.records),
    )


@router.post("/heartbeat")
async def session_heartbeat(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    redis_service=Depends(get_redis),
    rack_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Session heartbeat - maintain rack lock and user presence

    Should be called every 20-30 seconds by active clients
    """
    lock_manager = get_lock_manager(redis_service)
    user_id = current_user["username"]

    # Update user heartbeat
    await lock_manager.update_user_heartbeat(user_id, ttl=90)

    # Renew rack lock if provided
    rack_renewed = False
    if rack_id:
        rack_renewed = await lock_manager.renew_rack_lock(rack_id, session_id, ttl=60)

    return {
        "success": True,
        "session_id": session_id,
        "user_id": user_id,
        "rack_renewed": rack_renewed,
        "timestamp": time.time(),
    }
