import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client: AsyncIOMotorClient = AsyncIOMotorClient(MONGO_URL)
db = client.stock_verification


async def fix_duplicate_10003():
    item_code = "10003"
    print(f"Checking for duplicates of item_code: {item_code}")

    cursor = db.erp_items.find({"item_code": item_code})
    items = await cursor.to_list(length=100)

    count = len(items)
    print(f"Found {count} items.")

    if count > 1:
        print("Duplicates found. Keeping the first one and removing the rest.")
        # Sort by verified status or completeness if possible, or just arbitrary
        # In this case, we'll keep the first one

        keep_id = items[0]["_id"]
        print(f"Keeping item with _id: {keep_id}")

        for i in range(1, count):
            remove_id = items[i]["_id"]
            print(f"Removing duplicate with _id: {remove_id}")
            await db.erp_items.delete_one({"_id": remove_id})

        print("Deduping complete.")
    else:
        print("No duplicates needed to be removed.")


if __name__ == "__main__":
    asyncio.run(fix_duplicate_10003())
