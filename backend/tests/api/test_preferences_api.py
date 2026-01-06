"""
Tests for User Preferences API
"""

from unittest.mock import AsyncMock

import pytest

from backend.api.preferences_api import (
    UserPreferencesUpdate,
    get_my_preferences,
    update_my_preferences,
)
from backend.models.preferences import UserPreferencesBase


@pytest.mark.asyncio
async def test_get_preferences_defaults():
    mock_db = AsyncMock()
    mock_user = {"_id": "user123"}
    
    # Mock find_one to return None (no existing prefs)
    mock_db.user_preferences.find_one.return_value = None

    response = await get_my_preferences(mock_user, mock_db)

    assert isinstance(response, UserPreferencesBase)
    assert response.theme == "system"
    assert response.font_scale == 1.0
    mock_db.user_preferences.find_one.assert_called_once_with({"user_id": "user123"})


@pytest.mark.asyncio
async def test_get_preferences_existing():
    mock_db = AsyncMock()
    mock_user = {"_id": "user123"}
    
    existing_prefs = {
        "_id": "pref123",
        "user_id": "user123",
        "theme": "dark",
        "font_scale": 1.2,
        "primary_color": "#000000",
        "enable_haptic_feedback": False,
        "enable_sound_effects": True
    }
    mock_db.user_preferences.find_one.return_value = existing_prefs

    response = await get_my_preferences(mock_user, mock_db)

    assert response.theme == "dark"
    assert response.font_scale == 1.2
    assert response.enable_haptic_feedback is False


@pytest.mark.asyncio
async def test_update_preferences_create_new():
    mock_db = AsyncMock()
    valid_user_id = "507f1f77bcf86cd799439011"
    mock_user = {"_id": valid_user_id}
    
    # First find_one returns None (doesn't exist)
    mock_db.user_preferences.find_one.side_effect = [None, {"_id": "new_id", "user_id": valid_user_id, "theme": "dark", "font_scale": 1.0, "primary_color": "#007AFF", "enable_haptic_feedback": True, "enable_sound_effects": True}]
    mock_db.user_preferences.insert_one.return_value.inserted_id = "new_id"

    update_data = UserPreferencesUpdate(theme="dark")
    
    response = await update_my_preferences(update_data, mock_user, mock_db)

    # Verify insert was called
    mock_db.user_preferences.insert_one.assert_called_once()
    call_args = mock_db.user_preferences.insert_one.call_args[0][0]
    assert str(call_args["user_id"]) == valid_user_id
    assert call_args["theme"] == "dark"
    
    assert response.theme == "dark"


@pytest.mark.asyncio
async def test_update_preferences_update_existing():
    mock_db = AsyncMock()
    mock_user = {"_id": "user123"}
    
    existing_prefs = {
        "_id": "pref123",
        "user_id": "user123",
        "theme": "light",
        "font_scale": 1.0
    }
    
    # First find_one returns existing
    # Second find_one (after update) returns updated
    updated_prefs = existing_prefs.copy()
    updated_prefs["font_scale"] = 1.5
    
    mock_db.user_preferences.find_one.side_effect = [existing_prefs, updated_prefs]

    update_data = UserPreferencesUpdate(font_scale=1.5)
    
    response = await update_my_preferences(update_data, mock_user, mock_db)

    # Verify update was called
    mock_db.user_preferences.update_one.assert_called_once()
    call_args = mock_db.user_preferences.update_one.call_args
    assert call_args[0][0] == {"_id": "pref123"}
    assert call_args[0][1] == {"$set": {"font_scale": 1.5}}
    
    assert response.font_scale == 1.5
