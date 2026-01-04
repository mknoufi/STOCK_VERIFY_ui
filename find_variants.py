import asyncio
import sys
from pathlib import Path
import os

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Mock environment variables if needed for config
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "stock_verify")

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

async def find_variants():
    print(f"Connecting to {settings.MONGO_URL}...")
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    print("Searching for items with the same name...")

    pipeline = [
        {
            "$group": {
                "_id": "$item_name",
                "count": {"$sum": 1},
                "items": {"$push": {
                    "item_code": "$item_code",
                    "barcode": "$barcode",
                    "stock": "$stock_qty",
                    "mrp": "$mrp",
                    "sale_price": "$sale_price"
                }}
            }
        },
        {
            "$match": {
                "count": {"$gt": 1}
            }
        },
        {
            "$sort": {"count": -1}
        },
        {
            "$limit": 10
        }
    ]

    cursor = db.items.aggregate(pipeline)

    found = False
    async for result in cursor:
        found = True
        name = result["_id"]
        count = result["count"]
        print(f"\nFound {count} variants for '{name}':")
        for item in result["items"]:
            print(f"  - Code: {item.get('item_code')}, Barcode: {item.get('barcode')}, Stock: {item.get('stock')}, MRP: {item.get('mrp')}")

    if not found:
        print("\nNo items with duplicate names found in 'items' collection.")

        # Try erp_items if items is empty or no dups
        print("\nChecking 'erp_items' collection...")
        cursor = db.erp_items.aggregate(pipeline)
        async for result in cursor:
            name = result["_id"]
            count = result["count"]
            print(f"\nFound {count} variants for '{name}':")
            for item in result["items"]:
                print(f"  - Code: {item.get('item_code')}, Barcode: {item.get('barcode')}, Stock: {item.get('stock')}, MRP: {item.get('mrp')}")

if __name__ == "__main__":
    asyncio.run(find_variants())
