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

import os  # noqa: E402

from dotenv import load_dotenv  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from backend.sql_server_connector import SQLServerConnector  # noqa: E402

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


# --------------------------------------------------------------------------- #
# Tuple lists for data-driven field extraction (reduces cyclomatic complexity)
# --------------------------------------------------------------------------- #
_NUMERIC_FIELDS = (
    "purchase_price",
    "purchase_qty",
    "last_purchase_cost",
    "last_purchase_rate",
    "sale_price",
    "sales_price",
    "last_purchase_price",
    "last_purchase_qty",
    "gst_percent",
    "sgst_percent",
    "cgst_percent",
    "igst_percent",
)

_STRING_FIELDS = (
    "supplier_id",
    "supplier_code",
    "supplier_name",
    "supplier_phone",
    "supplier_city",
    "supplier_state",
    "supplier_gst",
    "purchase_invoice_no",
    "purchase_reference",
    "purchase_voucher_type",
    "hsn_code",
    "gst_category",
    "batch_id",
    "batch_no",
    "last_purchase_supplier",
    "purchase_type",
)

_DATE_FIELDS = (
    ("manufacturing_date", "mfg_date"),
    ("expiry_date", "expiry_date"),
)


def _build_set_fields(sql_item):
    """Build the $set update dictionary from a SQL item."""
    set_fields = {
        "subcategory": sql_item.get("subcategory", ""),
        "floor": sql_item.get("floor", ""),
        "rack": sql_item.get("rack", ""),
        "uom_code": sql_item.get("uom_code", ""),
        "uom_name": sql_item.get("uom_name", ""),
        "data_version": 3,
        "last_backfill": datetime.utcnow(),
    }

    for field in _NUMERIC_FIELDS:
        val = _numeric_or_none(sql_item.get(field))
        if val is not None:
            set_fields[field] = val

    for field in _STRING_FIELDS:
        val = sql_item.get(field)
        if val not in (None, ""):
            set_fields[field] = val

    if sql_item.get("last_purchase_date"):
        set_fields["last_purchase_date"] = sql_item.get("last_purchase_date")

    for dest_field, src_field in _DATE_FIELDS:
        val = _normalize_date(sql_item.get(src_field))
        if val:
            set_fields[dest_field] = val

    return set_fields


def _needs_update(mongo_item, set_fields):
    """Check if any field changed enough to warrant an update."""
    for field, new_value in set_fields.items():
        if field in ("data_version", "last_backfill"):
            continue
        current_value = mongo_item.get(field)
        if isinstance(current_value, float) and isinstance(new_value, float):
            if abs(current_value - new_value) > 0.001:
                return True
        elif current_value != new_value and not (current_value is None and new_value in ("", None)):
            return True
    return False


def _connect_sql(sql_host, sql_port, sql_database, sql_user, sql_password):
    """Connect to SQL Server and return the connector."""
    sql_connector = SQLServerConnector()
    sql_connector.connect(sql_host, sql_port, sql_database, sql_user, sql_password)
    return sql_connector


def _fetch_sql_item_fallback(item_code, sql_item_map, sql_connector, stats):
    """Try fetching an item individually from SQL Server if not in bulk map."""
    sql_item = sql_item_map.get(item_code)
    if sql_item:
        return sql_item
    try:
        sql_item = sql_connector.get_item_by_code(item_code)
        if sql_item:
            stats["fetched_individually"] += 1
            sql_item_map[item_code] = sql_item
    except Exception as e:
        logger.warning(f"Failed to fetch item {item_code} individually: {e}")
    return sql_item


async def _apply_update_if_needed(item_code, mongo_item, sql_item, db, stats):
    """Build fields and apply update if changed."""
    set_fields = _build_set_fields(sql_item)
    if _needs_update(mongo_item, set_fields):
        await db.erp_items.update_one({"item_code": item_code}, {"$set": set_fields})
        stats["updated"] += 1
        if stats["updated"] % 100 == 0:
            logger.info(f"Updated {stats['updated']} items so far...")


async def _process_mongo_item(mongo_item, sql_item_map, sql_connector, db, stats):
    """Process a single MongoDB item during backfill."""
    item_code = mongo_item.get("item_code")
    if not item_code:
        logger.warning(f"Skipping item without item_code: {mongo_item.get('_id')}")
        return

    sql_item = _fetch_sql_item_fallback(item_code, sql_item_map, sql_connector, stats)
    if not sql_item:
        stats["not_found_in_sql"] += 1
        return

    try:
        await _apply_update_if_needed(item_code, mongo_item, sql_item, db, stats)
    except Exception as e:
        stats["errors"] += 1
        logger.error(f"Error updating item {item_code}: {str(e)}")


def _log_summary(stats):
    """Log the backfill summary."""
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
        try:
            sql_connector = _connect_sql(sql_host, sql_port, sql_database, sql_user, sql_password)
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
            await _process_mongo_item(mongo_item, sql_item_map, sql_connector, db, stats)

        _log_summary(stats)

        # Disconnect
        sql_connector.disconnect()
        mongo_client.close()
        logger.info("✓ Backfill completed")

    except Exception as e:
        logger.error(f"Backfill failed: {str(e)}", exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(backfill_new_fields())
