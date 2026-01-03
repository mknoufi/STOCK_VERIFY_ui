"""
Audit Log Schema

Pydantic models for audit logging of user actions.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class AuditAction(str, Enum):
    """Enumeration of auditable actions."""

    # Authentication actions
    LOGIN = "LOGIN"
    LOGIN_PIN = "LOGIN_PIN"
    LOGOUT = "LOGOUT"
    CHANGE_PIN = "CHANGE_PIN"
    CHANGE_PASSWORD = "CHANGE_PASSWORD"  # pragma: allowlist secret

    # Session actions
    SESSION_START = "SESSION_START"
    SESSION_END = "SESSION_END"
    SESSION_CLAIM_RACK = "SESSION_CLAIM_RACK"
    SESSION_RELEASE_RACK = "SESSION_RELEASE_RACK"

    # Item actions
    ITEM_SCAN = "ITEM_SCAN"
    ITEM_VERIFY = "ITEM_VERIFY"
    ITEM_UPDATE = "ITEM_UPDATE"
    ITEM_SEARCH = "ITEM_SEARCH"

    # Settings actions
    SETTINGS_UPDATE = "SETTINGS_UPDATE"

    # Admin actions
    USER_CREATE = "USER_CREATE"
    USER_UPDATE = "USER_UPDATE"
    USER_DELETE = "USER_DELETE"
    USER_DEACTIVATE = "USER_DEACTIVATE"

    # Sync actions
    SYNC_START = "SYNC_START"
    SYNC_COMPLETE = "SYNC_COMPLETE"
    SYNC_ERROR = "SYNC_ERROR"

    # Report actions
    REPORT_GENERATE = "REPORT_GENERATE"
    REPORT_EXPORT = "REPORT_EXPORT"


class AuditLogCreate(BaseModel):
    """Model for creating an audit log entry."""

    user_id: str = Field(description="ID of the user performing the action")
    username: str = Field(description="Username of the user")
    action: AuditAction = Field(description="Type of action performed")
    resource_type: Optional[str] = Field(
        default=None,
        description="Type of resource affected (e.g., 'user', 'item', 'session')",
    )
    resource_id: Optional[str] = Field(default=None, description="ID of the affected resource")
    details: Optional[dict[str, Any]] = Field(default=None, description="Additional action details")
    ip_address: Optional[str] = Field(default=None, description="IP address of the request")
    user_agent: Optional[str] = Field(default=None, description="User agent string")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "000000000000000000000000",
                "username": "staff_user",
                "action": "CHANGE_PIN",
                "resource_type": "user",
                "resource_id": "000000000000000000000000",
                "details": {"old_pin_changed": True},
                "ip_address": "192.168.1.100",
            }
        }
    )


class AuditLog(AuditLogCreate):
    """Full audit log model with database fields."""

    id: str = Field(description="Audit log entry ID")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Timestamp of the action"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "000000000000000000000000",
                "user_id": "000000000000000000000000",
                "username": "staff_user",
                "action": "CHANGE_PIN",
                "resource_type": "user",
                "resource_id": "000000000000000000000000",
                "details": {"old_pin_changed": True},
                "ip_address": "192.168.1.100",
                "timestamp": "2025-12-23T10:30:00Z",
            }
        }
    )
