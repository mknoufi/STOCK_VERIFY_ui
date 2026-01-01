import asyncio
import logging
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.config import settings
from motor.motor_asyncio import AsyncIOMotorClient
from backend.utils.auth_utils import verify_password
from backend.utils.crypto_utils import get_pin_lookup_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def verify_pin_login():
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    username = "staff1"
    pin = "1234"
    logger.info(f"Verifying PIN login for user: {username} with PIN: {pin}")

    # 1. Check user exists
    user = await db.users.find_one({"username": username})
    if not user:
        logger.error(f"User {username} not found!")
        return

    logger.info(f"User found: {user['_id']}")

    # 2. Check PIN hash
    if "pin_hash" not in user:
        logger.error("User has no pin_hash set!")
    else:
        logger.info("User has pin_hash set")
        if verify_password(pin, user["pin_hash"]):
            logger.info("✓ PIN verification (bcrypt) passed")
        else:
            logger.error("✗ PIN verification (bcrypt) failed")

    # 3. Check Lookup Hash
    if "pin_lookup_hash" not in user:
        logger.error("User has no pin_lookup_hash set!")
    else:
        logger.info("User has pin_lookup_hash set")
        expected_hash = get_pin_lookup_hash(pin)
        if user["pin_lookup_hash"] == expected_hash:
            logger.info("✓ PIN lookup hash matches")
        else:
            logger.error(
                f"✗ PIN lookup hash mismatch! Db: {user['pin_lookup_hash']}, Calc: {expected_hash}"
            )

    logger.info("Verification complete.")


if __name__ == "__main__":
    asyncio.run(verify_pin_login())
