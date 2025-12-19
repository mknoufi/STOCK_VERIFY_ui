"""
Permission-based Access Control System
Provides granular permission management for users
"""

from typing import List, Set, Dict
from enum import Enum
from fastapi import HTTPException, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase


# Permission definitions
class Permission(str, Enum):
    """Available permissions in the system"""

    # Session permissions
    SESSION_CREATE = "session.create"
    SESSION_READ = "session.read"
    SESSION_READ_ALL = "session.read_all"
    SESSION_UPDATE = "session.update"
    SESSION_DELETE = "session.delete"
    SESSION_CLOSE = "session.close"

    # Count line permissions
    COUNT_LINE_CREATE = "count_line.create"
    COUNT_LINE_READ = "count_line.read"
    COUNT_LINE_UPDATE = "count_line.update"
    COUNT_LINE_DELETE = "count_line.delete"
    COUNT_LINE_APPROVE = "count_line.approve"
    COUNT_LINE_REJECT = "count_line.reject"

    # Item/MRP permissions
    ITEM_READ = "item.read"
    ITEM_SEARCH = "item.search"
    MRP_UPDATE = "mrp.update"
    MRP_BULK_UPDATE = "mrp.bulk_update"

    # Export permissions
    EXPORT_OWN = "export.own"
    EXPORT_ALL = "export.all"
    EXPORT_SCHEDULE = "export.schedule"

    # Log permissions
    ACTIVITY_LOG_READ = "activity_log.read"
    ERROR_LOG_READ = "error_log.read"

    # Admin permissions
    USER_MANAGE = "user.manage"
    SETTINGS_MANAGE = "settings.manage"
    DB_MAPPING_MANAGE = "db_mapping.manage"

    # Sync permissions
    SYNC_TRIGGER = "sync.trigger"
    SYNC_RESOLVE_CONFLICT = "sync.resolve_conflict"

    # Review permissions
    REVIEW_CREATE = "review.create"
    REVIEW_APPROVE = "review.approve"
    REVIEW_COMMENT = "review.comment"

    # Reporting permissions
    REPORT_VIEW = "report.view"
    REPORT_FINANCIAL = "report.financial"
    REPORT_ANALYTICS = "report.analytics"


# Role-based permission sets
ROLE_PERMISSIONS: Dict[str, Set[Permission]] = {
    "staff": {
        Permission.SESSION_CREATE,
        Permission.SESSION_READ,
        Permission.SESSION_UPDATE,
        Permission.SESSION_CLOSE,
        Permission.COUNT_LINE_CREATE,
        Permission.COUNT_LINE_READ,
        Permission.COUNT_LINE_UPDATE,
        Permission.ITEM_READ,
        Permission.ITEM_SEARCH,
        Permission.MRP_UPDATE,
        Permission.EXPORT_OWN,
        Permission.REVIEW_CREATE,
        Permission.REVIEW_COMMENT,
    },
    "supervisor": {
        # Supervisors get all staff permissions plus additional ones
        Permission.SESSION_CREATE,
        Permission.SESSION_READ,
        Permission.SESSION_READ_ALL,
        Permission.SESSION_UPDATE,
        Permission.SESSION_DELETE,
        Permission.SESSION_CLOSE,
        Permission.COUNT_LINE_CREATE,
        Permission.COUNT_LINE_READ,
        Permission.COUNT_LINE_UPDATE,
        Permission.COUNT_LINE_DELETE,
        Permission.COUNT_LINE_APPROVE,
        Permission.COUNT_LINE_REJECT,
        Permission.ITEM_READ,
        Permission.ITEM_SEARCH,
        Permission.MRP_UPDATE,
        Permission.MRP_BULK_UPDATE,
        Permission.EXPORT_OWN,
        Permission.EXPORT_ALL,
        Permission.EXPORT_SCHEDULE,
        Permission.ACTIVITY_LOG_READ,
        Permission.ERROR_LOG_READ,
        Permission.DB_MAPPING_MANAGE,
        Permission.SYNC_TRIGGER,
        Permission.SYNC_RESOLVE_CONFLICT,
        Permission.REVIEW_CREATE,
        Permission.REVIEW_APPROVE,
        Permission.REVIEW_COMMENT,
        Permission.REPORT_VIEW,
        Permission.REPORT_FINANCIAL,
        Permission.REPORT_ANALYTICS,
    },
    "admin": {
        # Admins get all permissions
        *[p for p in Permission],
    },
}


def get_role_permissions(role: str) -> Set[Permission]:
    """Get all permissions for a role"""
    return ROLE_PERMISSIONS.get(role, set())


def get_user_permissions(user: dict) -> List[str]:
    """Extract permissions from user document"""
    role = user.get("role", "staff")

    # Get base role permissions
    base_permissions = get_role_permissions(role)

    # Get custom permissions (if any)
    custom_permissions = set(user.get("permissions", []))

    # Get disabled permissions
    disabled_permissions = set(user.get("disabled_permissions", []))

    # Combine: base + custom - disabled
    all_permissions = (base_permissions | custom_permissions) - disabled_permissions

    return sorted([p.value for p in all_permissions])


def has_permission(user: dict, permission: Permission) -> bool:
    """Check if user has a specific permission"""
    user_permissions = get_user_permissions(user)
    return permission.value in user_permissions


def has_any_permission(user: dict, permissions: List[Permission]) -> bool:
    """Check if user has any of the specified permissions"""
    user_permissions = set(get_user_permissions(user))
    required_permissions = set(p.value for p in permissions)
    return bool(user_permissions & required_permissions)


def has_all_permissions(user: dict, permissions: List[Permission]) -> bool:
    """Check if user has all of the specified permissions"""
    user_permissions = set(get_user_permissions(user))
    required_permissions = set(p.value for p in permissions)
    return required_permissions.issubset(user_permissions)


class PermissionChecker:
    """Dependency for checking permissions"""

    def __init__(self, required_permission: Permission):
        self.required_permission = required_permission

    def __call__(self, current_user: dict = Depends(lambda: None)):
        """Check if current user has the required permission"""
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": {
                        "message": "Authentication required",
                        "code": "AUTHENTICATION_REQUIRED",
                        "category": "auth",
                    },
                },
            )

        if not has_permission(current_user, self.required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "error": {
                        "message": f"Permission denied. Required: {self.required_permission.value}",
                        "code": "PERMISSION_DENIED",
                        "category": "authorization",
                        "details": {
                            "required_permission": self.required_permission.value,
                            "user_role": current_user.get("role"),
                        },
                    },
                },
            )

        return current_user


def require_permission(permission: Permission):
    """Decorator to require a specific permission"""
    return Depends(PermissionChecker(permission))


async def add_permissions_to_user(
    db: AsyncIOMotorDatabase, username: str, permissions: List[str]
) -> bool:
    """Add custom permissions to a user"""
    result = await db.users.update_one(
        {"username": username}, {"$addToSet": {"permissions": {"$each": permissions}}}
    )
    return result.modified_count > 0


async def remove_permissions_from_user(
    db: AsyncIOMotorDatabase, username: str, permissions: List[str]
) -> bool:
    """Remove permissions from a user"""
    result = await db.users.update_one(
        {"username": username}, {"$pull": {"permissions": {"$in": permissions}}}
    )
    return result.modified_count > 0


async def disable_permissions_for_user(
    db: AsyncIOMotorDatabase, username: str, permissions: List[str]
) -> bool:
    """Disable specific permissions for a user"""
    result = await db.users.update_one(
        {"username": username},
        {"$addToSet": {"disabled_permissions": {"$each": permissions}}},
    )
    return result.modified_count > 0


async def enable_permissions_for_user(
    db: AsyncIOMotorDatabase, username: str, permissions: List[str]
) -> bool:
    """Re-enable previously disabled permissions"""
    result = await db.users.update_one(
        {"username": username},
        {"$pull": {"disabled_permissions": {"$in": permissions}}},
    )
    return result.modified_count > 0
