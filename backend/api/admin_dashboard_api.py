"""
Admin Dashboard API - Live KPIs, System Status, User Monitoring
PC-based web dashboard endpoints for administrators
"""

import logging
import os
import time
from datetime import datetime, timedelta
from typing import Any, Optional

import psutil
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from backend.auth.dependencies import require_admin
from backend.db.runtime import get_db

logger = logging.getLogger(__name__)

admin_dashboard_router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

# Track server start time for uptime calculation
SERVER_START_TIME = time.time()


# Response Models
class KPIResponse(BaseModel):
    total_stock_value: float
    verified_stock_value: float
    verification_percentage: float
    active_sessions: int
    active_users: int
    pending_variances: int
    items_verified_today: int
    timestamp: str


class SystemStatusResponse(BaseModel):
    api_health: str
    mongodb_status: str
    sqlserver_status: str
    avg_response_time_ms: float
    error_rate_percent: float
    memory_usage_mb: float
    cpu_usage_percent: float
    uptime_seconds: int
    timestamp: str


class ActiveUserInfo(BaseModel):
    user_id: str
    username: str
    role: str
    last_activity: str
    current_session: Optional[str]
    status: str


class ErrorLogEntry(BaseModel):
    id: str
    timestamp: str
    level: str
    message: str
    endpoint: Optional[str]
    user_id: Optional[str]
    details: dict[str, Optional[Any]]


class PerformanceMetric(BaseModel):
    timestamp: str
    latency_ms: float
    throughput_rps: float
    error_count: int


# Helper Functions
async def calculate_total_stock_value(db) -> float:
    """Calculate total stock value from ERP items."""
    try:
        pipeline = [
            {"$match": {"stock_qty": {"$exists": True}}},
            {
                "$group": {
                    "_id": None,
                    "total_value": {
                        "$sum": {
                            "$multiply": ["$stock_qty", {"$ifNull": ["$price", 0]}]
                        }
                    },
                }
            },
        ]
        result = await db.erp_items.aggregate(pipeline).to_list(1)
        return result[0]["total_value"] if result else 0.0
    except Exception as e:
        logger.error(f"Error calculating total stock value: {e}")
        return 0.0


async def calculate_verified_value(db) -> float:
    """Calculate value of verified stock."""
    try:
        pipeline = [
            {"$match": {"status": "verified"}},
            {
                "$group": {
                    "_id": None,
                    "total_value": {
                        "$sum": {
                            "$multiply": ["$verified_qty", {"$ifNull": ["$price", 0]}]
                        }
                    },
                }
            },
        ]
        result = await db.verification_records.aggregate(pipeline).to_list(1)
        return result[0]["total_value"] if result else 0.0
    except Exception as e:
        logger.error(f"Error calculating verified value: {e}")
        return 0.0


async def calculate_completion_percentage(db) -> float:
    """Calculate verification completion percentage."""
    try:
        total_items = await db.erp_items.count_documents({})
        if total_items == 0:
            return 0.0

        verified_items = await db.verification_records.count_documents(
            {"status": "verified"}
        )
        return round((verified_items / total_items) * 100, 2)
    except Exception as e:
        logger.error(f"Error calculating completion: {e}")
        return 0.0


async def count_active_sessions(db) -> int:
    """Count currently active verification sessions."""
    try:
        return await db.verification_sessions.count_documents(
            {"status": {"$in": ["active", "in_progress"]}}
        )
    except Exception as e:
        logger.error(f"Error counting sessions: {e}")
        return 0


async def count_active_users(db) -> int:
    """Count users with recent activity (last 30 minutes)."""
    try:
        cutoff = datetime.utcnow() - timedelta(minutes=30)
        return await db.user_presence.count_documents({"last_seen": {"$gte": cutoff}})
    except Exception as e:
        logger.error(f"Error counting active users: {e}")
        return 0


async def count_pending_variances(db) -> int:
    """Count variances pending supervisor review."""
    try:
        return await db.verification_records.count_documents(
            {"status": "pending_review", "variance": {"$ne": 0}}
        )
    except Exception as e:
        logger.error(f"Error counting variances: {e}")
        return 0


async def count_items_verified_today(db) -> int:
    """Count items verified today."""
    try:
        today_start = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        return await db.verification_records.count_documents(
            {"created_at": {"$gte": today_start}, "status": "verified"}
        )
    except Exception as e:
        logger.error(f"Error counting today's verifications: {e}")
        return 0


async def check_mongodb_connection(db) -> str:
    """Check MongoDB connection status."""
    try:
        await db.command("ping")
        return "connected"
    except Exception as e:
        logger.error(f"MongoDB connection error: {e}")
        return "disconnected"


async def check_sqlserver_connection() -> str:
    """Check SQL Server connection status."""
    try:
        from backend.sql_server_connector import SQLServerConnector

        connector = SQLServerConnector()
        if connector.test_connection():
            return "connected"
        return "disconnected"
    except Exception as e:
        logger.error(f"SQL Server connection error: {e}")
        return "disconnected"


def get_memory_usage() -> float:
    """Get current memory usage in MB."""
    try:
        process = psutil.Process(os.getpid())
        return round(process.memory_info().rss / 1024 / 1024, 2)
    except Exception:
        return 0.0


def get_cpu_usage() -> float:
    """Get current CPU usage percentage."""
    try:
        return psutil.cpu_percent(interval=0.1)
    except Exception:
        return 0.0


def get_uptime() -> int:
    """Get server uptime in seconds."""
    return int(time.time() - SERVER_START_TIME)


# API Endpoints
@admin_dashboard_router.get("/kpis", response_model=KPIResponse)
async def get_dashboard_kpis(current_user: dict = Depends(require_admin)):
    """
    Get live KPIs for admin dashboard.
    Includes total stock value, verified value, completion percentage, etc.
    """
    db = get_db()

    return KPIResponse(
        total_stock_value=await calculate_total_stock_value(db),
        verified_stock_value=await calculate_verified_value(db),
        verification_percentage=await calculate_completion_percentage(db),
        active_sessions=await count_active_sessions(db),
        active_users=await count_active_users(db),
        pending_variances=await count_pending_variances(db),
        items_verified_today=await count_items_verified_today(db),
        timestamp=datetime.utcnow().isoformat(),
    )


@admin_dashboard_router.get("/system-status", response_model=SystemStatusResponse)
async def get_system_status(current_user: dict = Depends(require_admin)):
    """
    Get real-time system health metrics.
    Includes database connections, performance metrics, and resource usage.
    """
    db = get_db()

    # Get average response time from metrics collection
    avg_response_time = 0.0
    error_rate = 0.0
    try:
        # Look at last 100 API metrics
        pipeline: list[dict[str, Any]] = [
            {"$sort": {"timestamp": -1}},
            {"$limit": 100},
            {
                "$group": {
                    "_id": None,
                    "avg_latency": {"$avg": "$latency_ms"},
                    "total_requests": {"$sum": 1},
                    "error_count": {
                        "$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}
                    },
                }
            },
        ]
        result = await db.api_metrics.aggregate(pipeline).to_list(1)
        if result:
            avg_response_time = round(result[0].get("avg_latency", 0), 2)
            total = result[0].get("total_requests", 1)
            errors = result[0].get("error_count", 0)
            error_rate = round((errors / total) * 100, 2) if total > 0 else 0.0
    except Exception as e:
        logger.warning(f"Could not fetch API metrics: {e}")

    return SystemStatusResponse(
        api_health="healthy",
        mongodb_status=await check_mongodb_connection(db),
        sqlserver_status=await check_sqlserver_connection(),
        avg_response_time_ms=avg_response_time,
        error_rate_percent=error_rate,
        memory_usage_mb=get_memory_usage(),
        cpu_usage_percent=get_cpu_usage(),
        uptime_seconds=get_uptime(),
        timestamp=datetime.utcnow().isoformat(),
    )


@admin_dashboard_router.get("/active-users", response_model=list[ActiveUserInfo])
async def get_active_users(current_user: dict = Depends(require_admin)):
    """
    Get list of currently active users with their status and session info.
    """
    db = get_db()

    cutoff = datetime.utcnow() - timedelta(minutes=30)

    try:
        # Get recent user presence records
        cursor = db.user_presence.find({"last_seen": {"$gte": cutoff}}).sort(
            "last_seen", -1
        )

        presence_records = await cursor.to_list(100)

        active_users = []
        for record in presence_records:
            # Get user details
            user = await db.users.find_one({"_id": record.get("user_id")})
            if user:
                # Check if user has an active session
                session = await db.verification_sessions.find_one(
                    {
                        "user_id": str(user["_id"]),
                        "status": {"$in": ["active", "in_progress"]},
                    }
                )

                # Determine online status
                last_seen = record.get("last_seen", datetime.utcnow())
                minutes_ago = (datetime.utcnow() - last_seen).total_seconds() / 60
                user_status = "online" if minutes_ago < 5 else "idle"

                active_users.append(
                    ActiveUserInfo(
                        user_id=str(user["_id"]),
                        username=user.get("username", "Unknown"),
                        role=user.get("role", "staff"),
                        last_activity=last_seen.isoformat(),
                        current_session=session.get("session_id") if session else None,
                        status=user_status,
                    )
                )

        return active_users

    except Exception as e:
        logger.error(f"Error fetching active users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch active users",
        )


@admin_dashboard_router.get("/error-logs", response_model=list[ErrorLogEntry])
async def get_error_logs(
    limit: int = Query(default=100, le=500),
    level: Optional[str] = Query(default=None, regex="^(error|warning|critical)$"),
    hours: int = Query(default=24, le=168),
    current_user: dict = Depends(require_admin),
):
    """
    Get recent API errors from the error log.
    """
    db = get_db()

    cutoff = datetime.utcnow() - timedelta(hours=hours)

    query: dict[str, Any] = {"timestamp": {"$gte": cutoff}}
    if level:
        query["level"] = level.upper()

    try:
        cursor = db.error_logs.find(query).sort("timestamp", -1).limit(limit)
        logs = await cursor.to_list(limit)

        return [
            ErrorLogEntry(
                id=str(log.get("_id", "")),
                timestamp=log.get("timestamp", datetime.utcnow()).isoformat(),
                level=log.get("level", "ERROR"),
                message=log.get("message", "Unknown error"),
                endpoint=log.get("endpoint"),
                user_id=log.get("user_id"),
                details=log.get("details"),
            )
            for log in logs
        ]

    except Exception as e:
        logger.error(f"Error fetching error logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch error logs",
        )


@admin_dashboard_router.get(
    "/performance-metrics", response_model=list[PerformanceMetric]
)
async def get_performance_metrics(
    hours: int = Query(default=24, le=168),
    interval_minutes: int = Query(default=60, le=360),
    current_user: dict = Depends(require_admin),
):
    """
    Get performance metrics aggregated by time interval.
    Used for charts showing latency, throughput, and error rates over time.
    """
    db = get_db()

    cutoff = datetime.utcnow() - timedelta(hours=hours)

    try:
        # Aggregate metrics by time bucket
        pipeline: list[dict[str, Any]] = [
            {"$match": {"timestamp": {"$gte": cutoff}}},
            {
                "$group": {
                    "_id": {
                        "$dateTrunc": {
                            "date": "$timestamp",
                            "unit": "minute",
                            "binSize": interval_minutes,
                        }
                    },
                    "avg_latency": {"$avg": "$latency_ms"},
                    "request_count": {"$sum": 1},
                    "error_count": {
                        "$sum": {"$cond": [{"$gte": ["$status_code", 400]}, 1, 0]}
                    },
                }
            },
            {"$sort": {"_id": 1}},
        ]

        results = await db.api_metrics.aggregate(pipeline).to_list(1000)

        metrics = []
        for r in results:
            bucket_time = r["_id"]
            request_count = r["request_count"]
            interval_seconds = interval_minutes * 60
            throughput = request_count / interval_seconds if interval_seconds > 0 else 0

            metrics.append(
                PerformanceMetric(
                    timestamp=(
                        bucket_time.isoformat()
                        if bucket_time
                        else datetime.utcnow().isoformat()
                    ),
                    latency_ms=round(r.get("avg_latency", 0), 2),
                    throughput_rps=round(throughput, 3),
                    error_count=r.get("error_count", 0),
                )
            )

        return metrics

    except Exception as e:
        logger.error(f"Error fetching performance metrics: {e}")
        # Return empty list on error rather than failing
        return []


@admin_dashboard_router.get("/summary")
async def get_dashboard_summary(current_user: dict = Depends(require_admin)):
    """
    Get a complete dashboard summary combining KPIs, system status, and recent activity.
    Single endpoint for initial dashboard load.
    """
    db = get_db()

    # Parallel fetch of all dashboard data
    kpis = await get_dashboard_kpis(current_user)
    system_status = await get_system_status(current_user)
    active_users = await get_active_users(current_user)

    # Get recent error count
    cutoff = datetime.utcnow() - timedelta(hours=1)
    recent_errors = await db.error_logs.count_documents(
        {"timestamp": {"$gte": cutoff}, "level": {"$in": ["ERROR", "CRITICAL"]}}
    )

    return {
        "kpis": kpis.dict(),
        "system_status": system_status.dict(),
        "active_users": [u.dict() for u in active_users[:10]],
        "recent_errors_1h": recent_errors,
        "timestamp": datetime.utcnow().isoformat(),
    }
