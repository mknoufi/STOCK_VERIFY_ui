import asyncio
import os
import sys

# Add parent directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import settings
from backend.utils.auth_utils import get_password_hash
from motor.motor_asyncio import AsyncIOMotorClient


async def set_pin(username: str, pin: str):
    print(f"Setting PIN for user: {username}")

    # Direct connection to avoid dependency issues in script
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DB_NAME]

    user = await db.users.find_one({"username": username})
    if not user:
        print(f"Error: User '{username}' not found.")
        return

    pin_hash = get_password_hash(pin)

    result = await db.users.update_one(
        {"username": username}, {"$set": {"pin_hash": pin_hash}}
    )

    if result.modified_count > 0:
        print(f"Success: PIN set for '{username}'.")
    else:
        print("Warning: PIN was not updated (maybe it was already set to this value).")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python set_supervisor_pin.py <username> <pin>")
        sys.exit(1)

    username = sys.argv[1]
    pin = sys.argv[2]

    asyncio.run(set_pin(username, pin))
