"""
Error Reporting and Admin Dashboard API
Handles error logging, monitoring, and admin notifications
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.auth import get_current_user
from backend.db.runtime import get_db

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Configure logging
logger = logging.getLogger(__name__)


class ErrorReport(BaseModel):
    """Error report model"""

    type: str  # NetworkError, ValidationError, AuthenticationError, etc.
    message: str
    severity: str  # low, medium, high, critical
    context: Optional[dict] = None
    user_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class ErrorLogEntry(BaseModel):
    """Error log entry model"""

    id: str
    type: str
    severity: str
    message: str
    affected_users: int
    timestamp: datetime
    context: dict
    status: str  # new, acknowledged, resolved


class ErrorStatistics(BaseModel):
    """Error statistics model"""

    total_errors: int
    critical_errors: int
    high_errors: int
    medium_errors: int
    low_errors: int
    affected_users: int
    resolution_rate: float


class ErrorDashboard(BaseModel):
    """Complete error dashboard"""

    errors: list[ErrorLogEntry]
    statistics: ErrorStatistics
    recent_errors: list[ErrorLogEntry]
    error_trends: dict


# In-memory error storage (use MongoDB in production)
error_store: dict[str, Any] = {
    "errors": [],
    "stats": {
        "total": 0,
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
        "affected_users": set(),
    },
}


@router.post("/errors/report")
async def report_error(
    error: ErrorReport, current_user: dict = Depends(get_current_user)
) -> JSONResponse:
    """
    Report an error from frontend

    - **type**: Error type (NetworkError, ValidationError, etc.)
    - **message**: Human-readable error message
    - **severity**: low, medium, high, critical
    - **context**: Additional context (endpoint, method, etc.)
    """
    try:
        # Add timestamp if not provided
        if not error.timestamp:
            error.timestamp = datetime.utcnow()

        # Add user ID if available
        if current_user and isinstance(current_user, dict) and "id" in current_user:
            error.user_id = current_user["id"]

        # Log to system
        logger.error(
            f"Error reported: {error.type}",
            extra={
                "error_message": error.message,
                "severity": error.severity,
                "context": error.context,
                "user_id": error.user_id,
            },
        )

        # Store error
        error_entry = {
            "id": f"error_{len(error_store['errors']) + 1}",
            "type": error.type,
            "severity": error.severity,
            "message": error.message,
            "context": error.context if error.context is not None else {},
            "user_id": error.user_id,
            "timestamp": error.timestamp.isoformat(),
            "status": "new",
        }
        error_store["errors"].append(error_entry)

        # Update statistics
        error_store["stats"]["total"] += 1
        error_store["stats"][error.severity.lower()] = (
            error_store["stats"].get(error.severity.lower(), 0) + 1
        )
        if error.user_id:
            error_store["stats"]["affected_users"].add(error.user_id)

        # Check if critical error (should alert admin)
        if error.severity == "critical" and error.context is not None:
            await notify_admin_critical_error(error)

        return JSONResponse(
            {
                "success": True,
                "error_id": error_entry["id"],
                "message": "Error reported successfully",
            }
        )

    except Exception as e:
        logger.error(f"Error reporting failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to report error")


@router.get("/errors")
async def get_errors(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    current_user: dict = Depends(get_current_user),
) -> JSONResponse:
    """
    Get error logs (admin only)

    - **severity**: Filter by severity (critical, high, medium, low)
    - **status**: Filter by status (new, acknowledged, resolved)
    - **limit**: Maximum number of errors to return
    """
    # Check admin role
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        errors = error_store["errors"]

        # Apply filters
        if severity:
            errors = [e for e in errors if e["severity"] == severity]
        if status:
            errors = [e for e in errors if e["status"] == status]

        # Sort by timestamp (newest first)
        errors = sorted(errors, key=lambda x: x["timestamp"], reverse=True)[:limit]

        return JSONResponse({"errors": errors, "count": len(errors)})

    except Exception as e:
        logger.error(f"Failed to fetch errors: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch errors")


@router.get("/errors/dashboard")
async def get_error_dashboard(
    current_user: dict = Depends(get_current_user),
) -> JSONResponse:
    """
    Get complete error dashboard (admin only)
    """
    # Check admin role
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        errors = error_store["errors"]
        stats = error_store["stats"]

        # Get recent errors (last 24 hours)
        now = datetime.utcnow()
        recent = []
        for error in errors:
            error_time = datetime.fromisoformat(error["timestamp"].replace("Z", "+00:00"))
            if now - error_time < timedelta(days=1):
                recent.append(error)

        # Calculate error trends (errors per hour for last 24 hours)
        trends = {}
        for i in range(24):
            hour = (now - timedelta(hours=i)).hour
            trends[f"{hour:02d}:00"] = 0

        for error in errors:
            error_time = datetime.fromisoformat(error["timestamp"].replace("Z", "+00:00"))
            if now - error_time < timedelta(days=1):
                hour = error_time.hour
                trends[f"{hour:02d}:00"] = trends.get(f"{hour:02d}:00", 0) + 1

        # Calculate statistics
        total_errors = stats["total"]
        resolved_count = len([e for e in errors if e["status"] == "resolved"])
        resolution_rate = (resolved_count / total_errors * 100) if total_errors > 0 else 0

        dashboard = {
            "errors": errors[:20],  # Latest 20 errors
            "statistics": {
                "total_errors": total_errors,
                "critical_errors": stats.get("critical", 0),
                "high_errors": stats.get("high", 0),
                "medium_errors": stats.get("medium", 0),
                "low_errors": stats.get("low", 0),
                "affected_users": len(stats["affected_users"]),
                "resolution_rate": round(resolution_rate, 2),
            },
            "recent_errors": recent[-10:],  # Last 10 errors
            "error_trends": trends,
        }

        return JSONResponse(dashboard)

    except Exception as e:
        logger.error(f"Failed to get dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard")


@router.get("/errors/{error_id}")
async def get_error_detail(
    error_id: str, current_user: dict = Depends(get_current_user)
) -> JSONResponse:
    """
    Get detailed error information (admin only)
    """
    # Check admin role
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        error = next((e for e in error_store["errors"] if e["id"] == error_id), None)

        if not error:
            raise HTTPException(status_code=404, detail="Error not found")

        return JSONResponse(error)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get error detail: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get error detail")


@router.patch("/errors/{error_id}/status")
async def update_error_status(
    error_id: str,
    status: str = Query(..., regex="^(new|acknowledged|resolved)$"),
    current_user: dict = Depends(get_current_user),
) -> JSONResponse:
    """
    Update error status (admin only)

    - **status**: new, acknowledged, or resolved
    """
    # Check admin role
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        error = next((e for e in error_store["errors"] if e["id"] == error_id), None)

        if not error:
            raise HTTPException(status_code=404, detail="Error not found")

        old_status = error["status"]
        error["status"] = status

        logger.info(f"Error {error_id} status updated: {old_status} -> {status}")

        return JSONResponse(
            {
                "success": True,
                "message": f"Error status updated to {status}",
                "error": error,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update error status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update error status")


@router.delete("/errors/{error_id}")
async def delete_error(
    error_id: str, current_user: dict = Depends(get_current_user)
) -> JSONResponse:
    """
    Delete error log entry (admin only)
    """
    # Check admin role
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        error_store["errors"] = [e for e in error_store["errors"] if e["id"] != error_id]

        return JSONResponse({"success": True, "message": "Error deleted successfully"})

    except Exception as e:
        logger.error(f"Failed to delete error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete error")


@router.get("/errors/stats/summary")
async def get_error_summary(
    current_user: dict = Depends(get_current_user),
) -> JSONResponse:
    """
    Get error statistics summary (admin only)
    """
    # Check admin role
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        errors = error_store["errors"]

        # Calculate summary
        summary = {
            "total_errors": len(errors),
            "by_severity": {
                "critical": len([e for e in errors if e["severity"] == "critical"]),
                "high": len([e for e in errors if e["severity"] == "high"]),
                "medium": len([e for e in errors if e["severity"] == "medium"]),
                "low": len([e for e in errors if e["severity"] == "low"]),
            },
            "by_status": {
                "new": len([e for e in errors if e["status"] == "new"]),
                "acknowledged": len([e for e in errors if e["status"] == "acknowledged"]),
                "resolved": len([e for e in errors if e["status"] == "resolved"]),
            },
            "by_type": {},
        }

        # Count by error type
        for error in errors:
            error_type = error.get("type", "Unknown")
            summary["by_type"][error_type] = summary["by_type"].get(error_type, 0) + 1

        return JSONResponse(summary)

    except Exception as e:
        logger.error(f"Failed to get error summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get error summary")


async def notify_admin_critical_error(error: ErrorReport):
    """
    Send notification to admins about critical error
    """
    try:
        # Always log at critical level.
        logger.critical(
            f"CRITICAL ERROR: {error.type} - {error.message}",
            extra={"context": error.context},
        )

        # Persist a notification record for admin dashboards (best-effort).
        try:
            db = get_db()
        except RuntimeError:
            return

        context = error.context if error.context is not None else {}
        safe_context = {}
        for key, value in context.items():
            if value is None or isinstance(value, (str, int, float, bool)):
                safe_context[key] = value
            else:
                safe_context[key] = str(value)[:500]

        await db.system_events.insert_one(
            {
                "event_type": "critical_error_reported",
                "source": "frontend",
                "error_type": error.type,
                "message": error.message,
                "severity": error.severity,
                "user_id": error.user_id,
                "timestamp": error.timestamp or datetime.utcnow(),
                "context": safe_context,
            }
        )
    except Exception as e:
        logger.error(f"Failed to notify admin: {str(e)}")
