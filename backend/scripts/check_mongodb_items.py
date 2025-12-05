#!/usr/bin/env python3
"""
Check MongoDB Items Count
Quick script to check if MongoDB has items synced
"""

import asyncio
import sys

from motor.motor_asyncio import AsyncIOMotorClient


async def check_items():
    try:
        client: AsyncIOMotorClient = AsyncIOMotorClient("mongodb://localhost:27017")
        db = client["stock_verification"]  # Updated to match config.py DB_NAME

        # Check connection
        await client.admin.command("ping")
        print("✅ MongoDB connection successful")

        # Count items
        count = await db.erp_items.count_documents({})
        print(f"📦 MongoDB Items Count: {count}")

        # Show sample items if any
        if count > 0:
            print("\n📋 Sample items (first 5):")
            items = await db.erp_items.find({}).limit(5).to_list(5)
            for item in items:
                print(
                    f"  - {item.get('item_code', 'N/A')}: {item.get('item_name', 'N/A')} (Barcode: {item.get('barcode', 'N/A')})"
                )
        else:
            print("⚠️  No items found in MongoDB!")
            print("   Items need to be synced from SQL Server to MongoDB")
            print("   Check SQL Server connection and trigger sync")

        client.close()
        return count

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    count = asyncio.run(check_items())
    sys.exit(0 if count > 0 else 1)
