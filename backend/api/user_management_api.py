"""
User Management API
Full CRUD endpoints for managing users - Admin only
"""

import logging
from datetime import datetime
from typing import Any, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field

from backend.auth.dependencies import get_current_user, require_admin
from backend.auth.permissions import ROLE_PERMISSIONS, Permission
from backend.db.runtime import get_db
from backend.utils.api_utils import sanitize_for_logging
from backend.utils.auth_utils import get_password_hash

logger = logging.getLogger(__name__)

user_management_router = APIRouter(prefix="/users", tags=["user-management"])


# ============================================================================
# Request/Response Models
# ============================================================================


class UserListItem(BaseModel):
    """User item in list response"""

    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "staff"
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    permissions_count: int = 0


class UserListResponse(BaseModel):
    """Paginated user list response"""

    users: list[UserListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserDetailResponse(BaseModel):
    """Detailed user response"""

    id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "staff"
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    permissions: list[str] = []
    custom_permissions: list[str] = []
    disabled_permissions: list[str] = []
    has_pin: bool = False


class CreateUserRequest(BaseModel):
    """Request to create a new user"""

    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-zA-Z0-9_-]+$",
    )
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)
    pin: Optional[str] = Field(None, pattern=r"^\d{4,6}$")
    role: str = Field(
        default="staff",
        pattern=r"^(staff|supervisor|admin)$",
    )
    permissions: Optional[list[str]] = None


class UpdateUserRequest(BaseModel):
    """Request to update a user"""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(
        None,
        min_length=6,
        max_length=128,
    )
    pin: Optional[str] = Field(None, pattern=r"^\d{4,6}$")
    role: Optional[str] = Field(
        None,
        pattern=r"^(staff|supervisor|admin)$",
    )
    is_active: Optional[bool] = None
    permissions: Optional[list[str]] = None
    disabled_permissions: Optional[list[str]] = None


class BulkUserAction(BaseModel):
    """Request for bulk user actions"""

    user_ids: list[str]
    action: str = Field(
        ...,
        pattern=r"^(activate|deactivate|delete|change_role)$",
    )
    role: Optional[str] = Field(None, pattern=r"^(staff|supervisor|admin)$")


class BulkActionResult(BaseModel):
    """Result of bulk action"""

    success_count: int
    failed_count: int
    failed_ids: list[str]
    message: str


# ============================================================================
# Helper Functions
# ============================================================================


def _user_to_list_item(user: dict[str, Any]) -> UserListItem:
    """Convert MongoDB user document to list item"""
    permissions = user.get("permissions", [])
    disabled = user.get("disabled_permissions", [])
    return UserListItem(
        id=str(user.get("_id", "")),
        username=user.get("username", ""),
        email=user.get("email"),
        full_name=user.get("full_name"),
        role=user.get("role", "staff"),
        is_active=user.get("is_active", True),
        created_at=user.get("created_at"),
        last_login=user.get("last_login"),
        permissions_count=len(permissions) - len(disabled),
    )


def _user_to_detail(user: dict[str, Any]) -> UserDetailResponse:
    """Convert MongoDB user document to detail response"""
    from backend.auth.permissions import get_user_permissions

    return UserDetailResponse(
        id=str(user.get("_id", "")),
        username=user.get("username", ""),
        email=user.get("email"),
        full_name=user.get("full_name"),
        role=user.get("role", "staff"),
        is_active=user.get("is_active", True),
        created_at=user.get("created_at"),
        last_login=user.get("last_login"),
        permissions=get_user_permissions(user),
        custom_permissions=user.get("permissions", []),
        disabled_permissions=user.get("disabled_permissions", []),
        has_pin=bool(user.get("pin_hash")),
    )


# ============================================================================
# API Endpoints
# ============================================================================


@user_management_router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(
        None,
        description="Search by username, email, or name",
    ),
    role: Optional[str] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(
        None,
        description="Filter by active status",
    ),
    sort_by: str = Query("username", description="Sort field"),
    sort_order: str = Query(
        "asc",
        description="Sort order (asc/desc)",
    ),
    current_user: dict = Depends(require_admin),
):
    """
    List all users with pagination and filtering.
    Requires admin role.
    """
    db = get_db()

    # Build filter query
    query: dict[str, Any] = {}

    if search:
        query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"full_name": {"$regex": search, "$options": "i"}},
        ]

    if role:
        query["role"] = role

    if is_active is not None:
        query["is_active"] = is_active

    # Count total
    total = await db.users.count_documents(query)

    # Sort
    sort_direction = 1 if sort_order == "asc" else -1
    sort_field = sort_by if sort_by in ["username", "email", "role", "created_at"] else "username"

    # Paginate
    skip = (page - 1) * page_size
    cursor = db.users.find(query).sort(sort_field, sort_direction).skip(skip).limit(page_size)

    users = await cursor.to_list(length=page_size)

    return UserListResponse(
        users=[_user_to_list_item(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@user_management_router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    """
    Get detailed information about a specific user.
    Requires admin role.
    """
    from bson import ObjectId

    db = get_db()

    # Validate ObjectId
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "message": "Invalid user ID",
                    "code": "INVALID_ID",
                },
            },
        )

    user = await db.users.find_one({"_id": oid})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found",
                    "code": "NOT_FOUND",
                },
            },
        )

    return _user_to_detail(user)


@user_management_router.post(
    "",
    response_model=UserDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    request: CreateUserRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Create a new user.
    Requires admin role.
    """
    db = get_db()

    # Check if username exists
    existing = await db.users.find_one({"username": request.username})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "success": False,
                "error": {
                    "message": "Username already exists",
                    "code": "DUPLICATE_USERNAME",
                },
            },
        )

    # Check if email exists (if provided)
    if request.email:
        existing_email = await db.users.find_one({"email": request.email})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "success": False,
                    "error": {
                        "message": "Email already exists",
                        "code": "DUPLICATE_EMAIL",
                    },
                },
            )

    # Validate permissions if provided
    if request.permissions:
        valid_perms = [p.value for p in Permission]
        invalid = [p for p in request.permissions if p not in valid_perms]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error": {
                        "message": (f"Invalid permissions: {', '.join(invalid)}"),
                        "code": "INVALID_PERMISSIONS",
                    },
                },
            )

    # Create user document
    now = datetime.utcnow()
    user_doc = {
        "username": request.username,
        "email": request.email,
        "full_name": request.full_name,
        "hashed_password": get_password_hash(request.password),
        "role": request.role,
        "is_active": True,
        "permissions": request.permissions or [],
        "disabled_permissions": [],
        "created_at": now,
        "updated_at": now,
    }

    # Add PIN if provided
    if request.pin:
        user_doc["pin_hash"] = get_password_hash(request.pin)

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    logger.info(
        "User created: %s by %s",
        sanitize_for_logging(request.username),
        current_user.get("username"),
    )

    return _user_to_detail(user_doc)


@user_management_router.put(
    "/{user_id}",
    response_model=UserDetailResponse,
)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Update an existing user.
    Requires admin role.
    """
    from bson import ObjectId

    db = get_db()

    # Validate ObjectId
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "message": "Invalid user ID",
                    "code": "INVALID_ID",
                },
            },
        )

    # Check if user exists
    existing = await db.users.find_one({"_id": oid})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found",
                    "code": "NOT_FOUND",
                },
            },
        )

    # Build update
    update: dict[str, Any] = {"updated_at": datetime.utcnow()}

    if request.email is not None:
        # Check for duplicate email
        if request.email:
            dup = await db.users.find_one({"email": request.email, "_id": {"$ne": oid}})
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "success": False,
                        "error": {
                            "message": "Email already exists",
                            "code": "DUPLICATE_EMAIL",
                        },
                    },
                )
        update["email"] = request.email

    if request.full_name is not None:
        update["full_name"] = request.full_name

    if request.password is not None:
        update["hashed_password"] = get_password_hash(request.password)

    if request.pin is not None:
        update["pin_hash"] = get_password_hash(request.pin)

    if request.role is not None:
        # Prevent admin from demoting themselves
        if str(existing["_id"]) == str(current_user.get("_id")):
            if request.role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "success": False,
                        "error": {
                            "message": "Cannot demote yourself",
                            "code": "SELF_DEMOTION_FORBIDDEN",
                        },
                    },
                )
        update["role"] = request.role

    if request.is_active is not None:
        # Prevent admin from deactivating themselves
        if str(existing["_id"]) == str(current_user.get("_id")):
            if not request.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "success": False,
                        "error": {
                            "message": "Cannot deactivate yourself",
                            "code": "SELF_DEACTIVATION_FORBIDDEN",
                        },
                    },
                )
        update["is_active"] = request.is_active

    if request.permissions is not None:
        valid_perms = [p.value for p in Permission]
        invalid = [p for p in request.permissions if p not in valid_perms]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error": {
                        "message": (f"Invalid permissions: {', '.join(invalid)}"),
                        "code": "INVALID_PERMISSIONS",
                    },
                },
            )
        update["permissions"] = request.permissions

    if request.disabled_permissions is not None:
        update["disabled_permissions"] = request.disabled_permissions

    await db.users.update_one({"_id": oid}, {"$set": update})

    # Fetch updated user
    updated = await db.users.find_one({"_id": oid})

    logger.info(
        "User updated: %s by %s",
        sanitize_for_logging(existing["username"]),
        current_user.get("username"),
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found",
                    "code": "NOT_FOUND",
                },
            },
        )

    return _user_to_detail(cast(dict[str, Any], updated))


@user_management_router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    """
    Delete a user.
    Requires admin role.
    """
    from bson import ObjectId

    db = get_db()

    # Validate ObjectId
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "message": "Invalid user ID",
                    "code": "INVALID_ID",
                },
            },
        )

    # Check if user exists
    existing = await db.users.find_one({"_id": oid})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found",
                    "code": "NOT_FOUND",
                },
            },
        )

    # Prevent admin from deleting themselves
    if str(existing["_id"]) == str(current_user.get("_id")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "message": "Cannot delete yourself",
                    "code": "SELF_DELETE_FORBIDDEN",
                },
            },
        )

    await db.users.delete_one({"_id": oid})

    logger.info(
        "User deleted: %s by %s",
        sanitize_for_logging(existing["username"]),
        current_user.get("username"),
    )


@user_management_router.post("/bulk", response_model=BulkActionResult)
async def bulk_user_action(
    request: BulkUserAction,
    current_user: dict = Depends(require_admin),
):
    """
    Perform bulk actions on users.
    Requires admin role.
    """
    from bson import ObjectId

    db = get_db()
    current_user_id = str(current_user.get("_id", ""))

    success_count = 0
    failed_ids: list[str] = []

    for user_id in request.user_ids:
        try:
            oid = ObjectId(user_id)

            # Skip self-modification
            if user_id == current_user_id:
                failed_ids.append(user_id)
                continue

            user = await db.users.find_one({"_id": oid})
            if not user:
                failed_ids.append(user_id)
                continue

            if request.action == "activate":
                await db.users.update_one(
                    {"_id": oid},
                    {"$set": {"is_active": True}},
                )
            elif request.action == "deactivate":
                await db.users.update_one(
                    {"_id": oid},
                    {"$set": {"is_active": False}},
                )
            elif request.action == "delete":
                await db.users.delete_one({"_id": oid})
            elif request.action == "change_role":
                if request.role:
                    await db.users.update_one(
                        {"_id": oid},
                        {"$set": {"role": request.role}},
                    )
                else:
                    failed_ids.append(user_id)
                    continue

            success_count += 1

        except Exception as e:
            logger.error(
                "Bulk action failed for user %s: %s",
                user_id,
                str(e),
            )
            failed_ids.append(user_id)

    action_msg = {
        "activate": "activated",
        "deactivate": "deactivated",
        "delete": "deleted",
        "change_role": f"role changed to {request.role}",
    }

    logger.info(
        "Bulk action '%s' completed: %s success, %s failed by %s",
        request.action,
        success_count,
        len(failed_ids),
        current_user.get("username"),
    )

    message = f"Successfully {action_msg.get(request.action, request.action)} {success_count} users"

    return BulkActionResult(
        success_count=success_count,
        failed_count=len(failed_ids),
        failed_ids=failed_ids,
        message=message,
    )


@user_management_router.get("/roles/available", response_model=dict)
async def get_available_roles(
    current_user: dict = Depends(get_current_user),
):
    """
    Get list of available roles and their permissions.
    Any authenticated user can view this.
    """
    return {
        "success": True,
        "data": {
            "roles": [
                {
                    "id": "staff",
                    "name": "Staff",
                    "description": ("Regular staff member with basic permissions"),
                    "permissions_count": len(ROLE_PERMISSIONS.get("staff", [])),
                },
                {
                    "id": "supervisor",
                    "name": "Supervisor",
                    "description": ("Supervisor with enhanced permissions for team management"),
                    "permissions_count": len(ROLE_PERMISSIONS.get("supervisor", [])),
                },
                {
                    "id": "admin",
                    "name": "Administrator",
                    "description": "Full system access with all permissions",
                    "permissions_count": len(ROLE_PERMISSIONS.get("admin", [])),
                },
            ]
        },
    }


@user_management_router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    new_password: str = Query(..., min_length=6, max_length=128),
    current_user: dict = Depends(require_admin),
):
    """
    Reset a user's password.
    Requires admin role.
    """
    from bson import ObjectId

    db = get_db()

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "message": "Invalid user ID",
                    "code": "INVALID_ID",
                },
            },
        )

    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found",
                    "code": "NOT_FOUND",
                },
            },
        )

    await db.users.update_one(
        {"_id": oid},
        {
            "$set": {
                "hashed_password": get_password_hash(new_password),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    logger.info(
        "Password reset for user: %s by %s",
        sanitize_for_logging(user["username"]),
        current_user.get("username"),
    )

    return {"success": True, "message": "Password reset successfully"}


@user_management_router.post("/{user_id}/reset-pin")
async def reset_user_pin(
    user_id: str,
    new_pin: str = Query(..., pattern=r"^\d{4,6}$"),
    current_user: dict = Depends(require_admin),
):
    """
    Reset a user's PIN.
    Requires admin role.
    """
    from bson import ObjectId

    db = get_db()

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": {
                    "message": "Invalid user ID",
                    "code": "INVALID_ID",
                },
            },
        )

    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": {
                    "message": "User not found",
                    "code": "NOT_FOUND",
                },
            },
        )

    await db.users.update_one(
        {"_id": oid},
        {
            "$set": {
                "pin_hash": get_password_hash(new_pin),
                "updated_at": datetime.utcnow(),
            }
        },
    )

    logger.info(
        "PIN reset for user: %s by %s",
        sanitize_for_logging(user["username"]),
        current_user.get("username"),
    )

    return {"success": True, "message": "PIN reset successfully"}
