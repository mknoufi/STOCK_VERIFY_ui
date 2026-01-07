"""
User Settings Schema

Pydantic models for user-specific settings like theme, font size, and colors.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserSettings(BaseModel):
    """User settings stored in MongoDB user document."""

    theme: str = Field(
        default="light",
        description="UI theme: light, dark, premium, ocean, sunset, highContrast",
    )
    font_size: str = Field(default="medium", description="Font size: small, medium, large, xlarge")
    primary_color: Optional[str] = Field(
        default=None, description="Custom primary color in hex format (e.g., #3B82F6)"
    )
    haptic_enabled: bool = Field(default=True, description="Enable haptic feedback for scans")
    sound_enabled: bool = Field(default=True, description="Enable sound feedback for scans")
    auto_sync_enabled: bool = Field(
        default=True, description="Enable automatic data synchronization"
    )
    updated_at: Optional[datetime] = Field(
        default=None, description="Timestamp of last settings update"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "theme": "dark",
                "font_size": "large",
                "primary_color": "#3B82F6",
                "haptic_enabled": True,
                "sound_enabled": True,
                "auto_sync_enabled": True,
            }
        }


class UserSettingsUpdate(BaseModel):
    """Partial update model for user settings."""

    theme: Optional[str] = Field(
        default=None,
        description="UI theme: light, dark, premium, ocean, sunset, highContrast",
    )
    font_size: Optional[str] = Field(
        default=None, description="Font size: small, medium, large, xlarge"
    )
    primary_color: Optional[str] = Field(
        default=None, description="Custom primary color in hex format"
    )
    haptic_enabled: Optional[bool] = Field(default=None, description="Enable haptic feedback")
    sound_enabled: Optional[bool] = Field(default=None, description="Enable sound feedback")
    auto_sync_enabled: Optional[bool] = Field(default=None, description="Enable automatic sync")

    class Config:
        json_schema_extra = {"example": {"theme": "dark", "font_size": "large"}}


class UserSettingsResponse(BaseModel):
    """Response model for user settings endpoints."""

    status: str = Field(default="success", description="Response status")
    message: str = Field(default="", description="Human-readable message")
    data: UserSettings = Field(description="User settings")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "Settings retrieved successfully",
                "data": {
                    "theme": "dark",
                    "font_size": "medium",
                    "primary_color": "#3B82F6",
                    "haptic_enabled": True,
                    "sound_enabled": True,
                    "auto_sync_enabled": True,
                },
            }
        }
