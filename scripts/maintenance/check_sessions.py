import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Add project root to path
sys.path.append(os.getcwd())

from backend.config import settings

async def check_sessions():
    print(f"Connecting to {settings.MONGO_URL}")
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    count = await db.sessions.count_documents({})
    print(f"Total sessions: {count}")

    if count > 0:
        sessions = await db.sessions.find().limit(5).to_list(length=5)
        print("\nSample Sessions:")
        for s in sessions:
            print(f"  ID: {s.get('id')}, User: {s.get('staff_user')}, Status: {s.get('status')}")
    else:
        print("No sessions found.")

if __name__ == "__main__":
    asyncio.run(check_sessions())
