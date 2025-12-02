"""
API v2 Router
Upgraded API endpoints with improved response formats and error handling
"""

from fastapi import APIRouter

# Create v2 API router
v2_router = APIRouter(prefix="/api/v2", tags=["API v2"])

# Import and include v2 endpoints
from . import items, sessions, health, connection_status, metrics

# Register v2 routers
v2_router.include_router(items.router, prefix="/items", tags=["Items v2"])
v2_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions v2"])
v2_router.include_router(health.router, prefix="/health", tags=["Health v2"])
v2_router.include_router(connection_status.router, prefix="/connections", tags=["Connections v2"])
v2_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics v2"])

__all__ = ["v2_router"]

