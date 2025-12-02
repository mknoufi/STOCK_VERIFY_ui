"""
Metrics API
Prometheus-compatible metrics endpoint
"""

from fastapi import APIRouter, Response

metrics_router = APIRouter(prefix="/metrics", tags=["metrics"])

# Global monitoring service reference (will be set from server.py)
_monitoring_service = None


def set_monitoring_service(service):
    """Set the monitoring service instance"""
    global _monitoring_service
    _monitoring_service = service


@metrics_router.get("", response_model=None)
async def get_prometheus_metrics():
    """
    Get metrics in Prometheus text format
    This endpoint can be scraped by Prometheus for monitoring
    """
    if _monitoring_service is None:
        # No monitoring service available
        return Response(
            content="# No monitoring service available\n",
            media_type="text/plain; version=0.0.4",
        )

    metrics_text = _monitoring_service.get_prometheus_metrics()

    return Response(content=metrics_text, media_type="text/plain; version=0.0.4")


@metrics_router.get("/json")
async def get_metrics_json():
    """Get metrics in JSON format for dashboards"""
    if _monitoring_service is None:
        return {
            "success": False,
            "error": {
                "message": "Monitoring service not available",
                "code": "SERVICE_UNAVAILABLE",
            },
        }

    metrics = _monitoring_service.get_metrics()

    return {"success": True, "data": metrics}


@metrics_router.get("/health")
async def get_health_metrics():
    """Get health status metrics with database status"""
    from server import db, sql_connector

    health_data = {
        "status": "healthy",
        "uptime": 0,
        "mongodb": {"status": "unknown"},
        "dependencies": {"sql_server": {"status": "unknown"}},
    }

    # Get monitoring service health if available
    if _monitoring_service is not None:
        monitoring_health = _monitoring_service.get_health()
        health_data.update(monitoring_health)

    # Check MongoDB
    try:
        await db.command("ping")
        health_data["mongodb"] = {"status": "connected"}
    except Exception as e:
        health_data["mongodb"] = {"status": "disconnected", "error": str(e)}
        health_data["status"] = "degraded"

    # Check SQL Server
    try:
        sql_connected = sql_connector.test_connection()
        health_data["dependencies"]["sql_server"] = {
            "status": "healthy" if sql_connected else "unhealthy",
            "connection": "active" if sql_connected else "failed",
        }
        if not sql_connected:
            health_data["status"] = "degraded"
    except Exception as e:
        health_data["dependencies"]["sql_server"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health_data["status"] = "degraded"

    return {"success": True, "data": health_data}


@metrics_router.get("/stats")
async def get_metrics_stats():
    """Get system statistics and metrics"""
    from server import db, sql_connector
    import time
    import psutil

    stats = {
        "timestamp": time.time(),
        "system": {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage("/").percent,
        },
        "mongodb": {"status": "unknown"},
        "sql_server": {"status": "unknown"},
        "services": {},
    }

    # Check MongoDB
    try:
        await db.command("ping")
        stats["mongodb"] = {"status": "connected", "database": db.name}
    except Exception as e:
        stats["mongodb"] = {"status": "disconnected", "error": str(e)}

    # Check SQL Server
    try:
        sql_connected = sql_connector.test_connection()
        stats["sql_server"] = {
            "status": "connected" if sql_connected else "disconnected",
            "connection": "active" if sql_connected else "inactive",
        }
    except Exception as e:
        stats["sql_server"] = {"status": "disconnected", "error": str(e)}

    # Get monitoring service stats if available
    if _monitoring_service is not None:
        try:
            monitoring_stats = _monitoring_service.get_stats()
            stats["services"] = monitoring_stats
        except Exception as e:
            stats["services"] = {"error": str(e)}

    return {"success": True, "data": stats}
