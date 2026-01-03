"""
Sync Status API - Provides endpoints for sync status and control
"""

import logging
from typing import Any, cast

from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger(__name__)

sync_router = APIRouter(prefix="/sync", tags=["sync"])

# Global reference to auto sync manager (set from server.py)
_auto_sync_manager = None


def set_auto_sync_manager(manager):
    """Set the auto sync manager instance"""
    global _auto_sync_manager
    _auto_sync_manager = manager


@sync_router.get("/status", status_code=status.HTTP_200_OK)
async def get_sync_status() -> dict[str, Any]:
    """
    Get current sync status
    Returns: Connection status, sync progress, statistics
    """
    if _auto_sync_manager is None:
        return {"success": False, "error": "Auto-sync manager not available"}

    try:
        status_data = _auto_sync_manager.get_status()
        return {"success": True, "data": status_data}
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@sync_router.get("/stats", status_code=status.HTTP_200_OK)
async def get_sync_stats() -> dict[str, Any]:
    """
    Get sync statistics
    Returns: Historical sync statistics
    """
    if _auto_sync_manager is None:
        return {"success": False, "error": "Auto-sync manager not available"}

    try:
        stats = _auto_sync_manager.get_stats()
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Error getting sync stats: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@sync_router.post("/trigger", status_code=status.HTTP_200_OK)
async def trigger_manual_sync() -> dict[str, Any]:
    """
    Manually trigger a sync (admin action)
    Returns: Success status
    """
    if _auto_sync_manager is None:
        return {"success": False, "error": "Auto-sync manager not available"}

    try:
        result = await _auto_sync_manager.trigger_manual_sync()
        return cast(dict[str, Any], result)
    except Exception as e:
        logger.error(f"Error triggering manual sync: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
