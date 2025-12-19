"""
API v2 Connection Status Endpoints
Monitor and manage database connections
"""

from typing import Any

from fastapi import APIRouter, Depends

from backend.api.response_models import ApiResponse, ConnectionPoolStatusResponse
from backend.auth.dependencies import get_current_user_async as get_current_user

router = APIRouter()


@router.get("/pool/status", response_model=ApiResponse[ConnectionPoolStatusResponse])
async def get_connection_pool_status(current_user: dict = Depends(get_current_user)):
    """
    Get connection pool status and metrics
    Requires authentication
    """
    try:
        from backend.server import connection_pool

        if not connection_pool:
            return ApiResponse.error_response(
                error_code="POOL_NOT_INITIALIZED",
                error_message="Connection pool is not initialized",
            )

        pool_health = connection_pool.check_health()

        status_response = ConnectionPoolStatusResponse(
            status=pool_health.get("status", "unknown"),
            pool_size=pool_health.get("pool_size", 0),
            created=pool_health.get("created", 0),
            available=pool_health.get("available", 0),
            checked_out=pool_health.get("checked_out", 0),
            utilization=pool_health.get("utilization", 0.0),
            metrics=pool_health.get("metrics", {}),
            health_check=pool_health.get("connection_test"),
        )

        return ApiResponse.success_response(
            data=status_response,
            message="Connection pool status retrieved successfully",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="POOL_STATUS_ERROR",
            error_message=f"Failed to get pool status: {str(e)}",
        )


@router.get("/pool/stats", response_model=ApiResponse[dict[str, Any]])
async def get_connection_pool_stats(current_user: dict = Depends(get_current_user)):
    """
    Get detailed connection pool statistics
    Requires authentication
    """
    try:
        from backend.server import connection_pool

        if not connection_pool:
            return ApiResponse.error_response(
                error_code="POOL_NOT_INITIALIZED",
                error_message="Connection pool is not initialized",
            )

        stats = connection_pool.get_stats()

        return ApiResponse.success_response(
            data=stats,
            message="Connection pool statistics retrieved successfully",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="POOL_STATS_ERROR",
            error_message=f"Failed to get pool statistics: {str(e)}",
        )


@router.post("/pool/health-check", response_model=ApiResponse[dict[str, Any]])
async def trigger_health_check(current_user: dict = Depends(get_current_user)):
    """
    Manually trigger a connection pool health check
    Requires authentication
    """
    try:
        from backend.server import connection_pool

        if not connection_pool:
            return ApiResponse.error_response(
                error_code="POOL_NOT_INITIALIZED",
                error_message="Connection pool is not initialized",
            )

        health_result = connection_pool.check_health()

        return ApiResponse.success_response(
            data=health_result,
            message="Health check completed",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="HEALTH_CHECK_ERROR",
            error_message=f"Health check failed: {str(e)}",
        )
