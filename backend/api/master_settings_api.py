"""
Master Settings API - Centralized system configuration
"""

import logging
from datetime import datetime
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

try:
    from backend.auth.jwt import get_current_user
except ImportError:
    try:
        from auth.jwt import get_current_user
    except ImportError:

        def get_current_user():
            return {"role": "admin", "username": "admin"}


logger = logging.getLogger(__name__)

master_settings_router = APIRouter(prefix="/api/admin/settings", tags=["Master Settings"])


def require_admin(current_user: Any = Depends(get_current_user)):
    """Require admin role"""
    if isinstance(current_user, dict):
        user_role = current_user.get("role")
    else:
        user_role = getattr(current_user, "role", None)

    if user_role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return (
        current_user if isinstance(current_user, dict) else {"role": "admin", "username": "admin"}
    )


class SystemParameters(BaseModel):
    # API Settings
    api_timeout: Annotated[
        int, Field(ge=5, le=300, description="API request timeout in seconds")
    ] = 30
    api_rate_limit: Annotated[
        int, Field(ge=10, le=10000, description="API rate limit per minute")
    ] = 100

    # Cache Settings
    cache_enabled: Annotated[bool, Field(description="Enable caching")] = True
    cache_ttl: Annotated[int, Field(ge=60, le=86400, description="Cache TTL in seconds")] = 3600
    cache_max_size: Annotated[int, Field(ge=100, le=10000, description="Maximum cache entries")] = (
        1000
    )

    # Sync Settings
    sync_interval: Annotated[
        int, Field(ge=60, le=86400, description="ERP sync interval in seconds")
    ] = 3600
    sync_batch_size: Annotated[int, Field(ge=10, le=1000, description="Sync batch size")] = 100
    auto_sync_enabled: Annotated[bool, Field(description="Enable automatic sync")] = True

    # Session Settings
    session_timeout: Annotated[
        int, Field(ge=300, le=86400, description="Session timeout in seconds")
    ] = 3600
    max_concurrent_sessions: Annotated[
        int, Field(ge=10, le=500, description="Maximum concurrent sessions")
    ] = 50

    # Logging Settings
    log_level: Annotated[
        str, Field(pattern="^(DEBUG|INFO|WARN|ERROR)$", description="Log level")
    ] = "INFO"
    log_retention_days: Annotated[int, Field(ge=1, le=365, description="Log retention in days")] = (
        30
    )
    enable_audit_log: Annotated[bool, Field(description="Enable audit logging")] = True

    # Database Settings
    mongo_pool_size: Annotated[
        int, Field(ge=1, le=100, description="MongoDB connection pool size")
    ] = 10
    sql_pool_size: Annotated[
        int, Field(ge=1, le=20, description="SQL Server connection pool size")
    ] = 5
    query_timeout: Annotated[
        int, Field(ge=5, le=300, description="Database query timeout in seconds")
    ] = 30

    # Security Settings
    password_min_length: Annotated[
        int, Field(ge=6, le=32, description="Minimum password length")
    ] = 8
    password_require_uppercase: Annotated[
        bool, Field(description="Require uppercase in password")
    ] = True
    password_require_lowercase: Annotated[
        bool, Field(description="Require lowercase in password")
    ] = True
    password_require_numbers: Annotated[bool, Field(description="Require numbers in password")] = (
        True
    )
    jwt_expiration: Annotated[
        int, Field(ge=3600, le=604800, description="JWT expiration in seconds")
    ] = 86400

    # Performance Settings
    enable_compression: Annotated[bool, Field(description="Enable response compression")] = True
    max_request_size: Annotated[
        int, Field(ge=1048576, le=104857600, description="Max request size in bytes")
    ] = 10485760
    enable_cors: Annotated[bool, Field(description="Enable CORS")] = True


@master_settings_router.get("/parameters")
async def get_system_parameters(current_user: dict = Depends(require_admin)):
    """Get all system parameters"""
    try:
        from server import db

        # Get settings from database
        settings_doc = await db.system_settings.find_one({"_id": "parameters"})

        if settings_doc:
            settings_doc.pop("_id", None)
            return {
                "success": True,
                "data": settings_doc,
            }
        else:
            # Return defaults
            default_params = SystemParameters()
            return {
                "success": True,
                "data": default_params.model_dump(),
            }
    except Exception as e:
        logger.error(f"Error getting system parameters: {e}")
        # Return defaults on error
        default_params = SystemParameters()
        return {
            "success": True,
            "data": default_params.model_dump(),
        }


@master_settings_router.put("/parameters")
async def update_system_parameters(
    parameters: SystemParameters, current_user: dict = Depends(require_admin)
):
    """Update system parameters"""
    try:
        from server import db

        # Validate parameters
        params_dict = parameters.model_dump()
        params_dict["_id"] = "parameters"
        params_dict["updated_by"] = current_user.get("username", "admin")
        params_dict["updated_at"] = datetime.now().isoformat()

        # Save to database
        await db.system_settings.replace_one({"_id": "parameters"}, params_dict, upsert=True)

        # Log the change
        await db.audit_logs.insert_one(
            {
                "action": "update_system_parameters",
                "user": current_user.get("username", "admin"),
                "timestamp": datetime.now().isoformat(),
                "changes": params_dict,
            }
        )

        return {
            "success": True,
            "message": "System parameters updated successfully",
            "data": params_dict,
            "note": "Some changes may require backend restart to take effect",
        }
    except Exception as e:
        logger.error(f"Error updating system parameters: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update system parameters: {str(e)}",
        )


@master_settings_router.get("/categories")
async def get_settings_categories(current_user: dict = Depends(require_admin)):
    """Get settings categories"""
    return {
        "success": True,
        "data": {
            "categories": [
                {
                    "id": "api",
                    "name": "API Settings",
                    "icon": "code",
                    "description": "API timeout, rate limiting, and request settings",
                },
                {
                    "id": "cache",
                    "name": "Cache Settings",
                    "icon": "flash",
                    "description": "Caching configuration and TTL settings",
                },
                {
                    "id": "sync",
                    "name": "Sync Settings",
                    "icon": "sync",
                    "description": "ERP sync interval and batch settings",
                },
                {
                    "id": "session",
                    "name": "Session Settings",
                    "icon": "time",
                    "description": "Session timeout and concurrent session limits",
                },
                {
                    "id": "logging",
                    "name": "Logging Settings",
                    "icon": "document-text",
                    "description": "Log level and retention settings",
                },
                {
                    "id": "database",
                    "name": "Database Settings",
                    "icon": "server",
                    "description": "Connection pool and query timeout settings",
                },
                {
                    "id": "security",
                    "name": "Security Settings",
                    "icon": "shield-checkmark",
                    "description": "Password policies and JWT settings",
                },
                {
                    "id": "performance",
                    "name": "Performance Settings",
                    "icon": "speedometer",
                    "description": "Compression and request size limits",
                },
            ]
        },
    }


@master_settings_router.post("/reset")
async def reset_to_defaults(
    category: Optional[str] = None, current_user: dict = Depends(require_admin)
):
    """Reset settings to defaults"""
    try:
        from server import db

        if category:
            # Reset specific category
            default_params = SystemParameters()
            params_dict = default_params.model_dump()

            # Get current settings
            current = await db.system_settings.find_one({"_id": "parameters"})
            if current:
                # Update only the category
                for key, value in params_dict.items():
                    if key.startswith(category + "_"):
                        current[key] = value

                current["updated_by"] = current_user.get("username", "admin")
                current["updated_at"] = datetime.now().isoformat()

                await db.system_settings.replace_one({"_id": "parameters"}, current)
            else:
                # Create new with defaults
                params_dict["_id"] = "parameters"
                params_dict["updated_by"] = current_user.get("username", "admin")
                params_dict["updated_at"] = datetime.now().isoformat()
                await db.system_settings.insert_one(params_dict)
        else:
            # Reset all to defaults
            default_params = SystemParameters()
            params_dict = default_params.model_dump()
            params_dict["_id"] = "parameters"
            params_dict["updated_by"] = current_user.get("username", "admin")
            params_dict["updated_at"] = datetime.now().isoformat()

            await db.system_settings.replace_one({"_id": "parameters"}, params_dict, upsert=True)

        return {
            "success": True,
            "message": f"Settings reset to defaults{' for ' + category if category else ''}",
        }
    except Exception as e:
        logger.error(f"Error resetting settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset settings: {str(e)}",
        )
