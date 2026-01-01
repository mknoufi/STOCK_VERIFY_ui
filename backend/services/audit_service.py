"""
Audit Logging Service

Provides centralized audit logging for user actions.
"""

import logging
from datetime import datetime
from typing import Any, Optional

from backend.core.schemas.audit_log import AuditAction
from backend.db.runtime import get_db

logger = logging.getLogger(__name__)


class AuditService:
    """Service for managing audit logs."""

    COLLECTION_NAME = "audit_logs"

    @classmethod
    async def log(
        cls,
        user_id: str,
        username: str,
        action: AuditAction,
        *,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[str]:
        """
        Create an audit log entry.

        Args:
            user_id: ID of the user performing the action
            username: Username of the user
            action: Type of action performed
            resource_type: Type of resource affected
            resource_id: ID of the affected resource
            details: Additional action details
            ip_address: IP address of the request
            user_agent: User agent string

        Returns:
            ID of the created audit log entry, or None on failure
        """
        try:
            db = get_db()

            log_entry = {
                "user_id": user_id,
                "username": username,
                "action": action.value,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "details": details or {},
                "ip_address": ip_address,
                "user_agent": user_agent,
                "timestamp": datetime.utcnow(),
            }

            result = await db[cls.COLLECTION_NAME].insert_one(log_entry)

            logger.info(
                f"Audit log created: {action.value} by {username} "
                f"(resource: {resource_type}/{resource_id})"
            )

            return str(result.inserted_id)

        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            return None

    @classmethod
    async def log_auth_action(
        cls,
        user_id: str,
        username: str,
        action: AuditAction,
        *,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> Optional[str]:
        """
        Log an authentication-related action.

        Args:
            user_id: ID of the user
            username: Username of the user
            action: Authentication action type
            ip_address: Client IP address
            user_agent: Client user agent
            success: Whether the action succeeded
            error_message: Error message if action failed

        Returns:
            ID of the created audit log entry
        """
        details: dict[str, bool | str] = {
            "success": success,
        }

        if error_message:
            details["error"] = error_message

        return await cls.log(
            user_id=user_id,
            username=username,
            action=action,
            resource_type="user",
            resource_id=user_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    @classmethod
    async def log_pin_change(
        cls,
        user_id: str,
        username: str,
        *,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_code: Optional[str] = None,
    ) -> Optional[str]:
        """
        Log a PIN change action.

        Args:
            user_id: ID of the user changing PIN
            username: Username of the user
            ip_address: Client IP address
            user_agent: Client user agent
            success: Whether the PIN change succeeded
            error_code: Error code if change failed

        Returns:
            ID of the created audit log entry
        """
        details = {
            "success": success,
            "action_type": "pin_change",
        }

        if error_code:
            details["error_code"] = error_code

        return await cls.log(
            user_id=user_id,
            username=username,
            action=AuditAction.CHANGE_PIN,
            resource_type="user",
            resource_id=user_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    @classmethod
    async def log_password_change(
        cls,
        user_id: str,
        username: str,
        *,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> Optional[str]:
        """
        Log a password change action.

        Args:
            user_id: ID of the user changing password
            username: Username of the user
            ip_address: Client IP address
            user_agent: Client user agent
            success: Whether the password change succeeded
            error_message: Error message if change failed

        Returns:
            ID of the created audit log entry
        """
        details = {
            "success": success,
            "action_type": "password_change",
        }

        if error_message:
            details["error"] = error_message

        return await cls.log(
            user_id=user_id,
            username=username,
            action=AuditAction.CHANGE_PASSWORD,
            resource_type="user",
            resource_id=user_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    @classmethod
    async def log_settings_update(
        cls,
        user_id: str,
        username: str,
        *,
        changed_fields: list[str],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[str]:
        """
        Log a settings update action.

        Args:
            user_id: ID of the user updating settings
            username: Username of the user
            changed_fields: List of field names that were changed
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            ID of the created audit log entry
        """
        return await cls.log(
            user_id=user_id,
            username=username,
            action=AuditAction.SETTINGS_UPDATE,
            resource_type="user_settings",
            resource_id=user_id,
            details={"changed_fields": changed_fields},
            ip_address=ip_address,
            user_agent=user_agent,
        )

    @classmethod
    async def get_user_audit_logs(
        cls,
        user_id: str,
        *,
        limit: int = 50,
        offset: int = 0,
        action_filter: Optional[AuditAction] = None,
    ) -> list[dict[str, Any]]:
        """
        Get audit logs for a specific user.

        Args:
            user_id: ID of the user
            limit: Maximum number of logs to return
            offset: Number of logs to skip
            action_filter: Optional filter by action type

        Returns:
            List of audit log entries
        """
        try:
            db = get_db()

            query: dict[str, Any] = {"user_id": user_id}

            if action_filter:
                query["action"] = action_filter.value

            cursor = (
                db[cls.COLLECTION_NAME].find(query).sort("timestamp", -1).skip(offset).limit(limit)
            )

            logs = await cursor.to_list(length=limit)

            # Convert ObjectId to string
            for log in logs:
                log["id"] = str(log.pop("_id"))

            return logs

        except Exception as e:
            logger.error(f"Failed to retrieve audit logs for user {user_id}: {e}")
            return []


# Singleton-style access
audit_service = AuditService()
