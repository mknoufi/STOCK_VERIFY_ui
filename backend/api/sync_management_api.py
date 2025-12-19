"""
Sync Management API
Provides lightweight placeholder sync endpoints to keep tests and tooling stable.
"""

from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import get_current_user_async as get_current_user

sync_management_router = APIRouter(prefix="/sync", tags=["sync"])

_change_detection_service = None


def set_change_detection_service(service) -> None:
    """Register the change detection sync service (if any)."""
    global _change_detection_service
    _change_detection_service = service


def _ensure_supervisor(user: dict) -> None:
    if user.get("role") not in {"supervisor", "admin"}:
        raise HTTPException(status_code=403, detail="Supervisor access required")


@sync_management_router.post("/erp")
async def trigger_erp_sync(current_user: dict = Depends(get_current_user)):
    """Placeholder ERP sync endpoint (supervisor/admin only)."""
    _ensure_supervisor(current_user)
    raise HTTPException(
        status_code=400,
        detail="Full ERP sync is disabled in the current environment.",
    )


@sync_management_router.post("/changes")
async def trigger_change_sync(current_user: dict = Depends(get_current_user)):
    """Placeholder change detection sync endpoint (supervisor/admin only)."""
    _ensure_supervisor(current_user)
    return {
        "success": False,
        "error": "Change detection sync is disabled in this environment.",
    }


@sync_management_router.get("/changes/stats")
async def get_change_sync_stats(current_user: dict = Depends(get_current_user)):
    """Return change detection stats if the service is available."""
    _ensure_supervisor(current_user)
    if _change_detection_service is None:
        raise HTTPException(
            status_code=400,
            detail="Change detection sync service not enabled",
        )
    return _change_detection_service.get_stats()
