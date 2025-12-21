"""
Add Performance Indexes Script
Adds recommended indexes from CODEBASE_ANALYSIS.md for improved query performance
"""

import asyncio
import logging
import os
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Index definitions: collection -> list of index specs
_INDEXES_TO_CREATE = {
    "erp_items": [
        ("data_complete", 1),
        (("last_synced", -1),),
        (("warehouse", 1), ("data_complete", 1)),
        (("category", 1), ("data_complete", 1)),
    ],
    "count_lines": [
        ("verified", 1),
        (("item_code", 1), ("verified", 1)),
        (("verified", 1), ("counted_at", -1)),
    ],
    "sessions": [
        (("created_at", -1),),
        (("status", 1), ("created_at", -1)),
    ],
    "activity_logs": [
        (("created_at", -1),),
        ("user_id", 1),
        (("user_id", 1), ("created_at", -1)),
        ("action", 1),
    ],
}


def _normalize_index_key(index_spec: Any) -> tuple[tuple[str, int], ...]:
    """Convert index spec to normalized tuple format for comparison."""
    if isinstance(index_spec, tuple):
        if len(index_spec) == 2 and isinstance(index_spec[0], str):
            return ((index_spec[0], index_spec[1]),)
        return tuple(
            (k, v) if isinstance(k, str) else tuple(k)
            for k, v in (index_spec if isinstance(index_spec[0], tuple) else [index_spec])
        )
    return ((index_spec, 1),)


async def _create_single_index(
    collection: Any,
    index_spec: Any,
    existing_keys: set[tuple[tuple[str, int], ...]],
) -> None:
    """Create a single index if it doesn't already exist."""
    index_key = _normalize_index_key(index_spec)

    if index_key in existing_keys:
        logger.info(f"  ⏭️  Index already exists: {index_key}")
        return

    try:
        if (
            isinstance(index_spec, tuple)
            and len(index_spec) == 2
            and isinstance(index_spec[0], str)
        ):
            await collection.create_index(index_spec[0], index_spec[1])
        else:
            index_list = list(index_spec) if isinstance(index_spec[0], tuple) else [index_spec]
            await collection.create_index(index_list)
        logger.info(f"  ✓ Created index: {index_key}")
    except Exception as e:
        if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
            logger.info(f"  ⏭️  Index already exists: {index_key}")
        else:
            logger.warning(f"  ✗ Error creating index {index_key}: {str(e)}")


async def add_performance_indexes():
    """Add recommended performance indexes"""
    MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DB_NAME = os.getenv("MONGODB_DB_NAME", "stock_verify")

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        await db.command("ping")
        logger.info("✓ Database connection successful")
        logger.info("")
        logger.info("=" * 60)
        logger.info("ADDING PERFORMANCE INDEXES")
        logger.info("=" * 60)
        logger.info("")

        for collection_name, indexes in _INDEXES_TO_CREATE.items():
            logger.info(f"Processing {collection_name} collection...")
            collection = db[collection_name]

            existing_indexes = await collection.list_indexes().to_list(length=100)
            existing_keys = {tuple(idx.get("key", {}).items()) for idx in existing_indexes}

            for index_spec in indexes:
                await _create_single_index(collection, index_spec, existing_keys)

            logger.info(f"✓ Completed {collection_name}")
            logger.info("")

        logger.info("=" * 60)
        logger.info("INDEX CREATION COMPLETE")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(add_performance_indexes())
