import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

async def check_items():
    output = []
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    output.append(f"Checking database: {settings.DB_NAME}")

    # Check collections
    collections = await db.list_collection_names()
    output.append(f"Collections: {collections}")

    # Check items count
    if "items" in collections:
        count = await db.items.count_documents({})
        output.append(f"Items count: {count}")
        if count > 0:
            item = await db.items.find_one()
            output.append(f"Sample item: {item}")
    else:
        output.append("No 'items' collection found.")

    # Check erp_items count (if used for caching/sync)
    if "erp_items" in collections:
        count = await db.erp_items.count_documents({})
        output.append(f"ERP Items count: {count}")
        if count > 0:
            item = await db.erp_items.find_one()
            output.append(f"Sample ERP item: {item}")

    with open("mongo_check_output.txt", "w") as f:
        f.write("\n".join(output))

if __name__ == "__main__":
    asyncio.run(check_items())
