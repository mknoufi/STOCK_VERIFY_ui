"""
Activity Log Service
Tracks and stores user activities and application events for audit purposes
"""

import logging
from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

logger = logging.getLogger(__name__)


def _build_activity_filter(
    user: Optional[str],
    role: Optional[str],
    action: Optional[str],
    entity_type: Optional[str],
    status: Optional[str],
    start_date: Optional[datetime],
    end_date: Optional[datetime],
) -> dict[str, Any]:
    """Build MongoDB filter query for activity logs."""
    filter_query: dict[str, Any] = {}

    if user:
        filter_query["user"] = user
    if role:
        filter_query["role"] = role
    if action:
        filter_query["action"] = action
    if entity_type:
        filter_query["entity_type"] = entity_type
    if status:
        filter_query["status"] = status

    if start_date or end_date:
        filter_query["timestamp"] = {}
        if start_date:
            filter_query["timestamp"]["$gte"] = start_date
        if end_date:
            filter_query["timestamp"]["$lte"] = end_date

    return filter_query


class ActivityLog(BaseModel):
    """Activity log entry model"""

    id: Optional[str] = None
    timestamp: datetime
    user: str
    role: str
    action: str  # e.g., "login", "scan_item", "create_session", "approve_count"
    entity_type: Optional[str] = None  # e.g., "item", "session", "count_line"
    entity_id: Optional[str] = None
    details: dict[str, Any] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    status: str = "success"  # "success", "error", "warning"
    error_message: Optional[str] = None


class ActivityLogService:
    """Service for logging and retrieving user activities"""

    def __init__(self, mongo_db: AsyncIOMotorDatabase):
        self.db = mongo_db
        self.collection = mongo_db.activity_logs

    async def log_activity(
        self,
        user: str,
        role: str,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: dict[str, Optional[Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        status: str = "success",
        error_message: Optional[str] = None,
    ) -> str:
        """
        Log a user activity

        Args:
            user: Username
            role: User role (staff/supervisor)
            action: Action performed (e.g., "login", "scan_item")
            entity_type: Type of entity affected (e.g., "item", "session")
            entity_id: ID of entity affected
            details: Additional details about the action
            ip_address: User's IP address
            user_agent: User's browser/client info
            status: "success", "error", or "warning"
            error_message: Error message if status is "error"

        Returns:
            Log entry ID
        """
        try:
            log_entry = {
                "timestamp": datetime.utcnow(),
                "user": user,
                "role": role,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "details": details or {},
                "ip_address": ip_address,
                "user_agent": user_agent,
                "status": status,
                "error_message": error_message,
            }

            result = await self.collection.insert_one(log_entry)
            log_entry["id"] = str(result.inserted_id)

            logger.debug(f"Activity logged: {user} - {action} - {status}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to log activity: {str(e)}")
            # Don't raise - logging failures shouldn't break the app
            return ""

    async def get_activities(
        self,
        user: Optional[str] = None,
        role: Optional[str] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> dict[str, Any]:
        """
        Retrieve activity logs with filtering and pagination

        Args:
            user: Filter by username
            role: Filter by role
            action: Filter by action type
            entity_type: Filter by entity type
            status: Filter by status
            start_date: Filter by start date
            end_date: Filter by end date
            page: Page number
            page_size: Items per page

        Returns:
            Dictionary with activities and pagination info
        """
        try:
            filter_query = _build_activity_filter(
                user, role, action, entity_type, status, start_date, end_date
            )

            total = await self.collection.count_documents(filter_query)
            skip = (page - 1) * page_size

            cursor = (
                self.collection.find(filter_query)
                .sort("timestamp", -1)
                .skip(skip)
                .limit(page_size)
            )
            activities = await cursor.to_list(page_size)

            for activity in activities:
                activity["id"] = str(activity["_id"])
                del activity["_id"]

            return {
                "activities": activities,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size,
                    "has_next": skip + page_size < total,
                    "has_prev": page > 1,
                },
            }
        except Exception as e:
            logger.error(f"Failed to retrieve activities: {str(e)}")
            raise

    async def get_user_activities(
        self, username: str, limit: int = 100
    ) -> list[dict[str, Any]]:
        """Get recent activities for a specific user"""
        try:
            cursor = (
                self.collection.find({"user": username})
                .sort("timestamp", -1)
                .limit(limit)
            )
            activities = await cursor.to_list(limit)

            for activity in activities:
                activity["id"] = str(activity["_id"])
                del activity["_id"]

            return activities
        except Exception as e:
            logger.error(f"Failed to retrieve user activities: {str(e)}")
            return []

    async def get_statistics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> dict[str, Any]:
        """Get activity statistics"""
        try:
            filter_query = {}
            if start_date or end_date:
                filter_query["timestamp"] = {}
                if start_date:
                    filter_query["timestamp"]["$gte"] = start_date
                if end_date:
                    filter_query["timestamp"]["$lte"] = end_date

            # Total activities
            total = await self.collection.count_documents(filter_query)

            # By status
            success_count = await self.collection.count_documents(
                {**filter_query, "status": "success"}
            )
            error_count = await self.collection.count_documents(
                {**filter_query, "status": "error"}
            )
            warning_count = await self.collection.count_documents(
                {**filter_query, "status": "warning"}
            )

            # By action (top 10)
            pipeline = [
                {"$match": filter_query} if filter_query else {"$match": {}},
                {"$group": {"_id": "$action", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ]
            top_actions = await self.collection.aggregate(pipeline).to_list(10)

            # By user (top 10)
            pipeline = [
                {"$match": filter_query} if filter_query else {"$match": {}},
                {"$group": {"_id": "$user", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ]
            top_users = await self.collection.aggregate(pipeline).to_list(10)

            return {
                "total": total,
                "by_status": {
                    "success": success_count,
                    "error": error_count,
                    "warning": warning_count,
                },
                "top_actions": [
                    {"action": item["_id"], "count": item["count"]}
                    for item in top_actions
                ],
                "top_users": [
                    {"user": item["_id"], "count": item["count"]} for item in top_users
                ],
            }
        except Exception as e:
            logger.error(f"Failed to get statistics: {str(e)}")
            return {
                "total": 0,
                "by_status": {"success": 0, "error": 0, "warning": 0},
                "top_actions": [],
                "top_users": [],
            }
