"""
API v2 Metrics Endpoints
Connection pool and system metrics monitoring
"""

from typing import Any, Dict, cast

from fastapi import APIRouter, Depends

from backend.api.response_models import ApiResponse
from backend.auth.dependencies import get_current_user_async as get_current_user

router = APIRouter()


@router.get("/pool", response_model=ApiResponse[Dict[str, Any]])
async def get_connection_pool_metrics(current_user: dict = Depends(get_current_user)):
    """
    Get connection pool metrics for monitoring
    Requires authentication
    """
    try:
        from backend.server import connection_pool

        if not connection_pool:
            return cast(
                ApiResponse[Dict[str, Any]],
                ApiResponse.error_response(
                    error_code="POOL_NOT_INITIALIZED",
                    error_message="Connection pool is not initialized",
                ),
            )

        # Get stats from pool
        stats = connection_pool.get_stats()

        # If enhanced pool, also get health check
        if hasattr(connection_pool, "check_health"):
            health = connection_pool.check_health()
            stats["health"] = health

        return cast(
            ApiResponse[Dict[str, Any]],
            ApiResponse.success_response(
                data=stats,
                message="Connection pool metrics retrieved successfully",
            ),
        )

    except Exception as e:
        return cast(
            ApiResponse[Dict[str, Any]],
            ApiResponse.error_response(
                error_code="METRICS_ERROR",
                error_message=f"Failed to get connection pool metrics: {str(e)}",
            ),
        )


@router.get("/system", response_model=ApiResponse[Dict[str, Any]])
async def get_system_metrics(current_user: dict = Depends(get_current_user)):
    """
    Get system-wide metrics
    Requires authentication
    """
    try:
        from backend.server import (
            cache_service,
            database_health_service,
            monitoring_service,
            rate_limiter,
        )

        metrics: Dict[str, Any] = {
            "timestamp": None,
            "services": {},
        }

        # Collect metrics
        metrics["monitoring"] = _get_monitoring_metrics(monitoring_service)
        metrics["services"]["cache"] = _get_cache_metrics(cache_service)
        metrics["services"]["rate_limiter"] = _get_rate_limiter_metrics(rate_limiter)
        metrics["services"]["mongodb"] = await _get_mongo_health(database_health_service)

        from datetime import datetime

        metrics["timestamp"] = datetime.utcnow().isoformat()

        return cast(
            ApiResponse[Dict[str, Any]],
            ApiResponse.success_response(
                data=metrics,
                message="System metrics retrieved successfully",
            ),
        )

    except Exception as e:
        return cast(
            ApiResponse[Dict[str, Any]],
            ApiResponse.error_response(
                error_code="SYSTEM_METRICS_ERROR",
                error_message=f"Failed to get system metrics: {str(e)}",
            ),
        )


def _get_monitoring_metrics(monitoring_service: Any) -> Dict[str, Any]:
    if hasattr(monitoring_service, "get_metrics"):
        try:
            return cast(Dict[str, Any], monitoring_service.get_metrics())
        except Exception as e:
            return {"error": str(e)}
    return {}


def _get_cache_metrics(cache_service: Any) -> Dict[str, Any]:
    if hasattr(cache_service, "get_status"):
        try:
            return cast(Dict[str, Any], cache_service.get_status())
        except Exception as e:
            return {"error": str(e)}
    return {}


def _get_rate_limiter_metrics(rate_limiter: Any) -> Dict[str, Any]:
    if hasattr(rate_limiter, "get_stats"):
        try:
            return cast(Dict[str, Any], rate_limiter.get_stats())
        except Exception as e:
            return {"error": str(e)}
    return {}


async def _get_mongo_health(database_health_service: Any) -> Dict[str, Any]:
    try:
        return cast(Dict[str, Any], await database_health_service.check_mongo_health())
    except Exception as e:
        return {"error": str(e)}
