"""
User Preferences API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.auth.dependencies import get_current_user
from backend.db.runtime import get_db
from backend.models.preferences import (
    UserPreferencesBase,
    UserPreferencesCreate,
    UserPreferencesInDB,
    UserPreferencesUpdate,
)

router = APIRouter()


@router.get("/users/me/preferences", response_model=UserPreferencesInDB)
async def get_my_preferences(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get current user's preferences."""
    user_id = current_user["_id"]

    # Try to find existing preferences
    prefs = await db.user_preferences.find_one({"user_id": user_id})

    if prefs:
        return UserPreferencesInDB(**prefs)

    # Return defaults if not found
    return UserPreferencesInDB(user_id=user_id, **UserPreferencesBase().model_dump())


@router.put("/users/me/preferences", response_model=UserPreferencesInDB)
async def update_my_preferences(
    preferences: UserPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Update current user's preferences."""
    user_id = current_user["_id"]

    # Check if preferences exist
    existing = await db.user_preferences.find_one({"user_id": user_id})

    update_data = preferences.model_dump(exclude_unset=True)

    if existing:
        # Update existing
        await db.user_preferences.update_one(
            {"_id": existing["_id"]},
            {"$set": update_data}
        )
        # Fetch updated
        updated = await db.user_preferences.find_one({"_id": existing["_id"]})
        return UserPreferencesInDB(**updated)
    else:
        # Create new
        base_defaults = UserPreferencesBase().model_dump()
        merged = {**base_defaults, **update_data}
        new_prefs = UserPreferencesCreate(user_id=user_id, **merged)

        result = await db.user_preferences.insert_one(new_prefs.model_dump())
        created = await db.user_preferences.find_one({"_id": result.inserted_id})
        return UserPreferencesInDB(**created)
