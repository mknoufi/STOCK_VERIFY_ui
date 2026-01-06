import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from backend.config import settings  # noqa: E402


async def seed_data():
    log_output = []
    log_output.append(f"Connecting to {settings.MONGO_URL}...")
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    items = [
        {
            "item_code": "MAN001",
            "item_name": "Manual Test Item",
            "barcode": "510001",
            "stock_qty": 50.0,
            "mrp": 150.0,
            "category": "Test",
            "warehouse": "Showroom",
            "description": "A manual test item for searching 'man'",
        },
        {
            "item_code": "MAN002",
            "item_name": "Mannequin Stand",
            "barcode": "510002",
            "stock_qty": 10.0,
            "mrp": 2500.0,
            "category": "Fixtures",
            "warehouse": "Store",
            "description": "Display mannequin",
        },
        {
            "item_code": "TEST001",
            "item_name": "Test Product A",
            "barcode": "512321",
            "stock_qty": 100.0,
            "mrp": 99.99,
            "category": "General",
            "warehouse": "Main",
            "description": "Standard test product",
        },
        {
            "item_code": "IPHONE15",
            "item_name": "iPhone 15 Pro",
            "barcode": "539999",
            "stock_qty": 5.0,
            "mrp": 1200.0,
            "category": "Electronics",
            "warehouse": "Secure",
            "description": "Apple smartphone",
        },
    ]

    # Clear existing
    await db.erp_items.delete_many({})
    log_output.append("Cleared erp_items collection.")

    # Insert
    result = await db.erp_items.insert_many(items)
    log_output.append(f"Inserted {len(result.inserted_ids)} items.")

    # Verify
    count = await db.erp_items.count_documents({})
    log_output.append(f"Total items in erp_items: {count}")

    # Write log to file in a known location (project root)
    log_path = project_root / "seed_log.txt"
    with open(log_path, "w") as f:
        f.write("\n".join(log_output))

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())

if __name__ == "__main__":
    asyncio.run(seed_data())
