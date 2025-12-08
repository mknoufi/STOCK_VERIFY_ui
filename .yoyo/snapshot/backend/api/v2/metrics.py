"""
API v2 Metrics Endpoints
Connection pool and system metrics monitoring
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any

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
            return ApiResponse.error_response(
                error_code="POOL_NOT_INITIALIZED",
                error_message="Connection pool is not initialized",
            )

        # Get stats from pool
        stats = connection_pool.get_stats()

        # If enhanced pool, also get health check
        if hasattr(connection_pool, 'check_health'):
            health = connection_pool.check_health()
            stats['health'] = health

        return ApiResponse.success_response(
            data=stats,
            message="Connection pool metrics retrieved successfully",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="METRICS_ERROR",
            error_message=f"Failed to get connection pool metrics: {str(e)}",
        )


@router.get("/system", response_model=ApiResponse[Dict[str, Any]])
async def get_system_metrics(current_user: dict = Depends(get_current_user)):
    """
    Get system-wide metrics
    Requires authentication
    """
    try:
        from backend.server import (
            monitoring_service,
            cache_service,
            rate_limiter,
            database_health_service,
        )

        metrics: Dict[str, Any] = {
            "timestamp": None,
            "services": {},
        }

        # Monitoring service metrics
        if hasattr(monitoring_service, 'get_metrics'):
            try:
                monitoring_metrics = monitoring_service.get_metrics()
                metrics["monitoring"] = monitoring_metrics
            except Exception as e:
                metrics["monitoring"] = {"error": str(e)}

        # Cache service metrics
        if hasattr(cache_service, 'get_status'):
            try:
                cache_status = cache_service.get_status()
                metrics["services"]["cache"] = cache_status
            except Exception as e:
                metrics["services"]["cache"] = {"error": str(e)}

        # Rate limiter metrics
        if hasattr(rate_limiter, 'get_stats'):
            try:
                rate_limiter_stats = rate_limiter.get_stats()
                metrics["services"]["rate_limiter"] = rate_limiter_stats
            except Exception as e:
                metrics["services"]["rate_limiter"] = {"error": str(e)}

        # Database health
        try:
            mongo_health = database_health_service.check_mongodb_health()
            metrics["services"]["mongodb"] = mongo_health
        except Exception as e:
            metrics["services"]["mongodb"] = {"error": str(e)}

        from datetime import datetime
        metrics["timestamp"] = datetime.utcnow().isoformat()

        return ApiResponse.success_response(
            data=metrics,
            message="System metrics retrieved successfully",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="SYSTEM_METRICS_ERROR",
            error_message=f"Failed to get system metrics: {str(e)}",
        )
