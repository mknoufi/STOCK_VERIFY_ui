"""
Create database indexes for new features
Run this script to create indexes for:
- Export schedules
- Export results
- Sync conflicts
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

import os  # noqa: E402

from dotenv import load_dotenv  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402  # noqa: E402

# Load environment
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "stock_count")


async def create_indexes():
    """Create all required indexes for new features"""
    print("=" * 60)
    print("CREATING DATABASE INDEXES FOR NEW FEATURES")
    print("=" * 60)
    print()

    # Connect to database
    print(f"Connecting to MongoDB: {MONGO_URL}")
    client: AsyncIOMotorClient = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        # Test connection
        await db.command("ping")
        print("✓ Database connection successful")
        print()

        # Export schedules indexes
        # Export schedules indexes
        await _create_export_schedules_indexes(db)

        # Export results indexes
        await _create_export_results_indexes(db)

        # Sync conflicts indexes
        await _create_sync_conflicts_indexes(db)

        # Verify indexes
        print("\n" + "=" * 60)
        print("VERIFYING INDEXES")
        print("=" * 60)

        collections = [
            ("export_schedules", "next_run_1_enabled_1"),
            ("export_results", "schedule_id_1_created_at_-1"),
            ("sync_conflicts", "status_1_created_at_-1"),
        ]

        for collection_name, index_name in collections:
            indexes = await db[collection_name].index_information()
            if index_name in indexes:
                print(f"✓ {collection_name}.{index_name}")
            else:
                print(f"✗ {collection_name}.{index_name} NOT FOUND")

        print("\n" + "=" * 60)
        print("✅ INDEX CREATION COMPLETE!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False
    finally:
        client.close()

    return True


async def _create_export_schedules_indexes(db):
    print("Creating indexes for export_schedules collection...")
    try:
        await db.export_schedules.create_index([("next_run", 1), ("enabled", 1)])
        print("  ✓ Index: next_run + enabled")

        await db.export_schedules.create_index([("created_by", 1), ("created_at", -1)])
        print("  ✓ Index: created_by + created_at")
    except Exception as e:
        print(f"  ✗ Error: {e}")


async def _create_export_results_indexes(db):
    print("\nCreating indexes for export_results collection...")
    try:
        await db.export_results.create_index([("schedule_id", 1), ("created_at", -1)])
        print("  ✓ Index: schedule_id + created_at")

        await db.export_results.create_index([("created_at", -1)])
        print("  ✓ Index: created_at")
    except Exception as e:
        print(f"  ✗ Error: {e}")


async def _create_sync_conflicts_indexes(db):
    print("\nCreating indexes for sync_conflicts collection...")
    try:
        await db.sync_conflicts.create_index([("status", 1), ("created_at", -1)])
        print("  ✓ Index: status + created_at")

        await db.sync_conflicts.create_index([("session_id", 1), ("user", 1)])
        print("  ✓ Index: session_id + user")

        await db.sync_conflicts.create_index([("entity_type", 1), ("entity_id", 1)])
        print("  ✓ Index: entity_type + entity_id")
    except Exception as e:
        print(f"  ✗ Error: {e}")


if __name__ == "__main__":
    success = asyncio.run(create_indexes())
    sys.exit(0 if success else 1)
