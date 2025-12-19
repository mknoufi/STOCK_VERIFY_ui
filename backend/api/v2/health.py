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


@router.get("/", response_model=ApiResponse[HealthCheckResponse])
async def health_check_v2() -> ApiResponse[HealthCheckResponse]:
    """
    Enhanced health check endpoint
    Returns detailed health status of all services
    """
    try:
        # Import here to avoid circular dependencies
        from backend.server import (
            cache_service,
            connection_pool,
            database_health_service,
        )

        services: dict[str, dict[str, Any]] = {}

        # Check MongoDB
        try:
            mongo_status = database_health_service.check_mongodb_health()
            services["mongodb"] = {
                "status": "healthy" if mongo_status.get("is_running") else "unhealthy",
                "details": mongo_status,
            }
        except Exception as e:
            services["mongodb"] = {
                "status": "unhealthy",
                "error": str(e),
            }

        # Check SQL Server connection pool
        if connection_pool:
            try:
                pool_health = connection_pool.check_health()
                services["sql_server"] = {
                    "status": pool_health.get("status", "unknown"),
                    "details": pool_health,
                }
            except Exception as e:
                services["sql_server"] = {
                    "status": "unhealthy",
                    "error": str(e),
                }
        else:
            services["sql_server"] = {
                "status": "not_configured",
                "message": "SQL Server connection pool not initialized",
            }

        # Check cache service
        try:
            cache_status = (
                cache_service.get_status()
                if hasattr(cache_service, "get_status")
                else {"status": "unknown"}
            )
            services["cache"] = {
                "status": cache_status.get("status", "unknown"),
                "details": cache_status,
            }
        except Exception as e:
            services["cache"] = {
                "status": "unhealthy",
                "error": str(e),
            }

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
            "services": {},
            "metrics": {},
        }

        # MongoDB health
        try:
            mongo_health = database_health_service.check_mongodb_health()
            health_data["services"]["mongodb"] = mongo_health
        except Exception as e:
            health_data["services"]["mongodb"] = {"error": str(e)}

        # SQL Server pool health
        if connection_pool:
            try:
                pool_stats = connection_pool.get_stats()
                health_data["services"]["sql_server_pool"] = pool_stats
            except Exception as e:
                health_data["services"]["sql_server_pool"] = {"error": str(e)}

        # Cache service
        try:
            if hasattr(cache_service, "get_status"):
                cache_status = cache_service.get_status()
                health_data["services"]["cache"] = cache_status
        except Exception as e:
            health_data["services"]["cache"] = {"error": str(e)}

        # Monitoring metrics
        try:
            if hasattr(monitoring_service, "get_metrics"):
                metrics = monitoring_service.get_metrics()
                health_data["metrics"] = metrics
        except Exception as e:
            health_data["metrics"] = {"error": str(e)}

        return ApiResponse.success_response(
            data=health_data,
            message="Detailed health check completed",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="DETAILED_HEALTH_CHECK_FAILED",
            error_message=f"Detailed health check failed: {str(e)}",
        )
