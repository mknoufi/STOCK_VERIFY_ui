"""
API v2 Health Endpoints
Enhanced health check endpoints with detailed service status
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends

from backend.api.response_models import ApiResponse, HealthCheckResponse
from backend.auth.dependencies import get_current_user_async as get_current_user

router = APIRouter()


def _safe_service_check(obj: Any, method: str) -> dict[str, Any]:
    """Safely call a service check method."""
    if not obj:
        return {"status": "not_configured"}
    if not hasattr(obj, method):
        return {"status": "unknown"}
    try:
        return getattr(obj, method)()
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def _check_mongodb(database_health_service: Any) -> dict[str, Any]:
    """Check MongoDB health."""
    result = _safe_service_check(database_health_service, "check_mongodb_health")
    if "error" in result:
        return result
    return {
        "status": "healthy" if result.get("is_running") else "unhealthy",
        "details": result,
    }


def _check_sql_server(connection_pool: Any) -> dict[str, Any]:
    """Check SQL Server connection pool health."""
    if not connection_pool:
        return {
            "status": "not_configured",
            "message": "SQL Server connection pool not initialized",
        }
    result = _safe_service_check(connection_pool, "check_health")
    if "error" in result:
        return result
    return {"status": result.get("status", "unknown"), "details": result}


def _check_cache(cache_service: Any) -> dict[str, Any]:
    """Check cache service health."""
    result = _safe_service_check(cache_service, "get_status")
    if "error" in result:
        return result
    return {"status": result.get("status", "unknown"), "details": result}


def _determine_overall_status(services: dict[str, dict[str, Any]]) -> str:
    """Determine overall health status from individual service statuses."""
    if any(s.get("status") == "unhealthy" for s in services.values()):
        return "unhealthy"
    if any(s.get("status") == "degraded" for s in services.values()):
        return "degraded"
    return "healthy"


@router.get("/", response_model=ApiResponse[HealthCheckResponse])
async def health_check_v2() -> ApiResponse[HealthCheckResponse]:
    """
    Enhanced health check endpoint
    Returns detailed health status of all services
    """
    try:
        from backend.server import (
            cache_service,
            connection_pool,
            database_health_service,
        )

        services = {
            "mongodb": _check_mongodb(database_health_service),
            "sql_server": _check_sql_server(connection_pool),
            "cache": _check_cache(cache_service),
        }

        overall_status = _determine_overall_status(services)

        health_response = HealthCheckResponse(
            status=overall_status,
            services=services,
            version="2.0.0",
        )

        return ApiResponse.success_response(
            data=health_response,
            message="Health check completed successfully",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="HEALTH_CHECK_FAILED",
            error_message=f"Health check failed: {str(e)}",
        )


@router.get("/detailed", response_model=ApiResponse[dict[str, Any]])
async def detailed_health_check(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[dict[str, Any]]:
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

        health_data: dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "mongodb": _safe_service_check(
                    database_health_service, "check_mongodb_health"
                ),
                "sql_server_pool": _safe_service_check(connection_pool, "get_stats"),
                "cache": _safe_service_check(cache_service, "get_status"),
            },
            "metrics": _safe_service_check(monitoring_service, "get_metrics"),
        }

        return ApiResponse.success_response(
            data=health_data,
            message="Detailed health check completed",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="DETAILED_HEALTH_CHECK_FAILED",
            error_message=f"Detailed health check failed: {str(e)}",
        )
