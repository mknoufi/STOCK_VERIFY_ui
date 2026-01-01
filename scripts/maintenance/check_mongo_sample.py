import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient

# Add project root to path
sys.path.append(os.getcwd())

from backend.config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]
    collections = await db.list_collection_names()
    print(f"Collections in {settings.DB_NAME}: {collections}")

    # Try 'erp_items'
    for coll_name in ['erp_items', 'items', 'products', 'item_batches']:
        if coll_name in collections:
            item = await db[coll_name].find_one()
            print(f"\nSample Item from {coll_name}:")
            if item:
                for key, value in item.items():
                    print(f"  {key}: {value}")
            else:
                print(f"  No items found in {coll_name}.")

if __name__ == "__main__":
    asyncio.run(check())
