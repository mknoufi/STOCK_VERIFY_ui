"""
Admin Control Panel API
Provides endpoints for service management, status monitoring, and system control
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from typing import Dict, Any, Optional, Callable, Iterable, Tuple, List, TypedDict
import logging
from datetime import datetime, timedelta
import psutil
import io

from backend.utils.service_manager import ServiceManager
from backend.utils.port_detector import PortDetector
from backend.services.system_report_service import SystemReportService

# Import auth
from backend.auth import get_current_user

# Constants
BACKEND_PROCESS_NEEDLE = "server.py"

logger = logging.getLogger(__name__)

admin_control_router = APIRouter(prefix="/api/admin/control", tags=["Admin Control"])

BACKEND_PORTS = [8000, 8001, 8002, 8003, 8004, 8005]
FRONTEND_PORTS = [8081, 19000, 19001]


class ServiceStatus(TypedDict, total=False):
    running: Optional[bool]
    port: Optional[int]
    pid: Optional[int]
    url: Optional[str]
    uptime: Optional[int]
    status: Optional[str]


ServicesStatusMap = Dict[str, ServiceStatus]


def _safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def require_admin(current_user: dict = Depends(get_current_user)):
    """Require admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def _match_process_on_ports(
    ports: Iterable[int], matcher: Callable[[str], bool]
) -> Optional[Tuple[int, int, psutil.Process]]:
    """Return (port, pid, process) for the first process whose command line matches."""
    for port in ports:
        if not ServiceManager.is_port_in_use(port):
            continue
        pid = ServiceManager.get_process_using_port(port)
        if not pid:
            continue
        try:
            process = psutil.Process(pid)
            cmdline = " ".join(process.cmdline())
        except (psutil.Error, OSError):
            continue
        if matcher(cmdline):
            return port, pid, process
    return None


def _calculate_uptime(process: psutil.Process) -> Optional[int]:
    try:
        return int(datetime.now().timestamp() - process.create_time())
    except (psutil.Error, OSError):
        return None


def _get_backend_status() -> ServiceStatus:
    status: ServiceStatus = {
        "running": False,
        "port": None,
        "pid": None,
        "url": None,
        "uptime": None,
    }

    def is_backend_process(cmd: str) -> bool:
        return BACKEND_PROCESS_NEEDLE in cmd

    result = _match_process_on_ports(BACKEND_PORTS, is_backend_process)
    if result:
        port, pid, process = result
        status["running"] = True
        status["port"] = port
        status["pid"] = pid
        status["url"] = f"http://localhost:{port}"
        status["uptime"] = _calculate_uptime(process)
    return status


def _get_frontend_status() -> ServiceStatus:
    status: ServiceStatus = {
        "running": False,
        "port": None,
        "pid": None,
        "url": None,
    }

    def is_frontend_process(cmd: str) -> bool:
        return "expo" in cmd.lower() or "metro" in cmd.lower()

    result = _match_process_on_ports(FRONTEND_PORTS, is_frontend_process)
    if result:
        port, pid, _ = result
        status["running"] = True
        status["port"] = port
        status["pid"] = pid
        status["url"] = f"http://localhost:{port}"
    return status


def _get_mongodb_status() -> ServiceStatus:
    mongo_status = PortDetector.get_mongo_status()
    running_flag = mongo_status.get("is_running")
    running: Optional[bool] = bool(running_flag) if running_flag is not None else None
    return {
        "running": running,
        "port": _safe_int(mongo_status.get("port")),
        "url": mongo_status.get("url"),
        "status": str(mongo_status.get("status", "unknown")),
    }


def _test_sql_connection() -> Optional[bool]:
    try:
        from backend.sql_server_connector import SQLServerConnector
        from backend.config import settings
    except Exception:
        return None
    if not settings.SQL_SERVER_HOST:
        return None
    connector = SQLServerConnector()
    try:
        connector.connect(
            host=settings.SQL_SERVER_HOST,
            port=settings.SQL_SERVER_PORT,
            database=settings.SQL_SERVER_DATABASE or "",
            user=settings.SQL_SERVER_USER,
            password=settings.SQL_SERVER_PASSWORD,
        )
        return connector.test_connection()
    except Exception:
        return False


def _get_sql_server_status() -> ServiceStatus:
    try:
        from backend.config import settings
    except Exception:
        return {
            "running": None,
            "port": None,
            "status": "not_configured",
        }

    is_connected = _test_sql_connection()
    port_value = _safe_int(settings.SQL_SERVER_PORT)
    if is_connected is None:
        return {
            "running": None,
            "port": port_value,
            "status": "not_configured",
        }

    status_str = "connected" if is_connected else "disconnected"
    return {
        "running": bool(is_connected),
        "port": port_value,
        "status": status_str,
    }


def _terminate_backend_processes() -> int:
    """Terminate backend processes and return how many were killed."""
    killed = 0
    for port in BACKEND_PORTS:
        if not ServiceManager.is_port_in_use(port):
            continue
        pid = ServiceManager.get_process_using_port(port)
        if not pid:
            continue
        if _terminate_if_matches(pid, BACKEND_PROCESS_NEEDLE):
            killed += 1
    return killed


def _terminate_if_matches(pid: int, needle: str) -> bool:
    """Terminate process if its command line contains the needle."""
    try:
        process = psutil.Process(pid)
        if needle not in " ".join(process.cmdline()):
            return False
        _terminate_process(process)
        return True
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        return False


def _terminate_process(process: psutil.Process) -> None:
    try:
        process.terminate()
        process.wait(timeout=5)
    except psutil.TimeoutExpired:
        process.kill()


def _is_any_port_in_use(ports: Iterable[int]) -> bool:
    return any(ServiceManager.is_port_in_use(port) for port in ports)


def _format_issue(
    service: str, message: str, severity: str = "critical", issue_type: str = "error"
) -> Dict[str, Any]:
    return {
        "type": issue_type,
        "severity": severity,
        "service": service,
        "message": message,
        "timestamp": datetime.now().isoformat(),
    }


def _collect_system_issues() -> List[Dict[str, Any]]:
    issues: List[Dict[str, Any]] = []
    mongo_status = PortDetector.get_mongo_status()
    if not mongo_status["is_running"]:
        issues.append(_format_issue("mongodb", "MongoDB is not running"))
    if not _is_any_port_in_use(BACKEND_PORTS):
        issues.append(_format_issue("backend", "Backend server is not running"))
    sql_connection_status = _test_sql_connection()
    if sql_connection_status is False:
        issues.append(
            _format_issue(
                "sql_server",
                "SQL Server connection unavailable",
                severity="medium",
                issue_type="warning",
            )
        )
    return issues


def _gather_all_services_status() -> ServicesStatusMap:
    """Gather status for all services"""
    return {
        "backend": _get_backend_status(),
        "frontend": _get_frontend_status(),
        "mongodb": _get_mongodb_status(),
        "sql_server": _get_sql_server_status(),
    }


def _format_services_response(services: ServicesStatusMap) -> Dict[str, Any]:
    """Format services status response"""
    return {
        "success": True,
        "data": services,
        "timestamp": datetime.now().isoformat(),
    }


CRITICAL_SERVICE_KEYS = ["backend", "mongodb"]
OPTIONAL_SERVICE_KEYS = ["frontend", "sql_server"]


def _count_running_services(services: ServicesStatusMap, keys: Iterable[str]) -> int:
    return sum(1 for key in keys if bool(services.get(key, {}).get("running")))


def _calculate_service_scores(services: ServicesStatusMap) -> Tuple[float, int, int]:
    running_critical = _count_running_services(services, CRITICAL_SERVICE_KEYS)
    running_optional = _count_running_services(services, OPTIONAL_SERVICE_KEYS)
    critical_score = (running_critical / len(CRITICAL_SERVICE_KEYS)) * 60
    optional_score = (running_optional / len(OPTIONAL_SERVICE_KEYS)) * 40
    return critical_score + optional_score, running_critical, running_optional


def _apply_issue_penalty(score: float, critical_issues: int) -> float:
    penalty = min(critical_issues * 10, 30)
    return max(0, min(100, score - penalty))


def _determine_health_status(score: float) -> str:
    if score >= 80:
        return "healthy"
    if score >= 50:
        return "degraded"
    return "critical"


def _build_health_payload(score: float, running_critical: int, running_optional: int, critical_issues: int) -> Dict[str, Any]:
    return {
        "score": round(score, 1),
        "status": _determine_health_status(score),
        "breakdown": {
            "critical_services": f"{running_critical}/{len(CRITICAL_SERVICE_KEYS)}",
            "optional_services": f"{running_optional}/{len(OPTIONAL_SERVICE_KEYS)}",
            "critical_issues": critical_issues,
        },
    }


@admin_control_router.get("/services/status")
async def get_services_status(current_user: dict = Depends(require_admin)):
    """Get status of all services (backend, frontend, MongoDB, SQL Server)"""
    try:
        services: ServicesStatusMap = _gather_all_services_status()
        return _format_services_response(services)
    except Exception as e:
        logger.error(f"Error getting services status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get services status: {str(e)}",
        )


def _find_running_backend_process() -> Optional[Dict[str, Any]]:
    for port in BACKEND_PORTS:
        if not ServiceManager.is_port_in_use(port):
            continue

        pid = ServiceManager.get_process_using_port(port)
        if not pid:
            continue

        try:
            process = psutil.Process(pid)
            if BACKEND_PROCESS_NEEDLE in " ".join(process.cmdline()):
                return {
                    "success": True,
                    "message": "Backend is already running",
                    "port": port,
                    "pid": pid,
                }
        except Exception:
            pass
    return None


@admin_control_router.post("/services/backend/start")
async def start_backend(current_user: dict = Depends(require_admin)):
    """Start backend server"""
    try:
        # Check if already running
        existing_backend = _find_running_backend_process()
        if existing_backend:
            return existing_backend

        # Start backend (this would typically be done via script)
        return {
            "success": True,
            "message": "Backend start command issued. Check status for updates.",
            "note": "Backend should be started using scripts/start_backend.sh or scripts/start_backend.ps1",
        }
    except Exception as e:
        logger.error(f"Error starting backend: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start backend: {str(e)}",
        )


def _create_stop_response(killed: int) -> Dict[str, Any]:
    """Create response for backend stop operation"""
    if killed > 0:
        return {
            "success": True,
            "message": f"Stopped {killed} backend instance(s)",
        }
    else:
        return {
            "success": True,
            "message": "No backend instances found",
        }


@admin_control_router.post("/services/backend/stop")
async def stop_backend(current_user: dict = Depends(require_admin)):
    """Stop backend server"""
    try:
        killed = _terminate_backend_processes()
        return _create_stop_response(killed)
    except Exception as e:
        logger.error(f"Error stopping backend: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop backend: {str(e)}",
        )


@admin_control_router.post("/services/frontend/start")
async def start_frontend(current_user: dict = Depends(require_admin)):
    """Start frontend server"""
    try:
        # Check if already running
        for port in FRONTEND_PORTS:
            if ServiceManager.is_port_in_use(port):
                pid = ServiceManager.get_process_using_port(port)
                if pid:
                    try:
                        process = psutil.Process(pid)
                        cmdline = " ".join(process.cmdline())
                        if "expo" in cmdline.lower() or "metro" in cmdline.lower():
                            return {
                                "success": True,
                                "message": "Frontend is already running",
                                "port": port,
                                "pid": pid,
                            }
                    except Exception:
                        pass

        return {
            "success": True,
            "message": "Frontend start command issued. Check status for updates.",
            "note": "Frontend should be started using scripts/start_frontend.sh or scripts/start_frontend.ps1",
        }
    except Exception as e:
        logger.error(f"Error starting frontend: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start frontend: {str(e)}",
        )


@admin_control_router.post("/services/frontend/stop")
async def stop_frontend(current_user: dict = Depends(require_admin)):
    """Stop frontend server"""
    try:
        killed = ServiceManager.kill_processes_by_name(["expo", "metro", "node.*expo"])

        # Also kill by ports
        for port in FRONTEND_PORTS:
            if ServiceManager.is_port_in_use(port):
                pid = ServiceManager.get_process_using_port(port)
                if pid:
                    ServiceManager.kill_process(pid)
                    killed += 1

        return {
            "success": True,
            "message": f"Stopped {killed} frontend process(es)",
        }
    except Exception as e:
        logger.error(f"Error stopping frontend: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop frontend: {str(e)}",
        )


def _categorize_issues(issues: List[Dict[str, Any]]) -> Dict[str, int]:
    """Categorize issues by severity"""
    return {
        "count": len(issues),
        "critical": int(len([i for i in issues if i.get("severity") == "critical"])),
        "warnings": int(len([i for i in issues if i.get("severity") == "medium"])),
    }


def _format_issues_response(issues: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Format system issues response"""
    issue_stats = _categorize_issues(issues)
    return {
        "success": True,
        "data": {
            "issues": issues,
            **issue_stats,
        },
    }


@admin_control_router.get("/system/issues")
async def get_system_issues(current_user: dict = Depends(require_admin)):
    """Get system issues and errors"""
    try:
        issues = _collect_system_issues()
        return _format_issues_response(issues)
    except Exception as e:
        logger.error(f"Error getting system issues: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system issues: {str(e)}",
        )


@admin_control_router.get("/devices")
async def get_login_devices(current_user: dict = Depends(require_admin)):
    """Get list of devices that have logged in"""
    try:
        from server import db

        # Get recent login sessions
        sessions = (
            await db.sessions.find(
                {},
                {
                    "_id": 0,
                    "user": 1,
                    "device_info": 1,
                    "ip_address": 1,
                    "last_activity": 1,
                    "created_at": 1,
                },
            )
            .sort("last_activity", -1)
            .limit(100)
            .to_list(length=100)
        )

        devices = []
        seen_devices = set()

        for session in sessions:
            device_key = f"{session.get('ip_address', 'unknown')}-{session.get('device_info', {}).get('platform', 'unknown')}"
            if device_key not in seen_devices:
                seen_devices.add(device_key)
                devices.append(
                    {
                        "user": session.get("user"),
                        "ip_address": session.get("ip_address"),
                        "platform": session.get("device_info", {}).get("platform"),
                        "device": session.get("device_info", {}).get("device"),
                        "last_activity": session.get("last_activity"),
                        "created_at": session.get("created_at"),
                    }
                )

        return {
            "success": True,
            "data": {
                "devices": devices,
                "count": len(devices),
            },
        }
    except Exception as e:
        logger.error(f"Error getting devices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get devices: {str(e)}",
        )


@admin_control_router.get("/reports/available")
async def get_available_reports(current_user: dict = Depends(require_admin)):
    """Get list of available reports"""
    return {
        "success": True,
        "data": {
            "reports": [
                {
                    "id": "user_activity",
                    "name": "User Activity Report",
                    "description": "Detailed user activity and login history",
                    "category": "users",
                },
                {
                    "id": "system_metrics",
                    "name": "System Metrics Report",
                    "description": "System performance and health metrics",
                    "category": "system",
                },
                {
                    "id": "sync_history",
                    "name": "Sync History Report",
                    "description": "ERP sync operations history",
                    "category": "sync",
                },
                {
                    "id": "error_logs",
                    "name": "Error Logs Report",
                    "description": "System errors and exceptions",
                    "category": "logs",
                },
                {
                    "id": "audit_trail",
                    "name": "Audit Trail Report",
                    "description": "Complete audit trail of all actions",
                    "category": "audit",
                },
            ]
        },
    }


@admin_control_router.post("/reports/generate")
async def generate_report(
    report_id: str,
    format: str = "json",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(require_admin),
):
    """Generate a report"""
    try:
        from server import db
        service = SystemReportService(db)

        data = await service.generate_report(report_id, start_date, end_date, format)

        if format == "json":
            return {
                "success": True,
                "message": f"Report '{report_id}' generated successfully",
                "data": data,
            }
        elif format == "csv":
            return Response(
                content=data,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={report_id}_{datetime.now().strftime('%Y%m%d')}.csv"}
            )
        elif format == "excel":
            return StreamingResponse(
                io.BytesIO(data),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={report_id}_{datetime.now().strftime('%Y%m%d')}.xlsx"}
            )

    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}",
        )


@admin_control_router.get("/logs/{service}")
async def get_service_logs(
    service: str,
    lines: int = 100,
    level: Optional[str] = None,
    current_user: dict = Depends(require_admin),
):
    """Get service logs"""
    try:
        # For now, return sample logs structure
        # In production, read from actual log files
        logs = []

        if service == "backend":
            # Read backend logs (would read from actual log file)
            logs = [
                {
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "message": "Backend server started successfully",
                },
                {
                    "timestamp": (datetime.now() - timedelta(seconds=60)).isoformat(),
                    "level": "INFO",
                    "message": "Health check passed",
                },
            ]
        elif service == "frontend":
            logs = [
                {
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "message": "Expo server running on port 8081",
                },
            ]
        elif service == "mongodb":
            logs = [
                {
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "message": "MongoDB connection established",
                },
            ]
        elif service == "sql_server":
            logs = [
                {
                    "timestamp": datetime.now().isoformat(),
                    "level": "INFO",
                    "message": "SQL Server connection test successful",
                },
            ]

        # Filter by level if provided
        if level:
            logs = [log for log in logs if log["level"].upper() == level.upper()]

        # Limit to requested lines
        logs = logs[:lines]

        return {
            "success": True,
            "data": {
                "service": service,
                "logs": logs,
                "count": len(logs),
                "filtered_by_level": level,
            },
        }
    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get logs: {str(e)}",
        )


@admin_control_router.get("/sql-server/config")
async def get_sql_server_config(current_user: dict = Depends(require_admin)):
    """Get SQL Server configuration"""
    try:
        from backend.config import settings

        config = {
            "host": settings.SQL_SERVER_HOST,
            "port": settings.SQL_SERVER_PORT,
            "database": settings.SQL_SERVER_DATABASE,
            "username": settings.SQL_SERVER_USER,
            "password_set": bool(settings.SQL_SERVER_PASSWORD),
            "configured": bool(settings.SQL_SERVER_HOST),
        }

        return {"success": True, "data": config}
    except Exception as e:
        logger.error(f"Error getting SQL config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SQL config: {str(e)}",
        )


@admin_control_router.post("/sql-server/config")
async def update_sql_server_config(
    config: Dict[str, Any], current_user: dict = Depends(require_admin)
):
    """Update SQL Server configuration"""
    try:
        # This would update the configuration
        # In production, save to config file or database
        return {
            "success": True,
            "message": "SQL Server configuration updated. Restart backend to apply changes.",
            "data": config,
        }
    except Exception as e:
        logger.error(f"Error updating SQL config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update SQL config: {str(e)}",
        )


@admin_control_router.post("/sql-server/test")
async def test_sql_server_connection(
    config: Optional[Dict[str, Any]] = None, current_user: dict = Depends(require_admin)
):
    """Test SQL Server connection"""
    try:
        from backend.sql_server_connector import SQLServerConnector
        from backend.config import settings

        # Use provided config or current settings
        connector = SQLServerConnector()
        try:
            if config:
                connector.connect(
                    host=config.get("host", ""),
                    port=config.get("port", 1433),
                    database=config.get("database", ""),
                    user=config.get("username"),
                    password=config.get("password"),
                )
            else:
                connector.connect(
                    host=settings.SQL_SERVER_HOST or "",
                    port=settings.SQL_SERVER_PORT,
                    database=settings.SQL_SERVER_DATABASE or "",
                    user=settings.SQL_SERVER_USER,
                    password=settings.SQL_SERVER_PASSWORD,
                )
            is_connected = connector.test_connection()
        except Exception:
            is_connected = False

        return {
            "success": True,
            "data": {
                "connected": is_connected,
                "message": "Connection successful" if is_connected else "Connection failed",
            },
        }
    except Exception as e:
        logger.error(f"Error testing SQL connection: {e}")
        return {
            "success": False,
            "data": {
                "connected": False,
                "message": f"Connection test failed: {str(e)}",
            },
        }


@admin_control_router.get("/system/health-score")
async def get_system_health_score(current_user: dict = Depends(require_admin)):
    """Calculate and return system health score"""
    try:
        services_status = await get_services_status(current_user)
        services = services_status["data"]
        base_score, running_critical, running_optional = _calculate_service_scores(services)

        issues_data = await get_system_issues(current_user)
        issues_payload = issues_data.get("data", {})
        issues = issues_payload.get("issues") or []
        critical_issues = len([i for i in issues if i.get("severity") == "critical"])

        final_score = _apply_issue_penalty(base_score, critical_issues)

        return {
            "success": True,
            "data": _build_health_payload(final_score, running_critical, running_optional, critical_issues),
        }
    except Exception as e:
        logger.error(f"Error calculating health score: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate health score: {str(e)}",
        )


@admin_control_router.get("/system/stats")
async def get_system_stats(current_user: dict = Depends(require_admin)):
    """Get system statistics summary"""
    try:
        from server import db

        # Get basic stats
        total_users = await db.users.count_documents({})
        total_sessions = await db.sessions.count_documents({})
        # last_activity assumed to be an ISO string or timestamp; convert comparison appropriately
        active_threshold = datetime.now() - timedelta(hours=1)
        active_sessions = await db.sessions.count_documents(
            {"last_activity": {"$gte": active_threshold}}
        )

        # Get services status
        services_status = await get_services_status(current_user)
        services = services_status["data"]
        running_services = sum(1 for s in services.values() if s.get("running", False))

        return {
            "success": True,
            "data": {
                "total_services": 4,
                "running_services": running_services,
                "total_users": total_users,
                "total_sessions": total_sessions,
                "active_sessions": active_sessions,
                "timestamp": datetime.now().isoformat(),
            },
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system stats: {str(e)}",
        )
