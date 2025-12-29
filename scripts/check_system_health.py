import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")


async def check_system():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.stock_verification

    print("--- Checks for 'erp_items' Collection ---")
    indexes = await db.erp_items.index_information()
    print("Indexes:", indexes)

    # Check for unique index on item_code
    has_unique = False
    for name, info in indexes.items():
        if info["key"] == [("item_code", 1)] and info.get("unique"):
            has_unique = True
            print(f"✅ Unique index '{name}' exists on 'item_code'.")

    if not has_unique:
        print("❌ MISSING unique index on 'item_code'.")

    print("\n--- Check 'SUJ001' Data ---")
    item = await db.erp_items.find_one({"item_code": "SUJ001"})
    print("ERP Item:", item)

    print("\n--- Check 'count_lines' for SUJ001 ---")
    count_line = await db.count_lines.find_one({"item_code": "SUJ001"})
    print("Count Line:", count_line)


if __name__ == "__main__":
    asyncio.run(check_system())
