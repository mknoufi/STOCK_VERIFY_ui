"""
Service Logs API - Real-time log viewing for all services
"""

import logging
import os
import platform
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

try:
    from backend.auth.jwt import get_current_user
except ImportError:
    try:
        from auth.jwt import get_current_user
    except ImportError:

        def get_current_user():
            return {"role": "admin", "username": "admin"}


logger = logging.getLogger(__name__)

service_logs_router = APIRouter(prefix="/api/admin/logs", tags=["Service Logs"])


def require_admin(current_user: dict = Depends(get_current_user)):
    """Require admin role"""
    if isinstance(current_user, dict):
        user_role = current_user.get("role")
    else:
        user_role = getattr(current_user, "role", None)

    if user_role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return (
        current_user if isinstance(current_user, dict) else {"role": "admin", "username": "admin"}
    )


def _detect_log_level(line: str) -> str:
    """Detect log level from a log line."""
    line_lower = line.lower()
    if "error" in line_lower:
        return "ERROR"
    if "warn" in line_lower:
        return "WARN"
    if "debug" in line_lower:
        return "DEBUG"
    return "INFO"


def _parse_log_file(
    log_file: Path,
    lines: int,
    level: Optional[str] = None,
) -> list[dict]:
    """Parse a log file and return structured log entries."""
    logs: list[dict[str, Any]] = []
    if not log_file.exists():
        return logs

    with open(log_file, encoding="utf-8", errors="ignore") as f:
        all_lines = f.readlines()
        recent_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines

    for line in recent_lines:
        line = line.strip()
        if not line:
            continue

        log_level = _detect_log_level(line)
        if level and log_level != level:
            continue

        logs.append(
            {
                "timestamp": datetime.now().isoformat(),
                "level": log_level,
                "message": line,
            }
        )
    return logs


def _find_log_file(*candidates: Path) -> Optional[Path]:
    """Find the first existing log file from candidates."""
    for path in candidates:
        if path.exists():
            return path
    return None


@service_logs_router.get("/backend")
async def get_backend_logs(
    lines: int = Query(100, ge=1, le=1000),
    level: Optional[str] = Query(None, regex="^(INFO|WARN|ERROR|DEBUG)$"),
    current_user: dict = Depends(require_admin),
):
    """Get backend server logs"""
    try:
        base_dir = Path(__file__).parent.parent.parent
        log_file = _find_log_file(
            base_dir / "logs" / "backend.log",
            base_dir / "backend.log",
        )

        if log_file:
            logs = _parse_log_file(log_file, lines, level)
        else:
            logs = [
                {
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "message": "Log file not found. Logs may be in console output.",
                }
            ]

        return {
            "success": True,
            "data": {"logs": logs, "count": len(logs), "service": "backend"},
        }
    except Exception as e:
        logger.error(f"Error getting backend logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get backend logs: {str(e)}",
        )


@service_logs_router.get("/frontend")
async def get_frontend_logs(
    lines: int = Query(100, ge=1, le=1000),
    level: Optional[str] = Query(None, regex="^(INFO|WARN|ERROR|DEBUG)$"),
    current_user: dict = Depends(require_admin),
):
    """Get frontend/Expo logs"""
    try:
        # Expo logs are typically in console, try to get from Metro bundler
        logs = [
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": "Frontend logs are available in the Expo/Metro console. Check the terminal running 'expo start'.",
            }
        ]

        return {
            "success": True,
            "data": {
                "logs": logs,
                "count": len(logs),
                "service": "frontend",
            },
        }
    except Exception as e:
        logger.error(f"Error getting frontend logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get frontend logs: {str(e)}",
        )


@service_logs_router.get("/mongodb")
async def get_mongodb_logs(
    lines: int = Query(100, ge=1, le=1000),
    level: Optional[str] = Query(None, regex="^(INFO|WARN|ERROR|DEBUG)$"),
    current_user: dict = Depends(require_admin),
):
    """Get MongoDB logs"""
    try:
        if platform.system() == "Windows":
            log_paths = [
                Path("C:/Program Files/MongoDB/Server/*/log/mongod.log"),
                Path(os.getenv("LOCALAPPDATA", "")) / "MongoDB" / "log" / "mongod.log",
            ]
        else:
            log_paths = [
                Path("/var/log/mongodb/mongod.log"),
                Path("/usr/local/var/log/mongodb/mongod.log"),
                Path.home() / ".mongodb" / "log" / "mongod.log",
            ]

        log_file = _find_log_file(*log_paths)
        if log_file:
            logs = _parse_log_file(log_file, lines, level)
        else:
            logs = [
                {
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "message": "MongoDB log file not found in standard locations.",
                }
            ]

        return {
            "success": True,
            "data": {
                "logs": logs,
                "count": len(logs),
                "service": "mongodb",
            },
        }
    except Exception as e:
        logger.error(f"Error getting MongoDB logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get MongoDB logs: {str(e)}",
        )


@service_logs_router.get("/system")
async def get_system_logs(
    lines: int = Query(100, ge=1, le=1000),
    level: Optional[str] = Query(None, regex="^(INFO|WARN|ERROR|DEBUG)$"),
    current_user: dict = Depends(require_admin),
):
    """Get system/application logs"""
    try:
        base_dir = Path(__file__).parent.parent.parent
        log_file = _find_log_file(
            base_dir / "logs" / "app.log",
            base_dir / "app.log",
        )

        logs = _parse_log_file(log_file, lines, level) if log_file else []

        return {
            "success": True,
            "data": {"logs": logs, "count": len(logs), "service": "system"},
        }
    except Exception as e:
        logger.error(f"Error getting system logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system logs: {str(e)}",
        )


@service_logs_router.post("/clear")
async def clear_logs(
    service: str = Query(..., regex="^(backend|frontend|mongodb|system|all)$"),
    current_user: dict = Depends(require_admin),
):
    """Clear logs for a service"""
    try:
        cleared = []

        if service in ["backend", "all"]:
            log_file = Path(__file__).parent.parent.parent / "logs" / "backend.log"
            if log_file.exists():
                log_file.unlink()
                cleared.append("backend")

        if service in ["system", "all"]:
            log_file = Path(__file__).parent.parent.parent / "logs" / "app.log"
            if log_file.exists():
                log_file.unlink()
                cleared.append("system")

        return {
            "success": True,
            "message": f"Cleared logs for: {', '.join(cleared) if cleared else 'no log files found'}",
            "cleared": cleared,
        }
    except Exception as e:
        logger.error(f"Error clearing logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear logs: {str(e)}",
        )
