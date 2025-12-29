import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.auth.dependencies import get_current_user
from backend.db.runtime import get_db

logger = logging.getLogger(__name__)

# We might need to import logic functions if they are separated,
# otherwise we might need to duplicate some logic or refactor.
# For now, I will implement the batch processor to handle 'session' and 'count_line' types.

router = APIRouter()


class SyncOperation(BaseModel):
    id: str
    type: str  # 'session', 'count_line', etc.
    data: dict[str, Any]
    timestamp: datetime


class BatchSyncRequest(BaseModel):
    operations: list[SyncOperation]


class OperationResult(BaseModel):
    id: str
    success: bool
    message: Optional[str] = None
    data: Optional[dict[str, Optional[Any]]] = (
        None  # Return created data if needed (e.g. server IDs)
    )


class BatchSyncResponse(BaseModel):
    results: list[OperationResult]
    processed_count: int
    success_count: int
    failed_count: int


@router.post("/batch", response_model=BatchSyncResponse)
async def sync_batch(
    payload: BatchSyncRequest,
    current_user: dict = Depends(get_current_user),
):
    results = []
    success_count = 0
    failed_count = 0
    db = get_db()

    # Sort operations by timestamp to ensure correct order if needed,
    # but usually the client sends them in order.
    # We will process them sequentially.

    # We need to map client-side IDs to server-side IDs for dependent objects.
    # e.g. a session created offline has a temp ID. Count lines refer to that temp ID.
    # We need to replace the temp ID with the real ID when creating the count line.
    id_mapping: dict[str, str] = {}

    for op in payload.operations:
        result = OperationResult(id=op.id, success=False)
        try:
            if op.type == "session":
                # Handle Session Creation
                session_data = op.data
                # Verify if session already exists (idempotency check by local ID or some other field?)
                # For now, assume it's a new session creation request.

                # We need to adapt the data to what the create_session function expects.
                # Assuming simple creation for now.

                # Placeholder comment identifying unused logic was removed

                # Insert into DB
                # Using the same logic as server.py's create_session essentially
                session_doc = {
                    "warehouse": session_data.get("warehouse"),
                    "staff_user": current_user["username"],
                    "staff_name": current_user["full_name"],
                    "status": "OPEN",
                    "started_at": datetime.utcnow(),
                    "created_offline": True,
                    "offline_id": session_data.get("id"),  # Store original offline ID
                }

                res = await db.sessions.insert_one(session_doc)
                real_session_id = str(res.inserted_id)

                # Store mapping if offline data provided an ID
                offline_id = session_data.get("id")
                if offline_id:
                    id_mapping[str(offline_id)] = real_session_id

                result.success = True
                result.message = "Session synced"
                result.data = {"server_id": real_session_id}
                success_count += 1

            elif op.type == "count_line":
                # Handle Count Line
                line_data = op.data

                # Fix session_id if it was a temp ID
                temp_session_id = line_data.get("session_id")
                if temp_session_id in id_mapping:
                    line_data["session_id"] = id_mapping[temp_session_id]

                # Insert count line
                # Add metadata
                line_data["synced_at"] = datetime.utcnow()
                line_data["counted_by"] = current_user["username"]

                await db.count_lines.insert_one(line_data)

                result.success = True
                result.message = "Count line synced"
                success_count += 1

            else:
                result.message = f"Unknown operation type: {op.type}"
                failed_count += 1

        except Exception as e:
            logger.error(f"Sync error for op {op.id}: {str(e)}")
            result.message = str(e)
            failed_count += 1

        results.append(result)

    return BatchSyncResponse(
        results=results,
        processed_count=len(payload.operations),
        success_count=success_count,
        failed_count=failed_count,
    )
