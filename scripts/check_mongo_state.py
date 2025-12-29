import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_indexes():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.stock_verify

    print("Indexes for erp_items:")
    indexes = await db.erp_items.index_information()
    for name, info in indexes.items():
        print(f"  {name}: {info}")

    print("\nSync Metadata:")
    metadata = await db.sync_metadata.find_one({"_id": "sql_qty_sync"})
    print(f"  {metadata}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_indexes())
