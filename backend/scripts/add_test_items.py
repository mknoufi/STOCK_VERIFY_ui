#!/usr/bin/env python3
"""
Add Test Items to MongoDB
Quick script to add test items for development/testing
"""

import asyncio
import sys
from datetime import datetime

import settings
from motor.motor_asyncio import AsyncIOMotorClient


async def add_test_items():
    try:
        client: AsyncIOMotorClient = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client["stock_verify"]

        # Check connection
        await client.admin.command("ping")
        print("✅ MongoDB connection successful")

        # Test items with the barcode from the error
        test_items = [
            {
                "item_code": "ITEM001",
                "item_name": "Test Item 1",
                "barcode": "523658",
                "stock_qty": 100.0,
                "mrp": 50.0,
                "category": "Test",
                "warehouse": "Main",
                "synced_at": datetime.utcnow(),
                "synced_from_erp": False,
                "created_at": datetime.utcnow(),
            },
            {
                "item_code": "ITEM002",
                "item_name": "Test Item 2",
                "barcode": "123456",
                "stock_qty": 200.0,
                "mrp": 75.0,
                "category": "Test",
                "warehouse": "Main",
                "synced_at": datetime.utcnow(),
                "synced_from_erp": False,
                "created_at": datetime.utcnow(),
            },
            {
                "item_code": "ITEM003",
                "item_name": "Test Item 3",
                "barcode": "789012",
                "stock_qty": 150.0,
                "mrp": 60.0,
                "category": "Test",
                "warehouse": "Main",
                "synced_at": datetime.utcnow(),
                "synced_from_erp": False,
                "created_at": datetime.utcnow(),
            },
        ]

        # Check if items already exist
        existing_count = await db.erp_items.count_documents({})
        if existing_count > 0:
            print(f"⚠️  MongoDB already has {existing_count} items")
            response = input("Do you want to add test items anyway? (y/n): ")
            if response.lower() != "y":
                print("❌ Cancelled")
                client.close()
                return

        # Insert test items
        result = await db.erp_items.insert_many(test_items)
        print(f"✅ Added {len(result.inserted_ids)} test items to MongoDB")
        print("\n📋 Added items:")
        for item in test_items:
            print(f"  - {item['item_code']}: {item['item_name']} (Barcode: {item['barcode']})")

        # Verify
        total_count = await db.erp_items.count_documents({})
        print(f"\n📦 Total items in MongoDB: {total_count}")

        client.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(add_test_items())
