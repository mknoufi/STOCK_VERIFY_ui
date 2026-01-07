"""
Security Dashboard API
Provides endpoints for security monitoring, failed login tracking, and audit logs
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

security_router = APIRouter(prefix="/api/admin/security", tags=["Security"])


def require_admin(current_user: dict = Depends(get_current_user)):
    """Require admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user


@security_router.get("/failed-logins")
async def get_failed_logins(
    current_user: dict = Depends(require_admin),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back"),
    username: Optional[str] = Query(None, description="Filter by username"),
    ip_address: Optional[str] = Query(None, description="Filter by IP address"),
):
    """Get failed login attempts"""
    try:
        from backend.server import db

        # Build query
        query = {
            "success": False,
            "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=hours)},
        }

        if username:
            query["username"] = username
        if ip_address:
            query["ip_address"] = ip_address

        # Get failed logins
        cursor = db.login_attempts.find(query).sort("timestamp", -1).limit(limit)
        failed_logins = await cursor.to_list(limit)

        # Convert ObjectId to string
        for login in failed_logins:
            if "_id" in login:
                login["_id"] = str(login["_id"])
            if "timestamp" in login:
                login["timestamp"] = login["timestamp"].isoformat()

        # Get statistics
        total_failed = await db.login_attempts.count_documents(query)

        # Group by IP
        ip_pipeline = [
            {"$match": query},
            {"$group": {"_id": "$ip_address", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        top_ips = await db.login_attempts.aggregate(ip_pipeline).to_list(10)

        # Group by username
        user_pipeline = [
            {"$match": query},
            {"$group": {"_id": "$username", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        top_users = await db.login_attempts.aggregate(user_pipeline).to_list(10)

        return {
            "success": True,
            "data": {
                "failed_logins": failed_logins,
                "statistics": {
                    "total_failed": total_failed,
                    "time_range_hours": hours,
                    "top_ips": [
                        {"ip": item["_id"], "count": item["count"]} for item in top_ips
                    ],
                    "top_users": [
                        {"username": item["_id"], "count": item["count"]}
                        for item in top_users
                    ],
                },
            },
        }
    except Exception as e:
        logger.error(f"Error getting failed logins: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve failed logins: {str(e)}",
        )


@security_router.get("/suspicious-activity")
async def get_suspicious_activity(
    current_user: dict = Depends(require_admin),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back"),
):
    """Get suspicious activity patterns"""
    try:
        from backend.server import db

        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        # Multiple failed logins from same IP
        ip_pipeline = [
            {"$match": {"success": False, "timestamp": {"$gte": cutoff_time}}},
            {
                "$group": {
                    "_id": "$ip_address",
                    "count": {"$sum": 1},
                    "usernames": {"$addToSet": "$username"},
                    "last_attempt": {"$max": "$timestamp"},
                }
            },
            {"$match": {"count": {"$gte": 5}}},  # 5+ failed attempts
            {"$sort": {"count": -1}},
        ]
        suspicious_ips = await db.login_attempts.aggregate(ip_pipeline).to_list(50)

        # Multiple failed logins for same username
        user_pipeline = [
            {"$match": {"success": False, "timestamp": {"$gte": cutoff_time}}},
            {
                "$group": {
                    "_id": "$username",
                    "count": {"$sum": 1},
                    "ips": {"$addToSet": "$ip_address"},
                    "last_attempt": {"$max": "$timestamp"},
                }
            },
            {"$match": {"count": {"$gte": 5}}},  # 5+ failed attempts
            {"$sort": {"count": -1}},
        ]
        suspicious_users = await db.login_attempts.aggregate(user_pipeline).to_list(50)

        # Convert to response format
        for item in suspicious_ips:
            item["ip_address"] = item.pop("_id")
            item["last_attempt"] = (
                item["last_attempt"].isoformat() if item.get("last_attempt") else None
            )

        for item in suspicious_users:
            item["username"] = item.pop("_id")
            item["last_attempt"] = (
                item["last_attempt"].isoformat() if item.get("last_attempt") else None
            )

        return {
            "success": True,
            "data": {
                "suspicious_ips": suspicious_ips,
                "suspicious_users": suspicious_users,
                "time_range_hours": hours,
            },
        }
    except Exception as e:
        logger.error(f"Error getting suspicious activity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve suspicious activity: {str(e)}",
        )


@security_router.get("/sessions")
async def get_security_sessions(
    current_user: dict = Depends(require_admin),
    limit: int = Query(100, ge=1, le=500, description="Number of records to return"),
    active_only: bool = Query(False, description="Show only active sessions"),
):
    """Get all active sessions for security monitoring"""
    try:
        from backend.server import db

        # Get refresh tokens (active sessions)
        query = {"revoked": False}
        if active_only:
            query["expires_at"] = {"$gt": datetime.utcnow()}

        cursor = db.refresh_tokens.find(query).sort("created_at", -1).limit(limit)
        tokens = await cursor.to_list(limit)

        # Get user info for each token
        sessions = []
        for token in tokens:
            username = token.get("username")
            if username:
                user = await db.users.find_one({"username": username})
                if user:
                    sessions.append(
                        {
                            "username": username,
                            "user_id": str(user.get("_id", "")),
                            "role": user.get("role", "unknown"),
                            "ip_address": token.get("ip_address", "unknown"),
                            "user_agent": token.get("user_agent", "unknown"),
                            "created_at": (
                                token.get("created_at", datetime.utcnow()).isoformat()
                                if isinstance(token.get("created_at"), datetime)
                                else str(token.get("created_at", ""))
                            ),
                            "expires_at": (
                                token.get("expires_at", datetime.utcnow()).isoformat()
                                if isinstance(token.get("expires_at"), datetime)
                                else str(token.get("expires_at", ""))
                            ),
                            "last_used": (
                                token.get("last_used", datetime.utcnow()).isoformat()
                                if isinstance(token.get("last_used"), datetime)
                                else str(token.get("last_used", ""))
                            ),
                        }
                    )

        # Get statistics
        total_sessions = await db.refresh_tokens.count_documents({"revoked": False})
        active_sessions = await db.refresh_tokens.count_documents(
            {"revoked": False, "expires_at": {"$gt": datetime.utcnow()}}
        )

        return {
            "success": True,
            "data": {
                "sessions": sessions,
                "statistics": {
                    "total_sessions": total_sessions,
                    "active_sessions": active_sessions,
                    "expired_sessions": total_sessions - active_sessions,
                },
            },
        }
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve sessions: {str(e)}",
        )


@security_router.get("/audit-log")
async def get_audit_log(
    current_user: dict = Depends(require_admin),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    hours: int = Query(24, ge=1, le=720, description="Hours to look back"),
    action: Optional[str] = Query(None, description="Filter by action"),
    user: Optional[str] = Query(None, description="Filter by username"),
):
    """Get security audit log from activity logs"""
    try:
        from backend.server import db

        # Build query
        query = {"timestamp": {"$gte": datetime.utcnow() - timedelta(hours=hours)}}

        # Security-related actions
        security_actions = [
            "login",
            "logout",
            "register",
            "password_change",
            "permission_change",
            "user_create",
            "user_delete",
            "role_change",
            "token_refresh",
            "session_create",
        ]

        if action:
            query["action"] = action
        else:
            query["action"] = {"$in": security_actions}

        if user:
            query["user"] = user

        # Get audit logs
        cursor = db.activity_logs.find(query).sort("timestamp", -1).limit(limit)
        logs = await cursor.to_list(limit)

        # Convert ObjectId to string
        for log in logs:
            if "_id" in log:
                log["_id"] = str(log["_id"])
            if "timestamp" in log:
                log["timestamp"] = (
                    log["timestamp"].isoformat()
                    if isinstance(log["timestamp"], datetime)
                    else str(log["timestamp"])
                )

        return {
            "success": True,
            "data": {
                "audit_logs": logs,
                "time_range_hours": hours,
                "total_records": len(logs),
            },
        }
    except Exception as e:
        logger.error(f"Error getting audit log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve audit log: {str(e)}",
        )


@security_router.get("/ip-tracking")
async def get_ip_tracking(
    current_user: dict = Depends(require_admin),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back"),
):
    """Get IP address tracking data"""
    try:
        from backend.server import db

        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        # Aggregate IP data from login attempts
        ip_pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_time}}},
            {
                "$group": {
                    "_id": "$ip_address",
                    "total_attempts": {"$sum": 1},
                    "successful_logins": {"$sum": {"$cond": ["$success", 1, 0]}},
                    "failed_logins": {"$sum": {"$cond": ["$success", 0, 1]}},
                    "unique_users": {"$addToSet": "$username"},
                    "first_seen": {"$min": "$timestamp"},
                    "last_seen": {"$max": "$timestamp"},
                }
            },
            {
                "$project": {
                    "ip_address": "$_id",
                    "total_attempts": 1,
                    "successful_logins": 1,
                    "failed_logins": 1,
                    "unique_user_count": {"$size": "$unique_users"},
                    "first_seen": 1,
                    "last_seen": 1,
                }
            },
            {"$sort": {"total_attempts": -1}},
            {"$limit": 100},
        ]

        ip_data = await db.login_attempts.aggregate(ip_pipeline).to_list(100)

        # Convert timestamps
        for item in ip_data:
            if "first_seen" in item and isinstance(item["first_seen"], datetime):
                item["first_seen"] = item["first_seen"].isoformat()
            if "last_seen" in item and isinstance(item["last_seen"], datetime):
                item["last_seen"] = item["last_seen"].isoformat()

        return {
            "success": True,
            "data": {
                "ip_tracking": ip_data,
                "time_range_hours": hours,
                "total_ips": len(ip_data),
            },
        }
    except Exception as e:
        logger.error(f"Error getting IP tracking: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve IP tracking: {str(e)}",
        )


@security_router.get("/summary")
async def get_security_summary(
    current_user: dict = Depends(require_admin),
    hours: int = Query(24, ge=1, le=168, description="Hours to look back"),
):
    """Get security summary dashboard data"""
    try:
        from backend.server import db

        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        # Failed logins count
        failed_count = await db.login_attempts.count_documents(
            {"success": False, "timestamp": {"$gte": cutoff_time}}
        )

        # Successful logins count
        success_count = await db.login_attempts.count_documents(
            {"success": True, "timestamp": {"$gte": cutoff_time}}
        )

        # Active sessions
        active_sessions = await db.refresh_tokens.count_documents(
            {"revoked": False, "expires_at": {"$gt": datetime.utcnow()}}
        )

        # Suspicious IPs (5+ failed attempts)
        suspicious_ips_count = await db.login_attempts.aggregate(
            [
                {"$match": {"success": False, "timestamp": {"$gte": cutoff_time}}},
                {"$group": {"_id": "$ip_address", "count": {"$sum": 1}}},
                {"$match": {"count": {"$gte": 5}}},
                {"$count": "total"},
            ]
        ).to_list(1)

        suspicious_ips = suspicious_ips_count[0]["total"] if suspicious_ips_count else 0

        # Recent security events
        recent_events = (
            await db.activity_logs.find(
                {
                    "action": {
                        "$in": ["login", "logout", "register", "password_change"]
                    },
                    "timestamp": {"$gte": cutoff_time},
                }
            )
            .sort("timestamp", -1)
            .limit(10)
            .to_list(10)
        )

        for event in recent_events:
            if "_id" in event:
                event["_id"] = str(event["_id"])
            if "timestamp" in event:
                event["timestamp"] = (
                    event["timestamp"].isoformat()
                    if isinstance(event["timestamp"], datetime)
                    else str(event["timestamp"])
                )

        return {
            "success": True,
            "data": {
                "summary": {
                    "failed_logins": failed_count,
                    "successful_logins": success_count,
                    "active_sessions": active_sessions,
                    "suspicious_ips": suspicious_ips,
                    "time_range_hours": hours,
                },
                "recent_events": recent_events,
            },
        }
    except Exception as e:
        logger.error(f"Error getting security summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve security summary: {str(e)}",
        )
