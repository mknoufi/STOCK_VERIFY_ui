"""
API v2 Router
Upgraded API endpoints with improved response formats and error handling
"""

from fastapi import APIRouter

# Import and include v2 endpoints
from . import connection_status, health, items, metrics, sessions

# Create v2 API router
v2_router = APIRouter(prefix="/api/v2", tags=["API v2"])

# Register v2 routers
v2_router.include_router(items.router, prefix="/items", tags=["Items v2"])
v2_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions v2"])
v2_router.include_router(health.router, prefix="/health", tags=["Health v2"])
v2_router.include_router(connection_status.router, prefix="/connections", tags=["Connections v2"])
v2_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics v2"])

__all__ = ["v2_router"]
