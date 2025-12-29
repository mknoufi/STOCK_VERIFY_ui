from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel


class SyncItem(BaseModel):
    """
    Represents a single item in the sync queue.
    """

    operation: Literal["count_update", "session_complete", "session_start"]
    entity_type: Literal["count_line", "session"]
    entity_id: Optional[str] = None
    payload: dict[str, Any]
    created_at: datetime
    retry_count: int = 0
    status: Literal["pending", "syncing", "synced", "failed", "conflict"] = "pending"
    error_message: Optional[str] = None


class SyncRequest(BaseModel):
    """
    Batch sync request from client.
    """

    items: list[SyncItem]
    device_id: str
