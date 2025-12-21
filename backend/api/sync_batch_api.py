"""
Batch Sync API - High-performance batch synchronization
Handles offline queue sync with conflict detection and retry logic
and preserves backward compatibility with legacy offline payloads.
"""

import logging
import time
import uuid
from copy import deepcopy
from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from backend.api.schemas import Session
from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.middleware.security import batch_rate_limiter
from backend.services.circuit_breaker import get_circuit_breaker
from backend.services.lock_manager import LockManager, get_lock_manager
from backend.services.redis_service import get_redis
from backend.services.sync_conflicts_service import SyncConflictsService

logger = logging.getLogger(__name__)


class LegacySyncOperation(BaseModel):
    """Legacy offline queue operation structure"""

    id: str
    type: str
    data: dict[str, Any]
    timestamp: Optional[str] = None

    model_config = ConfigDict(extra="allow")


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
    serial_numbers: list[str] = Field(
        default_factory=list, description="Serial numbers"
    )
    mfg_date: Optional[str] = Field(None, description="Manufacturing date")
    mrp: Optional[float] = Field(None, description="MRP")
    uom: Optional[str] = Field(None, description="Unit of measure")
    category: Optional[str] = Field(None, description="Category")
    subcategory: Optional[str] = Field(None, description="Subcategory")
    item_condition: Optional[str] = Field(None, description="Item condition")
    evidence_photos: list[str] = Field(default_factory=list, description="Photo URLs")
    status: str = Field("finalized", description="Record status (partial/finalized)")
    created_at: str = Field(..., description="Client creation timestamp")
    updated_at: str = Field(..., description="Client update timestamp")


class BatchSyncRequest(BaseModel):
    """Batch sync request supporting modern records and legacy operations"""

    records: list[SyncRecord] = Field(
        default_factory=list, description="Structured records to sync"
    )
    operations: list[LegacySyncOperation] = Field(
        default_factory=list,
        description="Legacy operations array used by earlier clients",
    )
    batch_id: Optional[str] = Field(None, description="Client batch ID for tracking")

    model_config = ConfigDict(extra="ignore")


class SyncConflict(BaseModel):
    """Sync conflict details"""

    client_record_id: str
    conflict_type: str  # duplicate_serial, invalid_data, lock_conflict, etc.
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class SyncError(BaseModel):
    """Sync error details"""

    client_record_id: str
    error_type: str
    message: str


class SyncResult(BaseModel):
    """Per-record sync result for backward compatibility"""

    id: str = Field(..., description="Client record identifier")
    success: bool = Field(..., description="Whether the record synced successfully")
    message: Optional[str] = Field(
        None, description="Optional error or conflict message for the record"
    )


class BatchSyncResponse(BaseModel):
    """Batch sync response"""

    ok: list[str] = Field(
        default_factory=list, description="Successfully synced record IDs"
    )
    conflicts: list[SyncConflict] = Field(
        default_factory=list, description="Records with conflicts"
    )
    errors: list[SyncError] = Field(default_factory=list, description="Failed records")
    batch_id: Optional[str] = Field(None, description="Batch ID from request")
    processing_time_ms: float = Field(..., description="Server processing time")
    total_records: int = Field(..., description="Total records in batch")
    results: list[SyncResult] = Field(
        default_factory=list,
        description="Backward compatible per-record results (id/success/message)",
    )
    processed_count: Optional[int] = Field(
        None, description="Legacy summary: total operations processed"
    )
    success_count: Optional[int] = Field(
        None, description="Legacy summary: successful operations"
    )
    failed_count: Optional[int] = Field(
        None, description="Legacy summary: failed operations"
    )


# Sync Logic


async def validate_record(
    record: SyncRecord,
    db,
    lock_manager: LockManager,
    sync_service: SyncConflictsService = None,
    user_id: Optional[str] = None,
) -> SyncConflict:
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


async def sync_single_record(
    record: SyncRecord, db, user_id: str
) -> tuple[bool, Optional[str]]:
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
    current_user: dict[str, Any] = Depends(get_current_user),
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

    # Legacy payloads only provided an operations array
    if not request.records and request.operations:
        return await _process_legacy_operations(
            operations=request.operations,
            batch_id=request.batch_id,
            current_user=current_user,
            start_time=start_time,
        )

    if not request.records:
        raise HTTPException(
            status_code=400,
            detail="No records provided for batch sync",
        )

    # Get database
    from backend.server import db

    # Get lock manager
    lock_manager = get_lock_manager(redis_service)

    # Get circuit breaker
    from backend.services.circuit_breaker import CircuitBreakerConfig

    circuit_breaker = await get_circuit_breaker(
        "batch_sync",
        config=CircuitBreakerConfig(
            failure_threshold=5,
            success_threshold=3,
            timeout_seconds=30,
            half_open_max_calls=2,
        ),
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
                success, error_msg = await sync_single_record(
                    record, db, current_user["username"]
                )

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

    # Build per-record results for legacy clients that expect flat success flags
    results = [SyncResult(id=record_id, success=True) for record_id in ok_records]

    results.extend(
        SyncResult(
            id=conflict.client_record_id, success=False, message=conflict.message
        )
        for conflict in conflicts
    )

    results.extend(
        SyncResult(id=error.client_record_id, success=False, message=error.message)
        for error in errors
    )

    return BatchSyncResponse(
        ok=ok_records,
        conflicts=conflicts,
        errors=errors,
        batch_id=request.batch_id,
        processing_time_ms=processing_time,
        total_records=len(request.records),
        results=results,
        processed_count=len(request.records),
        success_count=len(ok_records),
        failed_count=len(request.records) - len(ok_records),
    )


@router.post("/heartbeat")
async def session_heartbeat(
    session_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    redis_service=Depends(get_redis),
    rack_id: Optional[str] = None,
) -> dict[str, Any]:
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


async def _process_legacy_operations(
    operations: list[LegacySyncOperation],
    batch_id: Optional[str],
    current_user: dict[str, Any],
    start_time: float,
) -> BatchSyncResponse:
    """Handle legacy offline queue operations payloads."""

    from backend.server import db

    id_mapping: dict[str, str] = {}
    results: list[SyncResult] = []
    ok_ids: list[str] = []
    error_entries: list[SyncError] = []

    # Sort by timestamp to maintain original order when provided
    ordered_ops = sorted(
        operations,
        key=lambda op: op.timestamp or "",
    )

    for op in ordered_ops:
        success = False
        message: Optional[str] = None

        try:
            if op.type == "session":
                session_data = deepcopy(op.data)
                warehouse = (session_data.get("warehouse") or "").strip()
                if not warehouse:
                    raise ValueError("Missing warehouse for session operation")

                staff_user = current_user.get("username", "unknown_user")
                staff_name = current_user.get("full_name") or staff_user

                raw_type = session_data.get("type")
                normalized_type = (
                    raw_type.strip().upper()
                    if isinstance(raw_type, str)
                    else "STANDARD"
                )
                if normalized_type not in {"STANDARD", "BLIND", "STRICT"}:
                    normalized_type = "STANDARD"

                session = Session(
                    warehouse=warehouse,
                    staff_user=staff_user,
                    staff_name=staff_name,
                    status=session_data.get("status", "OPEN"),
                    type=normalized_type,
                )

                session_doc = session.model_dump()
                offline_id = session_data.get("session_id") or session_data.get("id")
                if offline_id:
                    session_doc["offline_id"] = offline_id
                    id_mapping[str(offline_id)] = session.id

                session_doc.update(
                    {
                        "created_offline": True,
                        "synced_at": datetime.utcnow(),
                    }
                )

                await db.sessions.insert_one(session_doc)

                success = True
                message = "Session synced"

            elif op.type == "count_line":
                line_data = deepcopy(op.data)
                temp_session_id = line_data.get("session_id")
                if temp_session_id is not None:
                    lookup_key = str(temp_session_id)
                    if lookup_key in id_mapping:
                        line_data["session_id"] = id_mapping[lookup_key]

                line_data.setdefault("counted_by", current_user.get("username"))
                line_data.setdefault("counted_at", datetime.utcnow())
                line_data.setdefault("synced_at", datetime.utcnow())

                await db.count_lines.insert_one(line_data)

                success = True
                message = "Count line synced"

            elif op.type == "unknown_item":
                item_data = deepcopy(op.data)
                temp_session_id = item_data.get("session_id")
                if temp_session_id is not None:
                    lookup_key = str(temp_session_id)
                    if lookup_key in id_mapping:
                        item_data["session_id"] = id_mapping[lookup_key]

                item_data.setdefault("reported_by", current_user.get("username"))
                item_data.setdefault("reported_at", datetime.utcnow())
                item_data.setdefault("synced_at", datetime.utcnow())

                await db.unknown_items.insert_one(item_data)

                success = True
                message = "Unknown item synced"

            else:
                message = f"Unknown operation type: {op.type}"

        except (
            Exception
        ) as exc:  # Broad catch to ensure legacy payloads never crash sync
            logger.error(f"Legacy sync operation failed ({op.id}): {exc}")
            message = str(exc)

        result = SyncResult(id=op.id, success=success, message=message)
        results.append(result)

        if success:
            ok_ids.append(op.id)
        else:
            error_entries.append(
                SyncError(
                    client_record_id=op.id,
                    error_type="legacy_sync_error",
                    message=message or "Unknown legacy sync error",
                )
            )

    processing_time = (time.time() - start_time) * 1000

    return BatchSyncResponse(
        ok=ok_ids,
        conflicts=[],
        errors=error_entries,
        batch_id=batch_id,
        processing_time_ms=processing_time,
        total_records=len(operations),
        results=results,
        processed_count=len(operations),
        success_count=len(ok_ids),
        failed_count=len(operations) - len(ok_ids),
    )
