import asyncio

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "stock_verify"
COLLECTION = "erp_items"


async def create_indexes():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    coll = db[COLLECTION]
    # Single field indexes
    await coll.create_index([("category", 1)], background=True)
    await coll.create_index([("subcategory", 1)], background=True)
    await coll.create_index([("floor", 1)], background=True)
    await coll.create_index([("rack", 1)], background=True)
    await coll.create_index([("warehouse", 1)], background=True)
    await coll.create_index([("uom_code", 1)], background=True)
    await coll.create_index([("verified", 1)], background=True)
    # Text index for item_name and compound for item_code, barcode
    await coll.create_index(
        [("item_name", "text"), ("item_code", 1), ("barcode", 1)], background=True
    )
    print("Indexes created successfully")


if __name__ == "__main__":
    asyncio.run(create_indexes())
