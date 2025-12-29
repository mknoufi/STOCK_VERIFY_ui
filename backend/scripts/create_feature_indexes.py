"""
Create database indexes for new features
Run this script to create indexes for:
- Export schedules
- Export results
- Sync conflicts
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import Any

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "stock_count")

# Index definitions: (collection, index_fields, description)
_FEATURE_INDEXES: list[tuple[str, list[tuple[str, int]], str]] = [
    ("export_schedules", [("next_run", 1), ("enabled", 1)], "next_run + enabled"),
    (
        "export_schedules",
        [("created_by", 1), ("created_at", -1)],
        "created_by + created_at",
    ),
    (
        "export_results",
        [("schedule_id", 1), ("created_at", -1)],
        "schedule_id + created_at",
    ),
    ("export_results", [("created_at", -1)], "created_at"),
    ("sync_conflicts", [("status", 1), ("created_at", -1)], "status + created_at"),
    ("sync_conflicts", [("session_id", 1), ("user", 1)], "session_id + user"),
    (
        "sync_conflicts",
        [("entity_type", 1), ("entity_id", 1)],
        "entity_type + entity_id",
    ),
]

# Verification indexes: (collection, expected_index_name)
_VERIFY_INDEXES = [
    ("export_schedules", "next_run_1_enabled_1"),
    ("export_results", "schedule_id_1_created_at_-1"),
    ("sync_conflicts", "status_1_created_at_-1"),
]


async def _create_index(
    db: Any, collection: str, fields: list[tuple[str, int]], desc: str
) -> None:
    """Create a single index."""
    try:
        await db[collection].create_index(fields)
        print(f"  ✓ Index: {desc}")
    except Exception as e:
        print(f"  ✗ Error: {e}")


async def create_indexes():
    """Create all required indexes for new features"""
    print("=" * 60)
    print("CREATING DATABASE INDEXES FOR NEW FEATURES")
    print("=" * 60)
    print()
    print(f"Connecting to MongoDB: {MONGO_URL}")

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        await db.command("ping")
        print("✓ Database connection successful")
        print()

        current_collection = None
        for collection, fields, desc in _FEATURE_INDEXES:
            if collection != current_collection:
                if current_collection is not None:
                    print()
                print(f"Creating indexes for {collection} collection...")
                current_collection = collection
            await _create_index(db, collection, fields, desc)

        print("\n" + "=" * 60)
        print("VERIFYING INDEXES")
        print("=" * 60)

        for collection_name, index_name in _VERIFY_INDEXES:
            indexes = await db[collection_name].index_information()
            status = "✓" if index_name in indexes else "✗ NOT FOUND"
            print(f"{status} {collection_name}.{index_name}")

        print("\n" + "=" * 60)
        print("✅ INDEX CREATION COMPLETE!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False
    finally:
        client.close()

    return True


if __name__ == "__main__":
    success = asyncio.run(create_indexes())
    sys.exit(0 if success else 1)
