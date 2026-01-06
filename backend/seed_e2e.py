import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.server import client, db  # noqa: E402


async def seed_e2e_item():
    print("Seeding E2E test item...")
    item = {
        "item_code": "ITEM_TEST_E2E",
        "item_name": "E2E Test Item",
        "barcode": "513456",
        "stock_qty": 100.0,
        "mrp": 999.0,
        "category": "Test",
        "warehouse": "Main",
    }

    # Upsert based on barcode
    result = await db.erp_items.update_one({"barcode": "513456"}, {"$set": item}, upsert=True)
    print(
        f"Seeding complete. Match count: {result.matched_count}, Modified: {result.modified_count}, Upserted: {result.upserted_id}"
    )
    client.close()


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(seed_e2e_item())
