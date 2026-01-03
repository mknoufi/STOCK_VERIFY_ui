import asyncio
import os
import sys
import logging

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from motor.motor_asyncio import AsyncIOMotorClient
from backend.utils.auth_utils import get_password_hash
from backend.utils.crypto_utils import get_pin_lookup_hash
from backend.config import settings


async def fix_pins():
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    users_config = {"staff1": "1234", "supervisor": "1234", "admin": "1234"}

    for username, pin in users_config.items():
        logger.info(f"Checking user: {username}")
        user = await db.users.find_one({"username": username})

        if not user:
            logger.warning(f"User {username} not found!")
            continue

        # Always update to ensure correct PIN hashes
        pin_hash = get_password_hash(pin)
        pin_lookup_hash = get_pin_lookup_hash(pin)

        result = await db.users.update_one(
            {"username": username},
            {"$set": {"pin_hash": pin_hash, "pin_lookup_hash": pin_lookup_hash}},
        )

        if result.modified_count > 0:
            logger.info(f"✓ Updated PIN for {username}")
        else:
            logger.info(f"- {username} already has correct PIN/no changes needed")

    logger.info("Fix complete!")


if __name__ == "__main__":
    asyncio.run(fix_pins())
