"""
Backfill script to populate new fields (subcategory, floor, rack, UOM, sales/purchase info) in existing MongoDB items
This script fetches data from SQL Server and updates MongoDB items
"""

import asyncio
import logging
import sys
from datetime import date, datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from backend.sql_server_connector import SQLServerConnector

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def _numeric_or_none(value):
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _normalize_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time()).isoformat()
    try:
        return str(value)
    except Exception:
        return None


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

        # Get all items from SQL Server (Top 1000)
        logger.info("Fetching top 1000 items from SQL Server...")
        sql_items = sql_connector.get_all_items()
        logger.info(f"Found {len(sql_items)} items in SQL Server (Top 1000)")

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
            "fetched_individually": 0,
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

            # Fallback: Fetch individually if not found in bulk list
            if not sql_item:
                try:
                    # logger.info(f"Item {item_code} not in bulk list, fetching individually...")
                    sql_item = sql_connector.get_item_by_code(item_code)
                    if sql_item:
                        stats["fetched_individually"] += 1
                        # Add to map to avoid re-fetching if duplicates exist (unlikely for item_code but good practice)
                        sql_item_map[item_code] = sql_item
                except Exception as e:
                    logger.warning(f"Failed to fetch item {item_code} individually: {e}")

            if not sql_item:
                stats["not_found_in_sql"] += 1
                # logger.debug(f"Item {item_code} not found in SQL Server")
                continue

            try:
                set_fields = {
                    "subcategory": sql_item.get("subcategory", ""),
                    "floor": sql_item.get("floor", ""),
                    "rack": sql_item.get("rack", ""),
                    "uom_code": sql_item.get("uom_code", ""),
                    "uom_name": sql_item.get("uom_name", ""),
                    "data_version": 3,
                    "last_backfill": datetime.utcnow(),
                }

                numeric_candidates = {
                    "purchase_price": _numeric_or_none(sql_item.get("purchase_price")),
                    "purchase_qty": _numeric_or_none(sql_item.get("purchase_qty")),
                    "last_purchase_cost": _numeric_or_none(sql_item.get("last_purchase_cost")),
                    "last_purchase_rate": _numeric_or_none(sql_item.get("last_purchase_rate")),
                    "sale_price": _numeric_or_none(sql_item.get("sale_price")),
                    "sales_price": _numeric_or_none(sql_item.get("sales_price")),
                    "last_purchase_price": _numeric_or_none(sql_item.get("last_purchase_price")),
                    "last_purchase_qty": _numeric_or_none(sql_item.get("last_purchase_qty")),
                    "gst_percent": _numeric_or_none(sql_item.get("gst_percent")),
                    "sgst_percent": _numeric_or_none(sql_item.get("sgst_percent")),
                    "cgst_percent": _numeric_or_none(sql_item.get("cgst_percent")),
                    "igst_percent": _numeric_or_none(sql_item.get("igst_percent")),
                }

                for field, value in numeric_candidates.items():
                    if value is not None:
                        set_fields[field] = value

                string_candidates = {
                    "supplier_id": sql_item.get("supplier_id"),
                    "supplier_code": sql_item.get("supplier_code"),
                    "supplier_name": sql_item.get("supplier_name"),
                    "supplier_phone": sql_item.get("supplier_phone"),
                    "supplier_city": sql_item.get("supplier_city"),
                    "supplier_state": sql_item.get("supplier_state"),
                    "supplier_gst": sql_item.get("supplier_gst"),
                    "purchase_invoice_no": sql_item.get("purchase_invoice_no"),
                    "purchase_reference": sql_item.get("purchase_reference"),
                    "purchase_voucher_type": sql_item.get("purchase_voucher_type"),
                    "hsn_code": sql_item.get("hsn_code"),
                    "gst_category": sql_item.get("gst_category"),
                    "batch_id": sql_item.get("batch_id"),
                    "batch_no": sql_item.get("batch_no"),
                    "last_purchase_supplier": sql_item.get("last_purchase_supplier"),
                    "purchase_type": sql_item.get("purchase_type"),
                }

                for field, value in string_candidates.items():
                    if value not in (None, ""):
                        set_fields[field] = value

                if sql_item.get("last_purchase_date"):
                    set_fields["last_purchase_date"] = sql_item.get("last_purchase_date")

                date_candidates = {
                    "manufacturing_date": _normalize_date(sql_item.get("mfg_date")),
                    "expiry_date": _normalize_date(sql_item.get("expiry_date")),
                }

                for field, value in date_candidates.items():
                    if value:
                        set_fields[field] = value

                # Only update if at least one field differs
                needs_update = False
                for field, new_value in set_fields.items():
                    if field in ("data_version", "last_backfill"):
                        continue
                    current_value = mongo_item.get(field)

                    # Handle float comparison
                    if isinstance(current_value, float) and isinstance(new_value, float):
                        if abs(current_value - new_value) > 0.001:
                            needs_update = True
                            break
                    elif current_value != new_value and not (
                        current_value is None and new_value in ("", None)
                    ):
                        needs_update = True
                        break

                if needs_update:
                    await db.erp_items.update_one(
                        {"item_code": item_code},
                        {"$set": set_fields},
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
        logger.info(f"Total SQL Server items (bulk): {stats['total_sql_items']}")
        logger.info(f"Items fetched individually: {stats['fetched_individually']}")
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
