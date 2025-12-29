import asyncio
import logging
import sys
from pathlib import Path
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

# Add project root to path
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.sql_server_connector import SQLServerConnector
from backend.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_to_batch_id():
    # Connect to SQL
    sql = SQLServerConnector()
    try:
        if not settings.SQL_SERVER_HOST:
            logger.error("SQL_SERVER_HOST not configured in settings")
            return

        sql.connect(
            host=settings.SQL_SERVER_HOST,
            port=settings.SQL_SERVER_PORT,
            database=settings.SQL_SERVER_DATABASE,
            user=settings.SQL_SERVER_USER,
            password=settings.SQL_SERVER_PASSWORD
        )
    except Exception as e:
        logger.error(f"Failed to connect to SQL: {e}")
        return

    # Connect to Mongo
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    logger.info(f"Connected to MongoDB: {settings.DB_NAME}")
    logger.info("Fetching all items from SQL...")
    sql_items = sql.get_all_items()
    logger.info(f"Found {len(sql_items)} items in SQL.")

    logger.info("Updating MongoDB items with batch_id and additional barcodes...")

    batch_size = 1000
    total_updated = 0

    for i in range(0, len(sql_items), batch_size):
        batch = sql_items[i:i+batch_size]

        for item in batch:
            barcode = item.get('barcode')
            batch_id = item.get('batch_id')
            manual_barcode = item.get('manual_barcode')
            unit2_barcode = item.get('unit2_barcode')
            unit_m_barcode = item.get('unit_m_barcode')
            modified_date = item.get('modified_date')

            if not barcode or not batch_id:
                continue

            # Update by barcode (since it's currently our unique key)
            # We add batch_id and other barcodes
            update_fields = {
                "batch_id": batch_id,
                "manual_barcode": manual_barcode,
                "unit2_barcode": unit2_barcode,
                "unit_m_barcode": unit_m_barcode,
                "sql_modified_date": modified_date
            }

            try:
                result = await db.erp_items.update_one(
                    {"barcode": barcode},
                    {"$set": update_fields}
                )
                if result.modified_count > 0:
                    total_updated += 1
            except Exception as e:
                logger.error(f"Error updating barcode {barcode}: {e}")

        logger.info(f"Processed {min(i + batch_size, len(sql_items))}/{len(sql_items)} items... (Updated: {total_updated})")

    logger.info(f"Migration complete. Total items updated: {total_updated}")

if __name__ == "__main__":
    asyncio.run(migrate_to_batch_id())
