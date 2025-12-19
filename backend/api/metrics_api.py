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
    from server import db

    health_data = {
        "status": "healthy",
        "uptime": 0,
        "mongodb": {"status": "unknown"},
        "dependencies": {"sql_server": {"status": "disabled"}},
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

    return {"success": True, "data": health_data}


@metrics_router.get("/stats")
async def get_metrics_stats():
    """Get system statistics and metrics"""
    import time

    import psutil

    from server import db

    stats = {
        "timestamp": time.time(),
        "system": {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage("/").percent,
        },
        "mongodb": {"status": "unknown"},
        "sql_server": {"status": "disabled"},
        "services": {},
    }

    # Check MongoDB
    try:
        await db.command("ping")
        stats["mongodb"] = {"status": "connected", "database": db.name}
    except Exception as e:
        stats["mongodb"] = {"status": "disconnected", "error": str(e)}

    # Get monitoring service stats if available
    if _monitoring_service is not None:
        try:
            monitoring_stats = _monitoring_service.get_stats()
            stats["services"] = monitoring_stats
        except Exception as e:
            stats["services"] = {"error": str(e)}

    return {"success": True, "data": stats}


@metrics_router.get("/staff-performance")
async def get_staff_performance():
    """Get staff performance metrics"""
    from backend.server import db

    # Aggregate items scanned per user
    pipeline = [
        {
            "$group": {
                "_id": "$scanned_by",
                "items_scanned": {"$sum": 1},
                "last_scan": {"$max": "$timestamp"},
            }
        },
        {"$sort": {"items_scanned": -1}},
    ]

    items_stats = await db.items.aggregate(pipeline).to_list(length=100)

    # Aggregate variances found per user
    variance_pipeline = [
        {"$group": {"_id": "$reported_by", "variances_found": {"$sum": 1}}}
    ]

    variance_stats = await db.variances.aggregate(variance_pipeline).to_list(length=100)
    variance_map = {v["_id"]: v["variances_found"] for v in variance_stats}

    # Combine data
    performance_data = []
    for stat in items_stats:
        user_id = stat["_id"]
        if not user_id:
            continue

        performance_data.append(
            {
                "user": user_id,
                "items_scanned": stat["items_scanned"],
                "variances_found": variance_map.get(user_id, 0),
                "last_active": stat["last_scan"],
            }
        )

    return {"success": True, "data": performance_data}
