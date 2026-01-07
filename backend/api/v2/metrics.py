"""
API v2 Metrics Endpoints
Connection pool and system metrics monitoring
"""

from typing import Any

from fastapi import APIRouter, Depends

from backend.api.response_models import ApiResponse
from backend.auth.dependencies import get_current_user_async as get_current_user

router = APIRouter()


@router.get("/pool", response_model=ApiResponse[dict[str, Any]])
async def get_connection_pool_metrics(current_user: dict = Depends(get_current_user)):
    """
    Get connection pool metrics for monitoring
    Requires authentication
    """
    try:
        from backend.server import connection_pool

        if not connection_pool:
            return ApiResponse.error_response(
                error_code="POOL_NOT_INITIALIZED",
                error_message="Connection pool is not initialized",
            )

        # Get stats from pool
        stats = connection_pool.get_stats()

        # If enhanced pool, also get health check
        if hasattr(connection_pool, "check_health"):
            health = connection_pool.check_health()
            stats["health"] = health

        return ApiResponse.success_response(
            data=stats,
            message="Connection pool metrics retrieved successfully",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="METRICS_ERROR",
            error_message=f"Failed to get connection pool metrics: {str(e)}",
        )


def _safe_get_metrics(obj: Any, method_name: str, fallback_name: str) -> dict[str, Any]:
    """Safely call a metrics method on an object."""
    if not hasattr(obj, method_name):
        return {}
    try:
        return getattr(obj, method_name)()
    except Exception as e:
        return {"error": str(e)}


@router.get("/system", response_model=ApiResponse[dict[str, Any]])
async def get_system_metrics(current_user: dict = Depends(get_current_user)):
    """
    Get system-wide metrics
    Requires authentication
    """
    try:
        from datetime import datetime

        from backend.server import (
            cache_service,
            database_health_service,
            monitoring_service,
            rate_limiter,
        )

        metrics: dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "services": {},
        }

        metrics["monitoring"] = _safe_get_metrics(
            monitoring_service, "get_metrics", "monitoring"
        )
        metrics["services"]["cache"] = _safe_get_metrics(
            cache_service, "get_status", "cache"
        )
        metrics["services"]["rate_limiter"] = _safe_get_metrics(
            rate_limiter, "get_stats", "rate_limiter"
        )
        metrics["services"]["mongodb"] = _safe_get_metrics(
            database_health_service, "check_mongodb_health", "mongodb"
        )

        return ApiResponse.success_response(
            data=metrics,
            message="System metrics retrieved successfully",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="SYSTEM_METRICS_ERROR",
            error_message=f"Failed to get system metrics: {str(e)}",
        )
