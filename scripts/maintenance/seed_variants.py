import asyncio
import sys
from pathlib import Path
import os

# Add project root to path
project_root = Path(__file__).parents[2]
sys.path.insert(0, str(project_root))

# Mock environment variables if needed for config
os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "stock_verify")

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

async def seed_variants():
    print(f"Connecting to {settings.MONGO_URL}...")
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    test_items = [
        {
            "item_code": "TEST001",
            "barcode": "TEST001",
            "item_name": "Test Product Variant",
            "category": "Test Category",
            "subcategory": "Test Sub",
            "stock_qty": 10,
            "current_stock": 10,
            "mrp": 100.0,
            "sale_price": 90.0,
            "uom": "NOS"
        },
        {
            "item_code": "TEST002",
            "barcode": "TEST002",
            "item_name": "Test Product Variant",
            "category": "Test Category",
            "subcategory": "Test Sub",
            "stock_qty": 5,
            "current_stock": 5,
            "mrp": 150.0,
            "sale_price": 140.0,
            "uom": "NOS"
        },
        {
            "item_code": "TEST003",
            "barcode": "TEST003",
            "item_name": "Test Product Variant",
            "category": "Test Category",
            "subcategory": "Test Sub",
            "stock_qty": 0,
            "current_stock": 0,
            "mrp": 200.0,
            "sale_price": 190.0,
            "uom": "NOS"
        }
    ]

    print("Inserting test variants...")
    for item in test_items:
        # Update if exists, else insert
        await db.items.update_one(
            {"item_code": item["item_code"]},
            {"$set": item},
            upsert=True
        )
        print(f"Upserted {item['item_code']}")

    print("Done. You can now search for 'TEST001' or 'Test Product Variant' in the app.")

if __name__ == "__main__":
    asyncio.run(seed_variants())
