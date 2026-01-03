import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings
from backend.utils.auth_utils import get_password_hash

async def reset_password():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    hashed_password = str(get_password_hash("password"))
    print(f"Generated hash: {hashed_password}")

    # Use update_one with explicit dictionary
    update_doc = {"$set": {"hashed_password": hashed_password}}

    # Note: In bash heredoc, $ might be interpreted. I escaped it above.
    # But wait, if I escape it in heredoc, it might be passed as $set to python?
    # Let's check the file content after creation.

    result = await db.users.update_one(
        {"username": "admin"},
        {"$set": {"hashed_password": hashed_password}}
    )

    if result.modified_count > 0:
        print("Admin password reset to 'password'")
    else:
        print("Admin user not found or password already set")

if __name__ == "__main__":
    asyncio.run(reset_password())
