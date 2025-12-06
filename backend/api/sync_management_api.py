"""
Sync Management API
Provides lightweight placeholder sync endpoints to keep tests and tooling stable.
"""

from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import get_current_user_async as get_current_user

sync_management_router = APIRouter(prefix="/sync", tags=["sync"])

_change_detection_service = None
_erp_sync_service = None


def set_change_detection_service(service) -> None:
    """Register the change detection sync service (if any)."""
    global _change_detection_service
    _change_detection_service = service


def set_erp_sync_service(service) -> None:
    """Register the ERP sync service (if any)."""
    global _erp_sync_service
    _erp_sync_service = service


def _ensure_supervisor(user: dict) -> None:
    if user.get("role") not in {"supervisor", "admin"}:
        raise HTTPException(status_code=403, detail="Supervisor access required")


@sync_management_router.post("/erp")
async def trigger_erp_sync(current_user: dict = Depends(get_current_user)):
    """Trigger full ERP sync (supervisor/admin only)."""
    _ensure_supervisor(current_user)

    if _erp_sync_service is None:
        raise HTTPException(
            status_code=503,
            detail="ERP sync service is not initialized or disabled.",
        )

    try:
        stats = await _erp_sync_service.sync_items()
        return {"success": True, "message": "ERP sync completed successfully", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ERP sync failed: {str(e)}")


@sync_management_router.post("/changes")
async def trigger_change_sync(current_user: dict = Depends(get_current_user)):
    """Trigger change detection sync (supervisor/admin only)."""
    _ensure_supervisor(current_user)

    if _change_detection_service is None:
        raise HTTPException(
            status_code=503,
            detail="Change detection sync service is not initialized or disabled.",
        )

    try:
        # Run sync manually
        stats = await _change_detection_service.sync_changes()
        return {
            "success": True,
            "message": "Change detection sync completed successfully",
            "stats": stats,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Change detection sync failed: {str(e)}")


@sync_management_router.get("/changes/stats")
async def get_change_sync_stats(current_user: dict = Depends(get_current_user)):
    """Return change detection stats if the service is available."""
    _ensure_supervisor(current_user)
    if _change_detection_service is None:
        raise HTTPException(
            status_code=400,
            detail="Change detection sync service not enabled",
        )
    return _change_detection_service.get_status()
