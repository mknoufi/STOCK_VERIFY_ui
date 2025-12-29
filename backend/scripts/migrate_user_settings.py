"""
User Settings Migration Script

Adds default settings fields to existing users who don't have them.
"""

import asyncio
import logging
from datetime import datetime

from backend.db.runtime import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Default settings to apply to users without settings
DEFAULT_USER_SETTINGS = {
    "theme": "light",
    "font_size": 16,
    "primary_color": "#1976D2",
    "haptic_enabled": True,
    "sound_enabled": True,
    "auto_sync_enabled": True,
    "language": "en",
    "updated_at": None,  # Will be set during migration
}


async def migrate_user_settings(db: AsyncIOMotorDatabase) -> dict:
    """
    Migrate user settings to ensure all users have default settings.

    This migration:
    1. Creates user_settings collection if not exists
    2. For each user without settings, creates default settings document
    3. Logs migration statistics

    Args:
        db: MongoDB database instance

    Returns:
        Migration statistics dict
    """
    stats = {
        "total_users": 0,
        "users_with_settings": 0,
        "users_migrated": 0,
        "errors": 0,
    }

    try:
        # Get all users
        users_collection = db["users"]
        settings_collection = db["user_settings"]

        # Count total users
        stats["total_users"] = await users_collection.count_documents({})

        # Get all user IDs
        users_cursor = users_collection.find({}, {"_id": 1, "username": 1})
        users = await users_cursor.to_list(length=None)

        for user in users:
            user_id = str(user["_id"])
            username = user.get("username", "unknown")

            try:
                # Check if user already has settings
                existing_settings = await settings_collection.find_one(
                    {"user_id": user_id}
                )

                if existing_settings:
                    stats["users_with_settings"] += 1
                    logger.debug(f"User {username} already has settings")
                else:
                    # Create default settings for user
                    settings_doc = {
                        "user_id": user_id,
                        **DEFAULT_USER_SETTINGS,
                        "updated_at": datetime.utcnow(),
                        "created_at": datetime.utcnow(),
                    }

                    await settings_collection.insert_one(settings_doc)
                    stats["users_migrated"] += 1
                    logger.info(f"Created default settings for user {username}")

            except Exception as e:
                stats["errors"] += 1
                logger.error(f"Failed to migrate settings for user {username}: {e}")

        logger.info(
            f"Migration complete: {stats['users_migrated']} users migrated, "
            f"{stats['users_with_settings']} already had settings, "
            f"{stats['errors']} errors"
        )

        return stats

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


async def run_migration():
    """Run the migration as a standalone script."""
    from backend.config import settings
    from backend.db.runtime import lifespan_db

    logging.basicConfig(level=logging.INFO)

    try:
        # Connect to MongoDB
        async with lifespan_db(settings.MONGO_URL, settings.DB_NAME):
            db = get_db()

            if db is None:
                logger.error("Failed to get database connection")
                return

            # Run migration
            stats = await migrate_user_settings(db)

            print("\n=== Migration Results ===")
            print(f"Total users: {stats['total_users']}")
            print(f"Already had settings: {stats['users_with_settings']}")
            print(f"Migrated: {stats['users_migrated']}")
            print(f"Errors: {stats['errors']}")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(run_migration())
