#!/usr/bin/env python3
"""
Phase 2: Clean up empty old collections from MongoDB.
Drops verification_sessions and verification_records since they are empty (0 documents).
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings


async def cleanup_old_collections():
    """Drop empty old collections that have been replaced."""

    print("=" * 80)
    print("🧹 Phase 2: MongoDB Collection Cleanup")
    print("=" * 80)
    print(f"\nConnecting to: {settings.DB_NAME}")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    try:
        old_collections = ["verification_sessions", "verification_records"]

        for collection_name in old_collections:
            print(f"\n📋 Processing: {collection_name}")

            # Check if collection exists
            all_collections = await db.list_collection_names()
            if collection_name not in all_collections:
                print(f"  ✅ Collection doesn't exist - already cleaned")
                continue

            # Get document count
            count = await db[collection_name].count_documents({})

            if count > 0:
                print(f"  ⚠️  WARNING: Collection has {count} documents!")
                print(f"  ❌ SKIPPING - Not safe to drop (should be empty)")
                continue

            # Drop empty collection
            print(f"  🗑️  Collection is empty (0 documents)")
            await db.drop_collection(collection_name)
            print(f"  ✅ Dropped successfully")

        print("\n" + "=" * 80)
        print("✅ Cleanup Complete!")
        print("=" * 80)

        # Verify new collections exist
        print("\n🔍 Verification:")
        all_collections = await db.list_collection_names()

        new_collections = ["sessions", "count_lines"]
        for collection_name in new_collections:
            if collection_name in all_collections:
                count = await db[collection_name].count_documents({})
                print(f"  ✅ {collection_name}: {count:,} documents")
            else:
                print(f"  ❌ {collection_name}: NOT FOUND")

        # Confirm old collections are gone
        print("\n🗑️  Old collections status:")
        for collection_name in old_collections:
            if collection_name not in all_collections:
                print(f"  ✅ {collection_name}: Removed")
            else:
                print(f"  ⚠️  {collection_name}: Still exists")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print("\n✅ Connection closed")


if __name__ == "__main__":
    print("\n⚠️  This script will DROP empty old collections:")
    print("  - verification_sessions (0 documents)")
    print("  - verification_records (0 documents)")
    print("\nPress Ctrl+C to cancel, or wait 3 seconds to proceed...")

    import time
    try:
        time.sleep(3)
        asyncio.run(cleanup_old_collections())
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(1)
