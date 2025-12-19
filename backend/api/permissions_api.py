"""
Permissions Management API
Endpoints for managing user permissions
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.auth.permissions import (
    ROLE_PERMISSIONS,
    Permission,
    add_permissions_to_user,
    disable_permissions_for_user,
    enable_permissions_for_user,
    get_user_permissions,
    remove_permissions_from_user,
)

permissions_router = APIRouter(prefix="/permissions", tags=["permissions"])


class PermissionUpdate(BaseModel):
    permissions: list[str]


class UserPermissionsResponse(BaseModel):
    username: str
    role: str
    permissions: list[str]
    custom_permissions: list[str]
    disabled_permissions: list[str]


@permissions_router.get("/available")
async def list_available_permissions():
    """List all available permissions in the system"""
    return {
        "success": True,
        "data": {
            "permissions": [p.value for p in Permission],
            "categories": {
                "session": [
                    p.value for p in Permission if p.value.startswith("session.")
                ],
                "count_line": [
                    p.value for p in Permission if p.value.startswith("count_line.")
                ],
                "item": [
                    p.value
                    for p in Permission
                    if p.value.startswith("item.") or p.value.startswith("mrp.")
                ],
                "export": [
                    p.value for p in Permission if p.value.startswith("export.")
                ],
                "logs": [p.value for p in Permission if "log" in p.value],
                "admin": [
                    p.value
                    for p in Permission
                    if p.value.startswith("user.")
                    or p.value.startswith("settings.")
                    or p.value.startswith("db_mapping.")
                ],
                "sync": [p.value for p in Permission if p.value.startswith("sync.")],
                "review": [
                    p.value for p in Permission if p.value.startswith("review.")
                ],
                "report": [
                    p.value for p in Permission if p.value.startswith("report.")
                ],
            },
        },
    }


@permissions_router.get("/roles")
async def list_role_permissions():
    """List permissions for each role"""
    return {
        "success": True,
        "data": {
            "staff": sorted([p.value for p in ROLE_PERMISSIONS["staff"]]),
            "supervisor": sorted([p.value for p in ROLE_PERMISSIONS["supervisor"]]),
            "admin": sorted([p.value for p in ROLE_PERMISSIONS.get("admin", [])]),
        },
    }


@permissions_router.get("/users/{username}")
async def get_user_permissions_api(
    username: str,
    db=Depends(lambda: None),  # Will be injected
    current_user: dict = Depends(lambda: None),
):
    """Get permissions for a specific user"""
    # Check if current user has permission to view user permissions
    from backend.auth.permissions import has_permission

    if not has_permission(current_user, Permission.USER_MANAGE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {"message": "Permission denied", "code": "PERMISSION_DENIED"},
            },
        )

    # Get user
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {"message": "User not found", "code": "USER_NOT_FOUND"},
            },
        )

    return {
        "success": True,
        "data": {
            "username": user["username"],
            "role": user.get("role", "staff"),
            "permissions": get_user_permissions(user),
            "custom_permissions": user.get("permissions", []),
            "disabled_permissions": user.get("disabled_permissions", []),
        },
    }


@permissions_router.post("/users/{username}/add")
async def add_user_permissions(
    username: str,
    permission_update: PermissionUpdate,
    db=Depends(lambda: None),
    current_user: dict = Depends(lambda: None),
):
    """Add custom permissions to a user"""
    from backend.auth.permissions import has_permission

    if not has_permission(current_user, Permission.USER_MANAGE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {"message": "Permission denied", "code": "PERMISSION_DENIED"},
            },
        )

    # Validate permissions
    valid_permissions = [p.value for p in Permission]
    for perm in permission_update.permissions:
        if perm not in valid_permissions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error": {
                        "message": f"Invalid permission: {perm}",
                        "code": "INVALID_PERMISSION",
                    },
                },
            )

    success = await add_permissions_to_user(db, username, permission_update.permissions)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found or no changes made",
                    "code": "UPDATE_FAILED",
                },
            },
        )

    # Log activity
    from backend.services.activity_log import ActivityLogService

    activity_service = ActivityLogService(db)
    await activity_service.log_activity(
        user=current_user["username"],
        role=current_user["role"],
        action="add_permissions",
        entity_type="user",
        entity_id=username,
        details={"permissions": permission_update.permissions},
    )

    return {
        "success": True,
        "data": {
            "message": "Permissions added successfully",
            "username": username,
            "added_permissions": permission_update.permissions,
        },
    }


@permissions_router.post("/users/{username}/remove")
async def remove_user_permissions(
    username: str,
    permission_update: PermissionUpdate,
    db=Depends(lambda: None),
    current_user: dict = Depends(lambda: None),
):
    """Remove custom permissions from a user"""
    from backend.auth.permissions import has_permission

    if not has_permission(current_user, Permission.USER_MANAGE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {"message": "Permission denied", "code": "PERMISSION_DENIED"},
            },
        )

    success = await remove_permissions_from_user(
        db, username, permission_update.permissions
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found or no changes made",
                    "code": "UPDATE_FAILED",
                },
            },
        )

    # Log activity
    from backend.services.activity_log import ActivityLogService

    activity_service = ActivityLogService(db)
    await activity_service.log_activity(
        user=current_user["username"],
        role=current_user["role"],
        action="remove_permissions",
        entity_type="user",
        entity_id=username,
        details={"permissions": permission_update.permissions},
    )

    return {
        "success": True,
        "data": {
            "message": "Permissions removed successfully",
            "username": username,
            "removed_permissions": permission_update.permissions,
        },
    }


@permissions_router.post("/users/{username}/disable")
async def disable_user_permissions(
    username: str,
    permission_update: PermissionUpdate,
    db=Depends(lambda: None),
    current_user: dict = Depends(lambda: None),
):
    """Disable specific permissions for a user"""
    from backend.auth.permissions import has_permission

    if not has_permission(current_user, Permission.USER_MANAGE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {"message": "Permission denied", "code": "PERMISSION_DENIED"},
            },
        )

    success = await disable_permissions_for_user(
        db, username, permission_update.permissions
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found or no changes made",
                    "code": "UPDATE_FAILED",
                },
            },
        )

    # Log activity
    from backend.services.activity_log import ActivityLogService

    activity_service = ActivityLogService(db)
    await activity_service.log_activity(
        user=current_user["username"],
        role=current_user["role"],
        action="disable_permissions",
        entity_type="user",
        entity_id=username,
        details={"permissions": permission_update.permissions},
    )

    return {
        "success": True,
        "data": {
            "message": "Permissions disabled successfully",
            "username": username,
            "disabled_permissions": permission_update.permissions,
        },
    }


@permissions_router.post("/users/{username}/enable")
async def enable_user_permissions(
    username: str,
    permission_update: PermissionUpdate,
    db=Depends(lambda: None),
    current_user: dict = Depends(lambda: None),
):
    """Re-enable previously disabled permissions for a user"""
    from backend.auth.permissions import has_permission

    if not has_permission(current_user, Permission.USER_MANAGE):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {"message": "Permission denied", "code": "PERMISSION_DENIED"},
            },
        )

    success = await enable_permissions_for_user(
        db, username, permission_update.permissions
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found or no changes made",
                    "code": "UPDATE_FAILED",
                },
            },
        )

    # Log activity
    from backend.services.activity_log import ActivityLogService

    activity_service = ActivityLogService(db)
    await activity_service.log_activity(
        user=current_user["username"],
        role=current_user["role"],
        action="enable_permissions",
        entity_type="user",
        entity_id=username,
        details={"permissions": permission_update.permissions},
    )

    return {
        "success": True,
        "data": {
            "message": "Permissions enabled successfully",
            "username": username,
            "enabled_permissions": permission_update.permissions,
        },
    }
