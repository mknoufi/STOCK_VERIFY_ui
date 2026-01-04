import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

async def check_items():
    mongo_url = settings.MONGO_URL
    client = AsyncIOMotorClient(mongo_url)
    db = client[settings.DB_NAME]

    count = await db.erp_items.count_documents({})
    print(f"Total items in MongoDB (erp_items): {count}")

    if count > 0:
        sample = await db.erp_items.find_one({})
        print(f"Sample item: {sample}")

if __name__ == "__main__":
    asyncio.run(check_items())
