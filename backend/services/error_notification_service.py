"""
Error Notification Service
Handles error notifications for both users and admins
"""

import logging
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ErrorLevel(str, Enum):
    """Error severity levels"""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class NotificationTarget(str, Enum):
    """Who should be notified"""

    USER = "user"
    ADMIN = "admin"
    BOTH = "both"


class ErrorNotification(BaseModel):
    """Error notification model"""

    error_code: str
    message: str
    level: ErrorLevel
    service: str
    target: NotificationTarget
    user_id: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    timestamp: Optional[datetime] = None
    resolved: bool = False
    admin_acknowledged: bool = False

    def __init__(self, **data):
        if data.get("timestamp") is None:
            data["timestamp"] = datetime.utcnow()
        super().__init__(**data)


class ErrorNotificationService:
    """Service for managing error notifications"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.error_notifications

    async def initialize(self):
        """Initialize indexes"""
        try:
            await self.collection.create_index("timestamp")
            await self.collection.create_index("level")
            await self.collection.create_index("target")
            await self.collection.create_index("user_id")
            await self.collection.create_index("resolved")
            logger.info("Error notification indexes created")
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")

    async def log_error(
        self,
        error_code: str,
        message: str,
        level: ErrorLevel = ErrorLevel.ERROR,
        service: str = "unknown",
        target: NotificationTarget = NotificationTarget.BOTH,
        user_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> str:
        """
        Log an error and create notification

        Args:
            error_code: Error code identifier
            message: Error message
            level: Severity level
            service: Service name where error occurred
            target: Who to notify (user/admin/both)
            user_id: User ID (if user-specific)
            details: Additional error details

        Returns:
            Notification ID
        """
        try:
            notification = ErrorNotification(
                error_code=error_code,
                message=message,
                level=level,
                service=service,
                target=target,
                user_id=user_id,
                details=details,
            )

            result = await self.collection.insert_one(notification.dict())
            notification_id = str(result.inserted_id)

            logger.log(
                level=(
                    logging.WARNING
                    if level in [ErrorLevel.WARNING, ErrorLevel.CRITICAL]
                    else logging.INFO
                ),
                msg=f"Error notification created: {error_code} - {message}",
            )

            return notification_id
        except Exception as e:
            logger.error(f"Error logging error: {e}")
            raise

    async def get_unresolved_errors(
        self,
        target: Optional[NotificationTarget] = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """Get unresolved error notifications"""
        try:
            query = {"resolved": False}
            if target:
                query["target"] = {"$in": [target.value, NotificationTarget.BOTH.value]}

            errors = (
                await self.collection.find(query)
                .sort("timestamp", -1)
                .limit(limit)
                .to_list(length=limit)
            )
            return errors
        except Exception as e:
            logger.error(f"Error getting unresolved errors: {e}")
            return []

    async def get_user_errors(
        self, user_id: str, limit: int = 20
    ) -> list[dict[str, Any]]:
        """Get user-specific errors"""
        try:
            query = {
                "resolved": False,
                "target": {
                    "$in": [
                        NotificationTarget.USER.value,
                        NotificationTarget.BOTH.value,
                    ]
                },
                "$or": [{"user_id": user_id}, {"user_id": None}],
            }
            errors = (
                await self.collection.find(query)
                .sort("timestamp", -1)
                .limit(limit)
                .to_list(length=limit)
            )
            return errors
        except Exception as e:
            logger.error(f"Error getting user errors: {e}")
            return []

    async def get_admin_errors(self, limit: int = 100) -> list[dict[str, Any]]:
        """Get admin errors (unresolved)"""
        try:
            query = {
                "resolved": False,
                "target": {
                    "$in": [
                        NotificationTarget.ADMIN.value,
                        NotificationTarget.BOTH.value,
                    ]
                },
            }
            errors = (
                await self.collection.find(query)
                .sort("timestamp", -1)
                .limit(limit)
                .to_list(length=limit)
            )
            return errors
        except Exception as e:
            logger.error(f"Error getting admin errors: {e}")
            return []

    async def acknowledge_error(self, notification_id: str, admin_id: str) -> bool:
        """Mark error as acknowledged by admin"""
        try:
            result = await self.collection.update_one(
                {"_id": notification_id},
                {
                    "$set": {
                        "admin_acknowledged": True,
                        "acknowledged_by": admin_id,
                        "acknowledged_at": datetime.utcnow(),
                    }
                },
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error acknowledging error: {e}")
            return False

    async def resolve_error(self, notification_id: str, resolution: str = "") -> bool:
        """Mark error as resolved"""
        try:
            result = await self.collection.update_one(
                {"_id": notification_id},
                {
                    "$set": {
                        "resolved": True,
                        "resolved_at": datetime.utcnow(),
                        "resolution": resolution,
                    }
                },
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error resolving error: {e}")
            return False

    async def get_error_statistics(self) -> dict[str, Any]:
        """Get error statistics"""
        try:
            stats = await self.collection.aggregate(
                [
                    {"$match": {"resolved": False}},
                    {
                        "$group": {
                            "_id": "$level",
                            "count": {"$sum": 1},
                        }
                    },
                ]
            ).to_list(length=None)

            return {
                "total_unresolved": sum(s["count"] for s in stats),
                "by_level": {s["_id"]: s["count"] for s in stats},
                "timestamp": datetime.utcnow(),
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {"total_unresolved": 0, "by_level": {}}
