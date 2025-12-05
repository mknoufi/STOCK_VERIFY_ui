"""
Error Log Service
Tracks and stores application errors, exceptions, and system issues for monitoring
"""

import logging
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ErrorLog(BaseModel):
    """Error log entry model"""

    id: Optional[str] = None
    timestamp: datetime
    error_type: str  # e.g., "HTTPException", "ValueError", "ConnectionError"
    error_message: str
    error_code: Optional[str] = None
    severity: str = "error"  # "critical", "error", "warning", "info"
    endpoint: Optional[str] = None
    method: Optional[str] = None
    user: Optional[str] = None
    role: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    stack_trace: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    response_status: Optional[int] = None
    context: Optional[Dict[str, Any]] = None
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None


class ErrorLogService:
    """Service for logging and retrieving application errors"""

    def __init__(self, mongo_db: AsyncIOMotorDatabase):
        self.db = mongo_db
        self.collection = mongo_db.error_logs

    async def log_error(
        self,
        error: Exception,
        error_type: Optional[str] = None,
        error_code: Optional[str] = None,
        severity: str = "error",
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        user: Optional[str] = None,
        role: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        response_status: Optional[int] = None,
        context: Optional[Dict[str, Any]] = None,
        include_stack_trace: bool = True,
    ) -> str:
        """
        Log an error

        Args:
            error: Exception object
            error_type: Type of error (auto-detected if not provided)
            error_code: Application-specific error code
            severity: "critical", "error", "warning", "info"
            endpoint: API endpoint where error occurred
            method: HTTP method
            user: Username (if authenticated)
            role: User role
            ip_address: Client IP address
            user_agent: Client user agent
            request_data: Request payload/data
            response_status: HTTP response status code
            context: Additional context information
            include_stack_trace: Whether to include full stack trace

        Returns:
            Log entry ID
        """
        try:
            # Determine error type
            if not error_type:
                error_type = type(error).__name__

            # Get error message
            error_message = str(error)
            if not error_message:
                error_message = f"{error_type} occurred"

            # Get stack trace if requested
            stack_trace = None
            if include_stack_trace:
                try:
                    stack_trace = "".join(
                        traceback.format_exception(type(error), error, error.__traceback__)
                    )
                except Exception:
                    stack_trace = traceback.format_exc()

            # Create log entry
            log_entry = {
                "timestamp": datetime.utcnow(),
                "error_type": error_type,
                "error_message": error_message,
                "error_code": error_code,
                "severity": severity,
                "endpoint": endpoint,
                "method": method,
                "user": user,
                "role": role,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "stack_trace": stack_trace,
                "request_data": request_data,
                "response_status": response_status,
                "context": context or {},
                "resolved": False,
            }

            result = await self.collection.insert_one(log_entry)
            log_entry["id"] = str(result.inserted_id)

            # Log to application logger based on severity
            log_level = {
                "critical": logging.CRITICAL,
                "error": logging.ERROR,
                "warning": logging.WARNING,
                "info": logging.INFO,
            }.get(severity, logging.ERROR)

            logger.log(
                log_level,
                f"Error logged: {error_type} - {error_message}",
                extra={
                    "error_id": str(result.inserted_id),
                    "endpoint": endpoint,
                    "user": user,
                },
            )

            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to log error: {str(e)}", exc_info=True)
            # Don't raise - error logging failures shouldn't break the app
            return ""

    async def log_http_error(
        self,
        status_code: int,
        detail: Any,
        endpoint: str,
        method: str = "GET",
        user: Optional[str] = None,
        role: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Log an HTTP error"""
        # Determine severity based on status code
        if status_code >= 500:
            severity = "critical"
        elif status_code >= 400:
            severity = "error"
        else:
            severity = "warning"

        # Extract error details
        error_message = detail
        error_code = None
        if isinstance(detail, dict):
            error_message = detail.get("message", str(detail))
            error_code = detail.get("code")
        elif not isinstance(error_message, str):
            error_message = str(detail)

        # Create error object
        error = Exception(error_message)
        error.error_code = error_code  # type: ignore

        return await self.log_error(
            error=error,
            error_type=f"HTTP{status_code}",
            error_code=error_code,
            severity=severity,
            endpoint=endpoint,
            method=method,
            user=user,
            role=role,
            ip_address=ip_address,
            user_agent=user_agent,
            request_data=request_data,
            response_status=status_code,
        )

    async def get_errors(
        self,
        severity: Optional[str] = None,
        error_type: Optional[str] = None,
        endpoint: Optional[str] = None,
        user: Optional[str] = None,
        resolved: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """
        Retrieve error logs with filtering and pagination

        Args:
            severity: Filter by severity
            error_type: Filter by error type
            endpoint: Filter by endpoint
            user: Filter by user
            resolved: Filter by resolved status
            start_date: Filter by start date
            end_date: Filter by end date
            page: Page number
            page_size: Items per page

        Returns:
            Dictionary with errors and pagination info
        """
        try:
            # Build filter query
            filter_query = self._build_filter_query(
                severity, error_type, endpoint, user, resolved, start_date, end_date
            )

            # Count total
            total = await self.collection.count_documents(filter_query)

            # Calculate pagination
            skip = (page - 1) * page_size

            # Fetch errors
            cursor = (
                self.collection.find(filter_query).sort("timestamp", -1).skip(skip).limit(page_size)
            )
            raw_errors = await cursor.to_list(page_size)

            # Process errors
            errors = self._process_errors(raw_errors)

            return {
                "errors": errors,
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
            logger.error(f"Failed to retrieve errors: {str(e)}")
            raise

    def _build_filter_query(
        self,
        severity: Optional[str],
        error_type: Optional[str],
        endpoint: Optional[str],
        user: Optional[str],
        resolved: Optional[bool],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> Dict[str, Any]:
        """Build filter query for errors"""
        filter_query: Dict[str, Any] = {}

        if severity:
            filter_query["severity"] = severity
        if error_type:
            filter_query["error_type"] = error_type
        if endpoint:
            filter_query["endpoint"] = endpoint
        if user:
            filter_query["user"] = user
        if resolved is not None:
            filter_query["resolved"] = resolved
        if start_date or end_date:
            filter_query["timestamp"] = {}
            if start_date:
                filter_query["timestamp"]["$gte"] = start_date
            if end_date:
                filter_query["timestamp"]["$lte"] = end_date

        return filter_query

    def _process_errors(self, errors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process error documents for response"""
        processed_errors = []
        for error in errors:
            # Convert ObjectId to string
            if "_id" in error:
                error["id"] = str(error["_id"])
                del error["_id"]

            # Truncate stack trace for list view
            if error.get("stack_trace") and len(error["stack_trace"]) > 500:
                error["stack_trace_preview"] = error["stack_trace"][:500] + "..."

            processed_errors.append(error)
        return processed_errors

    async def get_error_by_id(self, error_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific error by ID"""
        try:
            from bson import ObjectId

            error = await self.collection.find_one({"_id": ObjectId(error_id)})
            if error:
                error["id"] = str(error["_id"])
                del error["_id"]
            return error
        except Exception as e:
            logger.error(f"Failed to retrieve error: {str(e)}")
            return None

    async def mark_resolved(
        self, error_id: str, resolved_by: str, resolution_note: Optional[str] = None
    ) -> bool:
        """Mark an error as resolved"""
        try:
            from bson import ObjectId

            result = await self.collection.update_one(
                {"_id": ObjectId(error_id)},
                {
                    "$set": {
                        "resolved": True,
                        "resolved_at": datetime.utcnow(),
                        "resolved_by": resolved_by,
                        "resolution_note": resolution_note,
                    }
                },
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to mark error as resolved: {str(e)}")
            return False

    async def get_statistics(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get error statistics"""
        try:
            filter_query: Dict[str, Any] = {}
            if start_date or end_date:
                filter_query["timestamp"] = {}
                if start_date:
                    filter_query["timestamp"]["$gte"] = start_date
                if end_date:
                    filter_query["timestamp"]["$lte"] = end_date

            # Total errors
            total = await self.collection.count_documents(filter_query)

            # By severity
            critical_count = await self.collection.count_documents(
                {**filter_query, "severity": "critical"}
            )
            error_count = await self.collection.count_documents(
                {**filter_query, "severity": "error"}
            )
            warning_count = await self.collection.count_documents(
                {**filter_query, "severity": "warning"}
            )
            info_count = await self.collection.count_documents({**filter_query, "severity": "info"})

            # Unresolved errors
            unresolved_count = await self.collection.count_documents(
                {**filter_query, "resolved": False}
            )

            # By error type (top 10)
            pipeline: List[Dict[str, Any]] = [
                {"$match": filter_query} if filter_query else {"$match": {}},
                {"$group": {"_id": "$error_type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ]
            top_error_types = await self.collection.aggregate(pipeline).to_list(10)

            # By endpoint (top 10)
            pipeline_endpoints: List[Dict[str, Any]] = [
                (
                    {
                        "$match": {
                            **filter_query,
                            "endpoint": {"$exists": True, "$ne": None},
                        }
                    }
                    if filter_query
                    else {"$match": {"endpoint": {"$exists": True, "$ne": None}}}
                ),
                {"$group": {"_id": "$endpoint", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ]
            top_endpoints = await self.collection.aggregate(pipeline_endpoints).to_list(10)

            # Recent errors (last 24 hours)
            last_24h = datetime.utcnow() - timedelta(hours=24)
            recent_filter = {**filter_query, "timestamp": {"$gte": last_24h}}
            if filter_query.get("timestamp"):
                recent_filter["timestamp"]["$gte"] = max(
                    filter_query["timestamp"].get("$gte", last_24h), last_24h
                )
            recent_count = await self.collection.count_documents(recent_filter)

            return {
                "total": total,
                "by_severity": {
                    "critical": critical_count,
                    "error": error_count,
                    "warning": warning_count,
                    "info": info_count,
                },
                "unresolved": unresolved_count,
                "recent_24h": recent_count,
                "top_error_types": [
                    {"type": item["_id"], "count": item["count"]} for item in top_error_types
                ],
                "top_endpoints": [
                    {"endpoint": item["_id"], "count": item["count"]} for item in top_endpoints
                ],
            }
        except Exception as e:
            logger.error(f"Failed to get statistics: {str(e)}")
            return {
                "total": 0,
                "by_severity": {"critical": 0, "error": 0, "warning": 0, "info": 0},
                "unresolved": 0,
                "recent_24h": 0,
                "top_error_types": [],
                "top_endpoints": [],
            }
