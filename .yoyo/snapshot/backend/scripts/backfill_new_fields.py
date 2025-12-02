"""
Backfill script to populate new fields (subcategory, floor, rack, UOM) in existing MongoDB items
This script fetches data from SQL Server and updates MongoDB items
"""

import asyncio
import logging
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.sql_server_connector import SQLServerConnector
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def backfill_new_fields():
    """Backfill new fields from SQL Server to MongoDB"""
    # MongoDB connection
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGODB_DATABASE", "stock_verify")

    # SQL Server connection
    sql_host = os.getenv("SQL_SERVER_HOST")
    sql_port = int(os.getenv("SQL_SERVER_PORT", 1433))
    sql_database = os.getenv("SQL_SERVER_DATABASE")
    sql_user = os.getenv("SQL_SERVER_USER")
    sql_password = os.getenv("SQL_SERVER_PASSWORD")

    if not sql_host or not sql_database:
        logger.error("SQL Server credentials not configured in .env file")
        return

    # Connect to MongoDB
    logger.info(f"Connecting to MongoDB: {mongo_uri}/{db_name}")
    mongo_client = AsyncIOMotorClient(mongo_uri)
    db = mongo_client[db_name]

    try:
        # Test MongoDB connection
        await db.command("ping")
        logger.info("✓ MongoDB connected")

        # Connect to SQL Server
        logger.info(f"Connecting to SQL Server: {sql_host}:{sql_port}/{sql_database}")
        sql_connector = SQLServerConnector()
        try:
            sql_connector.connect(sql_host, sql_port, sql_database, sql_user, sql_password)
            logger.info("✓ SQL Server connected")
        except Exception as e:
            logger.error(f"Failed to connect to SQL Server: {str(e)}")
            return

        # Get all items from SQL Server
        logger.info("Fetching all items from SQL Server...")
        sql_items = sql_connector.get_all_items()
        logger.info(f"Found {len(sql_items)} items in SQL Server")

        # Create a mapping by item_code for quick lookup
        sql_item_map = {item.get("item_code"): item for item in sql_items}

        # Get all items from MongoDB
        logger.info("Fetching all items from MongoDB...")
        mongo_cursor = db.erp_items.find({})
        mongo_items = await mongo_cursor.to_list(length=None)
        logger.info(f"Found {len(mongo_items)} items in MongoDB")

        # Statistics
        stats = {
            "total_mongo_items": len(mongo_items),
            "total_sql_items": len(sql_items),
            "updated": 0,
            "not_found_in_sql": 0,
            "errors": 0,
        }

        # Update each MongoDB item
        logger.info("Updating MongoDB items with new fields...")
        for mongo_item in mongo_items:
            item_code = mongo_item.get("item_code")
            if not item_code:
                logger.warning(f"Skipping item without item_code: {mongo_item.get('_id')}")
                continue

            sql_item = sql_item_map.get(item_code)
            if not sql_item:
                stats["not_found_in_sql"] += 1
                logger.debug(f"Item {item_code} not found in SQL Server")
                continue

            try:
                # Prepare update document with new fields
                update_doc = {
                    "$set": {
                        "subcategory": sql_item.get("subcategory", ""),
                        "floor": sql_item.get("floor", ""),
                        "rack": sql_item.get("rack", ""),
                        "uom_code": sql_item.get("uom_code", ""),
                        "uom_name": sql_item.get("uom_name", ""),
                        "data_version": 3,
                        "last_backfill": datetime.utcnow(),
                    }
                }

                # Only update if fields are missing or different
                needs_update = False
                for field in ["subcategory", "floor", "rack", "uom_code", "uom_name"]:
                    current_value = mongo_item.get(field, "")
                    new_value = sql_item.get(field, "")
                    if current_value != new_value:
                        needs_update = True
                        break

                if needs_update:
                    await db.erp_items.update_one(
                        {"item_code": item_code},
                        update_doc,
                    )
                    stats["updated"] += 1
                    if stats["updated"] % 100 == 0:
                        logger.info(f"Updated {stats['updated']} items so far...")

            except Exception as e:
                stats["errors"] += 1
                logger.error(f"Error updating item {item_code}: {str(e)}")

        # Print summary
        logger.info("\n" + "=" * 60)
        logger.info("BACKFILL SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total MongoDB items: {stats['total_mongo_items']}")
        logger.info(f"Total SQL Server items: {stats['total_sql_items']}")
        logger.info(f"Items updated: {stats['updated']}")
        logger.info(f"Items not found in SQL Server: {stats['not_found_in_sql']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info("=" * 60)

        # Disconnect
        sql_connector.disconnect()
        mongo_client.close()
        logger.info("✓ Backfill completed")

    except Exception as e:
        logger.error(f"Backfill failed: {str(e)}", exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(backfill_new_fields())

