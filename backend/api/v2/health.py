"""
API v2 Health Endpoints
Enhanced health check endpoints with detailed service status
"""

from datetime import datetime
from typing import Any, Dict, cast

from fastapi import APIRouter, Depends

from backend.api.response_models import ApiResponse, HealthCheckResponse
from backend.auth.dependencies import get_current_user_async as get_current_user

router = APIRouter()


@router.get("/", response_model=ApiResponse[HealthCheckResponse])
async def health_check_v2() -> ApiResponse[HealthCheckResponse]:
    """
    Enhanced health check endpoint
    Returns detailed health status of all services
    """
    try:
        from backend.server import cache_service, connection_pool, database_health_service

        services: Dict[str, Dict[str, Any]] = {}

        # Check services
        services["mongodb"] = await _check_mongo_status(database_health_service)
        services["sql_server"] = _check_sql_status(connection_pool)
        services["cache"] = _check_cache_status(cache_service)

        # Determine overall status
        overall_status = "healthy"
        if any(s.get("status") == "unhealthy" for s in services.values()):
            overall_status = "unhealthy"
        elif any(s.get("status") == "degraded" for s in services.values()):
            overall_status = "degraded"

        health_response = HealthCheckResponse(
            status=overall_status,
            services=services,
            version="2.0.0",
        )

        return cast(
            ApiResponse[HealthCheckResponse],
            ApiResponse.success_response(
                data=health_response,
                message="Health check completed successfully",
            ),
        )

    except Exception as e:
        return cast(
            ApiResponse[HealthCheckResponse],
            ApiResponse.error_response(
                error_code="HEALTH_CHECK_FAILED",
                error_message=f"Health check failed: {str(e)}",
            ),
        )


@router.get("/detailed", response_model=ApiResponse[Dict[str, Any]])
async def detailed_health_check(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[Dict[str, Any]]:
    """
    Detailed health check (requires authentication)
    Returns comprehensive system status including metrics
    """
    try:
        from backend.server import (
            cache_service,
            connection_pool,
            database_health_service,
            monitoring_service,
        )

        health_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "services": {},
            "metrics": {},
        }

        # Collect service health
        health_data["services"]["mongodb"] = await _check_mongo_status(database_health_service)
        health_data["services"]["sql_server_pool"] = _check_sql_pool_stats(connection_pool)
        health_data["services"]["cache"] = _check_cache_status(cache_service)

        # Monitoring metrics
        health_data["metrics"] = _get_monitoring_metrics(monitoring_service)

        return cast(
            ApiResponse[Dict[str, Any]],
            ApiResponse.success_response(
                data=health_data,
                message="Detailed health check completed",
            ),
        )

    except Exception as e:
        return cast(
            ApiResponse[Dict[str, Any]],
            ApiResponse.error_response(
                error_code="DETAILED_HEALTH_CHECK_FAILED",
                error_message=f"Detailed health check failed: {str(e)}",
            ),
        )


async def _check_mongo_status(database_health_service: Any) -> Dict[str, Any]:
    try:
        mongo_status = await database_health_service.check_mongo_health()
        return {
            "status": "healthy" if mongo_status.get("is_running") else "unhealthy",
            "details": mongo_status,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


def _check_sql_status(connection_pool: Any) -> Dict[str, Any]:
    if not connection_pool:
        return {
            "status": "not_configured",
            "message": "SQL Server connection pool not initialized",
        }
    try:
        pool_health = connection_pool.check_health()
        return {
            "status": pool_health.get("status", "unknown"),
            "details": pool_health,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


def _check_cache_status(cache_service: Any) -> Dict[str, Any]:
    try:
        cache_status = (
            cache_service.get_status()
            if hasattr(cache_service, "get_status")
            else {"status": "unknown"}
        )
        return {
            "status": cache_status.get("status", "unknown"),
            "details": cache_status,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


def _check_sql_pool_stats(connection_pool: Any) -> Dict[str, Any]:
    if not connection_pool:
        return {"status": "not_configured"}
    try:
        return cast(Dict[str, Any], connection_pool.get_stats())
    except Exception as e:
        return {"error": str(e)}


def _get_monitoring_metrics(monitoring_service: Any) -> Dict[str, Any]:
    try:
        if hasattr(monitoring_service, "get_metrics"):
            return cast(Dict[str, Any], monitoring_service.get_metrics())
        return {}
    except Exception as e:
        return {"error": str(e)}
