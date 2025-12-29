import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

async def check_items():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    print(f"Checking database: {settings.DB_NAME}")

    # Check collections
    collections = await db.list_collection_names()
    print(f"Collections: {collections}")

    # Check items count
    if "items" in collections:
        count = await db.items.count_documents({})
        print(f"Items count: {count}")
        if count > 0:
            item = await db.items.find_one()
            print(f"Sample item: {item}")
    else:
        print("No 'items' collection found.")

    # Check erp_items count (if used for caching/sync)
    if "erp_items" in collections:
        count = await db.erp_items.count_documents({})
        print(f"ERP Items count: {count}")
        if count > 0:
            item = await db.erp_items.find_one()
            print(f"Sample ERP item: {item}")

if __name__ == "__main__":
    asyncio.run(check_items())
