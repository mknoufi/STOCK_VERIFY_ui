import asyncio
import os
import sys
from pprint import pprint

# Add project root to path
sys.path.append(os.getcwd())

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings


async def check_sessions():
    try:
        print(f"Connecting to MongoDB at {settings.MONGO_URL}")
        client = AsyncIOMotorClient(settings.MONGO_URL)

        # List all databases
        dbs = await client.list_database_names()
        print(f"Databases found: {dbs}")

        for db_name in dbs:
            if db_name in ["admin", "local", "config"]:
                continue

            print(f"\nScanning DB: {db_name}")
            db = client[db_name]
            collections = await db.list_collection_names()
            if "sessions" in collections:
                count = await db.sessions.count_documents({})
                print(f"  Found 'sessions' collection with {count} documents")
                if count > 0:
                    sessions = await db.sessions.find().to_list(5)
                    print("  Sample sessions:")
                    for s in sessions:
                        print(
                            f"    ID: {s.get('id', s.get('_id'))}, User: {s.get('staff_user')}, Status: {s.get('status')}"
                        )
            else:
                print("  No 'sessions' collection")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(check_sessions())
