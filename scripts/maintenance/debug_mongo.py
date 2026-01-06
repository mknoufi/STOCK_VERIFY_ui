import asyncio
import sys
from pathlib import Path
import os

print("Starting debug script...")

# Add project root to path
project_root = Path(__file__).parents[2]
sys.path.insert(0, str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

async def check_items():
    print(f"MONGO_URL: {settings.MONGO_URL}")
    print(f"DB_NAME: {settings.DB_NAME}")

    try:
        client = AsyncIOMotorClient(settings.MONGO_URL, serverSelectionTimeoutMS=2000)
        # Force connection
        await client.server_info()
        print("Connected to MongoDB successfully.")

        db = client[settings.DB_NAME]
        print(f"Checking database: {settings.DB_NAME}")

        # Check collections
        collections = await db.list_collection_names()
        print(f"Collections: {collections}")

        # Check erp_items count
        if "erp_items" in collections:
            count = await db.erp_items.count_documents({})
            print(f"ERP Items count: {count}")
            if count > 0:
                item = await db.erp_items.find_one()
                print(f"Sample ERP item: {item}")
        else:
            print("No 'erp_items' collection found.")

    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")

if __name__ == "__main__":
    asyncio.run(check_items())
