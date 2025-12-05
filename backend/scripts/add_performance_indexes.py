"""
Add Performance Indexes Script
Adds recommended indexes from CODEBASE_ANALYSIS.md for improved query performance
"""

import asyncio
import logging
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def add_performance_indexes():
    """Add recommended performance indexes"""
    MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DB_NAME = os.getenv("MONGODB_DB_NAME", "stock_verify")

    client: AsyncIOMotorClient = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    try:
        # Test connection
        await db.command("ping")
        logger.info("✓ Database connection successful")
        logger.info("")

        # Recommended indexes from CODEBASE_ANALYSIS.md
        indexes_to_create = {
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

        logger.info("=" * 60)
        logger.info("ADDING PERFORMANCE INDEXES")
        logger.info("=" * 60)
        logger.info("")

        for collection_name, indexes in indexes_to_create.items():
            await _create_indexes_for_collection(db, collection_name, indexes)

        logger.info("=" * 60)
        logger.info("INDEX CREATION COMPLETE")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise
    finally:
        client.close()


async def _create_indexes_for_collection(db, collection_name, indexes):
    logger.info(f"Processing {collection_name} collection...")
    collection = db[collection_name]

    # Check existing indexes
    existing_indexes = await collection.list_indexes().to_list(length=100)
    existing_keys = {tuple(idx.get("key", {}).items()) for idx in existing_indexes}

    for index_spec in indexes:
        try:
            # Normalize index spec to tuple format for comparison
            if isinstance(index_spec, tuple):
                if len(index_spec) == 2 and isinstance(index_spec[0], str):
                    # Single field: ("field", 1)
                    index_key: tuple = ((index_spec[0], index_spec[1]),)
                else:
                    # Compound or nested: (("field", 1),) or (("field1", 1), ("field2", -1))
                    index_key = tuple(
                        (k, v) if isinstance(k, str) else tuple(k)
                        for k, v in (
                            index_spec if isinstance(index_spec[0], tuple) else [index_spec]
                        )
                    )
            else:
                index_key = ((index_spec, 1),)

            # Check if index already exists
            if index_key in existing_keys:
                logger.info(f"  ⏭️  Index already exists: {index_key}")
                continue

            # Create index
            if (
                isinstance(index_spec, tuple)
                and len(index_spec) == 2
                and isinstance(index_spec[0], str)
            ):
                # Single field index
                await collection.create_index(index_spec[0], index_spec[1])
            else:
                # Compound index
                index_list = list(index_spec) if isinstance(index_spec[0], tuple) else [index_spec]
                await collection.create_index(index_list)

            logger.info(f"  ✓ Created index: {index_key}")

        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                logger.info(f"  ⏭️  Index already exists: {index_key}")
            else:
                logger.warning(f"  ✗ Error creating index {index_key}: {str(e)}")

    logger.info(f"✓ Completed {collection_name}")
    logger.info("")


if __name__ == "__main__":
    asyncio.run(add_performance_indexes())
