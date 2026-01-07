"""
User Settings API

Endpoints for managing user-specific settings like theme, font size, colors.
"""

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from backend.auth.dependencies import get_current_user
from backend.core.schemas.audit_log import AuditAction
from backend.core.schemas.user_settings import (
    UserSettings,
    UserSettingsResponse,
    UserSettingsUpdate,
)
from backend.db.runtime import get_db
from backend.services.audit_service import audit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["User Settings"])


# Default settings for new users
DEFAULT_SETTINGS: dict[str, Any] = {
    "theme": "light",
    "font_size": "medium",
    "primary_color": "#1976D2",
    "haptic_enabled": True,
    "sound_enabled": True,
    "auto_sync_enabled": True,
}


@router.get("/settings", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserSettingsResponse:
    """
    Get the current user's settings.

    Returns default settings if user has no custom settings stored.
    """
    db = get_db()
    user_id = str(current_user["_id"])

    try:
        # Try to find existing settings
        settings_doc = await db.user_settings.find_one({"user_id": user_id})

        if settings_doc:
            # Return existing settings
            return UserSettingsResponse(
                status="success",
                message="Settings retrieved successfully",
                data=UserSettings(
                    theme=settings_doc.get("theme", DEFAULT_SETTINGS["theme"]),
                    font_size=settings_doc.get("font_size", DEFAULT_SETTINGS["font_size"]),
                    primary_color=settings_doc.get(
                        "primary_color", DEFAULT_SETTINGS["primary_color"]
                    ),
                    haptic_enabled=settings_doc.get(
                        "haptic_enabled", DEFAULT_SETTINGS["haptic_enabled"]
                    ),
                    sound_enabled=settings_doc.get(
                        "sound_enabled", DEFAULT_SETTINGS["sound_enabled"]
                    ),
                    auto_sync_enabled=settings_doc.get(
                        "auto_sync_enabled", DEFAULT_SETTINGS["auto_sync_enabled"]
                    ),
                    updated_at=settings_doc.get("updated_at"),
                ),
            )
        else:
            # Return defaults for users without custom settings
            return UserSettingsResponse(
                status="success",
                message="Default settings returned",
                data=UserSettings(**DEFAULT_SETTINGS),
            )

    except Exception as e:
        logger.error(f"Error fetching settings for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving user settings",
        )


@router.patch("/settings", response_model=UserSettingsResponse)
async def update_user_settings(
    settings_update: UserSettingsUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserSettingsResponse:
    """
    Update the current user's settings.

    Only provided fields will be updated; others remain unchanged.
    """
    db = get_db()
    user_id = str(current_user["_id"])
    username = current_user["username"]

    try:
        # Get current settings or create defaults
        existing = await db.user_settings.find_one({"user_id": user_id})

        # Build update document with only provided fields
        update_data = settings_update.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No settings to update",
            )

        # Track which fields are changing
        changed_fields = list(update_data.keys())

        # Add metadata
        update_data["updated_at"] = datetime.utcnow()

        if existing:
            # Update existing settings
            await db.user_settings.update_one(
                {"user_id": user_id},
                {"$set": update_data},
            )
        else:
            # Create new settings document with defaults + updates
            new_settings = {
                "user_id": user_id,
                **DEFAULT_SETTINGS,
                **update_data,
                "created_at": datetime.utcnow(),
            }
            await db.user_settings.insert_one(new_settings)

        # Log the update
        await audit_service.log_settings_update(
            user_id=user_id,
            username=username,
            changed_fields=changed_fields,
        )

        # Fetch and return updated settings
        updated_doc = await db.user_settings.find_one({"user_id": user_id})
        if not updated_doc:
            raise HTTPException(status_code=500, detail="Failed to retrieve updated settings")

        return UserSettingsResponse(
            status="success",
            message="Settings updated successfully",
            data=UserSettings(
                theme=updated_doc.get("theme", DEFAULT_SETTINGS["theme"]),
                font_size=updated_doc.get("font_size", DEFAULT_SETTINGS["font_size"]),
                primary_color=updated_doc.get("primary_color", DEFAULT_SETTINGS["primary_color"]),
                haptic_enabled=updated_doc.get(
                    "haptic_enabled", DEFAULT_SETTINGS["haptic_enabled"]
                ),
                sound_enabled=updated_doc.get("sound_enabled", DEFAULT_SETTINGS["sound_enabled"]),
                auto_sync_enabled=updated_doc.get(
                    "auto_sync_enabled", DEFAULT_SETTINGS["auto_sync_enabled"]
                ),
                updated_at=updated_doc.get("updated_at"),
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating settings for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error updating user settings",
        )


@router.delete("/settings", response_model=UserSettingsResponse)
async def reset_user_settings(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserSettingsResponse:
    """
    Reset the current user's settings to defaults.
    """
    db = get_db()
    user_id = str(current_user["_id"])
    username = current_user["username"]

    try:
        # Delete existing settings
        result = await db.user_settings.delete_one({"user_id": user_id})

        if result.deleted_count > 0:
            # Log the reset
            await audit_service.log(
                user_id=user_id,
                username=username,
                action=AuditAction.SETTINGS_UPDATE,
                resource_type="user_settings",
                resource_id=user_id,
                details={"action": "reset_to_defaults"},
            )

            logger.info(f"Settings reset to defaults for user {username}")

        # Return default settings
        return UserSettingsResponse(
            status="success",
            message="Settings reset to defaults",
            data=UserSettings(**DEFAULT_SETTINGS),
        )

    except Exception as e:
        logger.error(f"Error resetting settings for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error resetting user settings",
        )
