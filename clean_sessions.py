import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

# Add project root to path
sys.path.append(os.getcwd())

from backend.config import settings

async def clean_sessions():
    print(f"Connecting to {settings.MONGO_URL}")
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    # Find invalid sessions
    # Missing staff_user OR missing warehouse OR missing staff_name
    query = {
        "$or": [
            {"staff_user": {"$exists": False}},
            {"staff_user": None},
            {"warehouse": {"$exists": False}},
            {"warehouse": None},
            {"staff_name": {"$exists": False}},
            {"staff_name": None}
        ]
    }

    count = await db.sessions.count_documents(query)
    print(f"Found {count} invalid sessions.")

    if count > 0:
        result = await db.sessions.delete_many(query)
        print(f"Deleted {result.deleted_count} invalid sessions.")
    else:
        print("No invalid sessions found.")

if __name__ == "__main__":
    asyncio.run(clean_sessions())
