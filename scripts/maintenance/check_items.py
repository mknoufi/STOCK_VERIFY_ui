
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

async def check_items():
    mongo_url = settings.MONGO_URL
    client = AsyncIOMotorClient(mongo_url)
    db = client[settings.DB_NAME]

    count = await db.items.count_documents({})
    print(f"Total items in MongoDB: {count}")

    if count > 0:
        sample = await db.items.find_one({})
        print(f"Sample item: {sample.get('item_name', 'N/A')} ({sample.get('barcode', 'N/A')})")

if __name__ == "__main__":
    asyncio.run(check_items())
