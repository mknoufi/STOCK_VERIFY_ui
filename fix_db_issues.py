
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from collections import defaultdict

# Add project root to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.utils.port_detector import PortDetector

# Use PortDetector to find the correct Mongo URL
MONGO_URL = PortDetector.get_mongo_url()
DB_NAME = os.getenv("MONGO_DB_NAME", "stock_verification")

async def clean_duplicates():
    print("STARTING FIX_DB_ISSUES.PY")
    print(f"Connecting to {MONGO_URL}...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # 1. Fix Duplicate Key Error in erp_items
    print("\n--- Checking erp_items for duplicates ---")
    collection = db.erp_items
    cursor = collection.find({}, {"item_code": 1})

    item_codes = defaultdict(list)
    async for doc in cursor:
        if "item_code" in doc:
            item_codes[doc["item_code"]].append(doc["_id"])

    duplicates = {k: v for k, v in item_codes.items() if len(v) > 1}

    if duplicates:
        print(f"Found {len(duplicates)} duplicate item_codes.")
        for code, ids in duplicates.items():
            print(f"  Duplicate item_code: {code} (Count: {len(ids)})")
            # Keep the first one, delete the rest
            ids_to_delete = ids[1:]
            result = await collection.delete_many({"_id": {"$in": ids_to_delete}})
            print(f"    Deleted {result.deleted_count} duplicates.")
    else:
        print("No duplicates found in erp_items.")

    # 2. Fix Index Conflict
    print("\n--- Checking indexes ---")

    # List all indexes on erp_items to debug
    print("Indexes on erp_items:")
    async for index in db.erp_items.list_indexes():
        print(f"  {index}")

    print("\n--- Attempting to create idx_barcode ---")
    try:
        await db.erp_items.create_index([("barcode", 1)], name="idx_barcode")
        print("Successfully created idx_barcode.")
    except Exception as e:
        print(f"Failed to create idx_barcode: {e}")
        # If it failed, maybe there is an index on 'barcode' with a different name?
        # Let's check specifically for that.
        print("Checking for existing index on 'barcode'...")
        async for index in db.erp_items.list_indexes():
            key = index.get("key")
            if "barcode" in key:
                print(f"Found index on 'barcode': {index}")
                if index.get("name") != "idx_barcode":
                    print(f"Dropping conflicting index: {index.get('name')}")
                    await db.erp_items.drop_index(index.get("name"))
                    print("Dropped.")

    collections = await db.list_collection_names()
    for col_name in collections:
        indexes = await db[col_name].index_information()
        for index_name in indexes:
            if index_name == "idx_warehouse_status":
                print(f"Found 'idx_warehouse_status' in collection '{col_name}'. Dropping it...")
                await db[col_name].drop_index(index_name)
                print("Dropped.")

            if index_name == "idx_barcode":
                print(f"Found 'idx_barcode' in collection '{col_name}'. Dropping it...")
                await db[col_name].drop_index(index_name)
                print("Dropped.")

    print("\nDone.")

if __name__ == "__main__":
    asyncio.run(clean_duplicates())
