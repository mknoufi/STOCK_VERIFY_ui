"""
Sync Conflicts API
Endpoints for managing synchronization conflicts
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.auth.permissions import Permission, require_permission
from backend.services.sync_conflicts_service import (
    ConflictResolution,
    ConflictStatus,
    SyncConflictsService,
)

sync_conflicts_router = APIRouter(prefix="/sync/conflicts", tags=["sync_conflicts"])


class ConflictResolutionRequest(BaseModel):
    resolution: str  # "accept_server", "accept_local", "merge", "ignore"
    merged_data: Optional[Dict[str, Any]] = None


@sync_conflicts_router.get("")
async def list_conflicts(
    status: Optional[str] = None,
    session_id: Optional[str] = None,
    user: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 100,
    sync_service: SyncConflictsService = Depends(lambda: None),
    current_user: dict = require_permission(Permission.SYNC_RESOLVE_CONFLICT),
):
    """List sync conflicts with optional filters"""
    status_filter = ConflictStatus(status) if status else None

    conflicts = await sync_service.get_conflicts(
        status=status_filter,
        session_id=session_id,
        user=user,
        entity_type=entity_type,
        limit=limit,
    )

    return {"success": True, "data": {"conflicts": conflicts, "total": len(conflicts)}}


@sync_conflicts_router.get("/{conflict_id}")
async def get_conflict_details(
    conflict_id: str,
    sync_service: SyncConflictsService = Depends(lambda: None),
    current_user: dict = require_permission(Permission.SYNC_RESOLVE_CONFLICT),
):
    """Get detailed information about a specific conflict"""
    conflict = await sync_service.get_conflict_by_id(conflict_id)

    if not conflict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "Conflict not found",
                    "code": "CONFLICT_NOT_FOUND",
                },
            },
        )

    return {"success": True, "data": conflict}


@sync_conflicts_router.post("/{conflict_id}/resolve")
async def resolve_conflict(
    conflict_id: str,
    resolution_request: ConflictResolutionRequest,
    sync_service: SyncConflictsService = Depends(lambda: None),
    current_user: dict = require_permission(Permission.SYNC_RESOLVE_CONFLICT),
):
    """Resolve a sync conflict"""
    try:
        # Validate resolution
        try:
            resolution = ConflictResolution(resolution_request.resolution)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error": {
                        "message": f"Invalid resolution: {resolution_request.resolution}",
                        "code": "INVALID_RESOLUTION",
                    },
                },
            )

        # Resolve conflict
        result = await sync_service.resolve_conflict(
            conflict_id=conflict_id,
            resolution=resolution,
            resolved_by=current_user["username"],
            merged_data=resolution_request.merged_data,
        )

        return {"success": True, "data": result}

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {"message": str(e), "code": "RESOLUTION_FAILED"},
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": {
                    "message": f"Failed to resolve conflict: {str(e)}",
                    "code": "INTERNAL_ERROR",
                },
            },
        )


@sync_conflicts_router.post("/auto-resolve")
async def auto_resolve_conflicts(
    strategy: str = "server_wins",
    sync_service: SyncConflictsService = Depends(lambda: None),
    current_user: dict = require_permission(Permission.SYNC_RESOLVE_CONFLICT),
):
    """Auto-resolve pending conflicts using a strategy"""
    valid_strategies = ["server_wins", "local_wins", "newest_wins"]

    if strategy not in valid_strategies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "message": f"Invalid strategy. Must be one of: {', '.join(valid_strategies)}",
                    "code": "INVALID_STRATEGY",
                },
            },
        )

    resolved_count = await sync_service.auto_resolve_simple_conflicts(strategy=strategy)

    return {
        "success": True,
        "data": {
            "message": f"Auto-resolved {resolved_count} conflicts",
            "resolved_count": resolved_count,
            "strategy": strategy,
        },
    }


@sync_conflicts_router.get("/stats/summary")
async def get_conflict_statistics(
    sync_service: SyncConflictsService = Depends(lambda: None),
    current_user: dict = require_permission(Permission.SYNC_RESOLVE_CONFLICT),
):
    """Get statistics about sync conflicts"""
    stats = await sync_service.get_conflict_stats()

    return {"success": True, "data": stats}
