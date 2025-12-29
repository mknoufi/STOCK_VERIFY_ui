"""
User Preferences Model
"""

from typing import Optional

from pydantic import BaseModel, Field

from backend.models.user import PyObjectId


class UserPreferencesBase(BaseModel):
    theme: str = "system"  # system, light, dark
    font_scale: float = 1.0
    primary_color: str = "#007AFF"
    enable_haptic_feedback: bool = True
    enable_sound_effects: bool = True


class UserPreferencesCreate(UserPreferencesBase):
    user_id: PyObjectId


class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    font_scale: Optional[float] = None
    primary_color: Optional[str] = None
    enable_haptic_feedback: Optional[bool] = None
    enable_sound_effects: Optional[bool] = None


class UserPreferencesInDB(UserPreferencesBase):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}
