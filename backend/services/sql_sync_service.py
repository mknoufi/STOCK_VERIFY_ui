"""
SQL Sync Service - Sync ONLY quantity changes from SQL Server to MongoDB
CRITICAL: Preserves all enriched data (serial numbers, MRP, HSN codes, etc.)
"""

import asyncio
import logging
from datetime import date, datetime, timedelta
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.sql_server_connector import SQLServerConnector

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers for building item dicts - reduces cyclomatic complexity
# ---------------------------------------------------------------------------


def _normalize_date(value: Any) -> Optional[str]:
    """Convert date/datetime to ISO string, or None."""
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


def _numeric_or_none(value: Any) -> Optional[float]:
    """Convert value to float, or None if not possible."""
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _safe_optional_str(value: Any) -> Optional[str]:
    """Convert value to str, or None if empty/None."""
    if value in (None, ""):
        return None
    return str(value)


# Field definitions for building SQL item dictionaries
# Format: (sql_key, target_key, converter) where converter is one of:
#   "raw" - use value as-is
#   "str" - use _safe_optional_str
#   "num" - use _numeric_or_none
#   "date" - use _normalize_date
_NEW_ITEM_FIELDS: list[tuple[str, str, str]] = [
    # Core descriptive fields
    ("category", "category", "raw"),
    ("subcategory", "subcategory", "raw"),
    ("warehouse", "warehouse", "raw"),
    ("uom_code", "uom_code", "raw"),
    ("uom_name", "uom_name", "raw"),
    ("hsn_code", "hsn_code", "str"),
    ("gst_category", "gst_category", "str"),
    ("gst_percent", "gst_percent", "num"),
    ("sgst_percent", "sgst_percent", "num"),
    ("cgst_percent", "cgst_percent", "num"),
    ("igst_percent", "igst_percent", "num"),
    # Location / placement
    ("barcode", "barcode", "raw"),
    ("location", "location", "raw"),
    ("floor", "floor", "raw"),
    ("rack", "rack", "raw"),
    # Pricing / sales
    ("mrp", "mrp", "num"),
    ("sales_price", "sales_price", "num"),
    ("sale_price", "sale_price", "num"),
    ("standard_rate", "standard_rate", "num"),
    ("last_purchase_rate", "last_purchase_rate", "num"),
    ("last_purchase_price", "last_purchase_price", "num"),
    # Brand
    ("brand_id", "brand_id", "raw"),
    ("brand_name", "brand_name", "raw"),
    ("brand_code", "brand_code", "raw"),
    # Supplier
    ("supplier_id", "supplier_id", "str"),
    ("supplier_code", "supplier_code", "str"),
    ("supplier_name", "supplier_name", "str"),
    ("supplier_phone", "supplier_phone", "str"),
    ("supplier_city", "supplier_city", "str"),
    ("supplier_state", "supplier_state", "str"),
    ("supplier_gst", "supplier_gst", "str"),
    ("last_purchase_supplier", "last_purchase_supplier", "str"),
    # Purchase info
    ("purchase_price", "purchase_price", "num"),
    ("last_purchase_qty", "last_purchase_qty", "num"),
    ("purchase_qty", "purchase_qty", "num"),
    ("purchase_invoice_no", "purchase_invoice_no", "str"),
    ("purchase_reference", "purchase_reference", "str"),
    ("last_purchase_date", "last_purchase_date", "date"),
    ("last_purchase_cost", "last_purchase_cost", "num"),
    ("purchase_voucher_type", "purchase_voucher_type", "str"),
    ("purchase_type", "purchase_type", "str"),
    # Batch
    ("batch_id", "batch_id", "str"),
    ("batch_no", "batch_no", "str"),
    ("mfg_date", "manufacturing_date", "date"),
    ("expiry_date", "expiry_date", "date"),
]


def _apply_field_conversion(value: Any, converter: str) -> Any:
    """Apply the appropriate converter to a value."""
    if converter == "raw":
        return value
    if converter == "str":
        return _safe_optional_str(value)
    if converter == "num":
        return _numeric_or_none(value)
    if converter == "date":
        return _normalize_date(value)
    return value


def _build_new_item_dict(sql_item: dict[str, Any], sql_qty: float, now: datetime) -> dict[str, Any]:
    """Build a new ERP item document from SQL data."""
    item = {
        "item_code": sql_item.get("item_code", ""),
        "item_name": sql_item.get("item_name", ""),
        "stock_qty": sql_qty,
        "sql_server_qty": sql_qty,
        # Enrichment fields (empty initially)
        "serial_number": None,
        "condition": None,
        # Tracking fields
        "data_complete": False,
        "completion_percentage": 0,
        "missing_fields": ["serial_number"],
        "enrichment_history": [],
        # Sync metadata
        "last_synced": now,
        "qty_changed_at": None,
        "created_at": now,
        "updated_at": now,
        "synced_from_sql": True,
    }
    # Apply defaults for category / warehouse
    item["category"] = sql_item.get("category", "General")
    item["warehouse"] = sql_item.get("warehouse", "Main")

    # Add optional fields via data-driven loop
    for sql_key, target_key, converter in _NEW_ITEM_FIELDS:
        if target_key in ("category", "warehouse"):
            continue  # Already handled with defaults
        value = sql_item.get(sql_key)
        item[target_key] = _apply_field_conversion(value, converter)

    return item


def _build_metadata_candidates(sql_item: dict[str, Any]) -> dict[str, Any]:
    """Build metadata candidates dict for backfill updates."""
    candidates: dict[str, Any] = {}
    for sql_key, target_key, converter in _NEW_ITEM_FIELDS:
        value = sql_item.get(sql_key)
        candidates[target_key] = _apply_field_conversion(value, converter)
    return candidates


def _compute_metadata_updates(
    candidates: dict[str, Any], mongo_item: dict[str, Any]
) -> dict[str, Any]:
    """
    Determine which metadata fields should be updated.

    - Numeric fields: update only if existing is None
    - Location field: always sync if changed
    - Other fields: update if existing is None or empty string
    """
    updates: dict[str, Any] = {}
    for field, new_value in candidates.items():
        if new_value is None:
            continue
        existing_value = mongo_item.get(field)

        # For numeric fields we treat only None as missing
        if isinstance(new_value, (int, float)):
            if existing_value is None:
                updates[field] = new_value
            continue

        # Location should always be synced from SQL if it changes
        if field == "location" and new_value != existing_value:
            updates[field] = new_value
            continue

        # For strings / other types update when missing or empty
        if existing_value in (None, ""):
            updates[field] = new_value

    return updates


class SQLSyncService:
    """
    Service to sync SQL Server quantity changes to MongoDB

    CRITICAL BEHAVIOR:
    - Only updates stock_qty field from SQL Server
    - Preserves ALL enriched data (serial numbers, MRP, HSN codes, etc.)
    - Tracks qty changes and timestamps
    - Never overwrites user-entered enrichment data
    """

    def __init__(
        self,
        sql_connector: SQLServerConnector,
        mongo_db: AsyncIOMotorDatabase,
        sync_interval: int = 900,  # 15 minutes default (was 1 hour)
        enabled: bool = True,
        nightly_sync_hour: int = 2,  # Run full sync at 2 AM
    ):
        self.sql_connector = sql_connector
        self.mongo_db = mongo_db
        self.sync_interval = sync_interval
        self.enabled = enabled
        self.nightly_sync_hour = nightly_sync_hour
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_sync: Optional[datetime] = None
        self._last_new_item_check: Optional[datetime] = None
        self._last_nightly_sync: Optional[datetime] = None
        self._new_item_check_interval: int = 1800  # Check for new items every 30 minutes
        self._sync_stats = {
            "total_syncs": 0,
            "successful_syncs": 0,
            "failed_syncs": 0,
            "last_sync": None,
            "last_nightly_sync": None,
            "items_synced": 0,
            "qty_changes_detected": 0,
            "new_items_discovered": 0,
        }

    async def sync_single_item_by_barcode(self, barcode: str) -> Optional[dict[str, Any]]:
        """
        Sync a single item from SQL Server to MongoDB by barcode.
        Returns the updated item if found, None otherwise.
        """
        if not self.sql_connector.test_connection():
            logger.warning("SQL Server not connected, skipping single item sync")
            return None

        try:
            # Run synchronous SQL query in thread pool
            sql_item = await asyncio.to_thread(self.sql_connector.get_item_by_barcode, barcode)

            if not sql_item:
                return None

            # Use existing logic to update/create item
            stats = {
                "items_created": 0,
                "qty_updated": 0,
                "qty_changes_detected": 0,
                "items_checked": 0,
            }
            await self._sync_single_item(sql_item, stats)

            # Return the updated item from MongoDB
            item_code = sql_item.get("item_code")
            if item_code:
                return await self.mongo_db.erp_items.find_one({"item_code": item_code})
            return None

        except Exception as e:
            logger.error(f"Error syncing single item {barcode}: {e}")
            return None

    async def sync_variance_only(self) -> dict[str, Any]:
        """
        Sync ONLY items with quantity variances from SQL Server to MongoDB.
        This is much more efficient than full sync as it:
        1. Gets item codes from MongoDB (fast local query)
        2. Fetches only quantities from SQL Server (minimal data transfer)
        3. Updates only items with actual differences

        Returns:
            Sync statistics
        """
        if not self.sql_connector.test_connection():
            from backend.exceptions import SQLServerConnectionError

            raise SQLServerConnectionError("SQL Server connection not available")

        start_time = datetime.utcnow()
        stats = {
            "items_checked": 0,
            "qty_updated": 0,
            "variances_found": 0,
            "qty_changes_detected": 0,  # Backwards-compatible alias
            "items_created": 0,
            "errors": 0,
            "duration": 0,
            "sql_queries": 0,
        }

        try:
            logger.info("Starting variance-only sync from SQL Server...")

            # Step 1: Get all item codes from MongoDB (fast local query)
            mongo_items_cursor = self.mongo_db.erp_items.find({}, {"item_code": 1, "stock_qty": 1})
            mongo_items = {}
            async for item in mongo_items_cursor:
                item_code = item.get("item_code")
                if item_code:
                    mongo_items[item_code] = float(item.get("stock_qty", 0.0))

            if not mongo_items:
                logger.info("No items in MongoDB to sync")
                duration_secs = (datetime.utcnow() - start_time).total_seconds()
                stats["duration"] = duration_secs  # type: ignore[assignment]
                return stats

            stats["items_checked"] = len(mongo_items)
            logger.info(f"Found {len(mongo_items)} items in MongoDB to check")

            # Step 2: Batch fetch quantities from SQL Server (minimal load)
            item_codes = list(mongo_items.keys())
            batch_size = 500  # SQL Server handles this well with IN clause

            for i in range(0, len(item_codes), batch_size):
                batch_codes = item_codes[i : i + batch_size]

                try:
                    # Fetch only quantities - minimal SQL load
                    sql_quantities = await asyncio.to_thread(
                        self.sql_connector.get_item_quantities_only, batch_codes
                    )
                    stats["sql_queries"] += 1

                    # Step 3: Compare and update only variances
                    for item_code, sql_qty in sql_quantities.items():
                        mongo_qty = mongo_items.get(item_code, 0.0)

                        if sql_qty != mongo_qty:
                            # Variance found - update MongoDB
                            stats["variances_found"] += 1
                            stats["qty_changes_detected"] += 1  # Backwards-compatible
                            now = datetime.utcnow()

                            await self.mongo_db.erp_items.update_one(
                                {"item_code": item_code},
                                {
                                    "$set": {
                                        "stock_qty": sql_qty,
                                        "sql_server_qty": sql_qty,
                                        "last_synced": now,
                                        "qty_changed_at": now,
                                        "qty_change_delta": sql_qty - mongo_qty,
                                        "updated_at": now,
                                    }
                                },
                            )
                            stats["qty_updated"] += 1

                            logger.debug(
                                f"Variance sync: {item_code}: {mongo_qty} → {sql_qty} "
                                f"(Δ {sql_qty - mongo_qty})"
                            )

                except Exception as e:
                    logger.error(f"Error syncing batch starting at index {i}: {e}")
                    stats["errors"] += 1

            stats["duration"] = (datetime.utcnow() - start_time).total_seconds()  # type: ignore[assignment]
            self._finalize_sync_stats(stats)

            logger.info(
                f"Variance sync completed: {stats['items_checked']} items checked, "
                f"{stats['variances_found']} variances found, "
                f"{stats['qty_updated']} updated, "
                f"{stats['sql_queries']} SQL queries, "
                f"in {stats['duration']:.2f}s"
            )

            await self._update_sync_metadata(stats)
            return stats

        except Exception as e:
            logger.error(f"Variance sync failed: {str(e)}")
            self._sync_stats["failed_syncs"] += 1
            stats["errors"] = 1
            raise

    async def discover_new_items(self, limit: int = 100) -> dict[str, Any]:
        """
        Discover and create NEW items from SQL Server that don't exist in MongoDB.
        This runs less frequently than variance sync to minimize SQL load.

        Args:
            limit: Maximum number of new items to create per run (default 100)

        Returns:
            Discovery statistics
        """
        if not self.sql_connector.test_connection():
            logger.warning("SQL Server not connected, skipping new item discovery")
            return {"items_discovered": 0, "error": "SQL Server not connected"}

        start_time = datetime.utcnow()
        stats = {
            "items_discovered": 0,
            "items_checked": 0,
            "errors": 0,
            "duration": 0,
        }

        try:
            logger.info("Starting new item discovery from SQL Server...")

            # Step 1: Get all item codes from MongoDB
            mongo_codes_cursor = self.mongo_db.erp_items.find({}, {"item_code": 1})
            mongo_codes = set()
            async for item in mongo_codes_cursor:
                if item.get("item_code"):
                    mongo_codes.add(item["item_code"])

            logger.debug(f"Found {len(mongo_codes)} existing items in MongoDB")

            # Step 2: Fetch all items from SQL Server (this is the heavy query)
            # Only run this periodically
            sql_items = await asyncio.to_thread(self.sql_connector.get_all_items)
            stats["items_checked"] = len(sql_items)

            # Step 3: Find items that exist in SQL but not in MongoDB
            new_items = []
            for sql_item in sql_items:
                item_code = sql_item.get("item_code")
                if item_code and item_code not in mongo_codes:
                    new_items.append(sql_item)
                    if len(new_items) >= limit:
                        break

            if not new_items:
                logger.info("No new items found in SQL Server")
                duration = (datetime.utcnow() - start_time).total_seconds()
                stats["duration"] = duration  # type: ignore[assignment]
                self._last_new_item_check = datetime.utcnow()
                return stats

            logger.info(f"Found {len(new_items)} new items to create")

            # Step 4: Create new items in MongoDB
            now = datetime.utcnow()
            for sql_item in new_items:
                try:
                    sql_qty = float(sql_item.get("stock_qty", 0.0))
                    new_item = _build_new_item_dict(sql_item, sql_qty, now)
                    await self.mongo_db.erp_items.insert_one(new_item)
                    stats["items_discovered"] += 1
                    logger.debug(f"Created new item: {sql_item.get('item_code')}")
                except Exception as e:
                    logger.error(f"Error creating item {sql_item.get('item_code')}: {e}")
                    stats["errors"] += 1

            duration = (datetime.utcnow() - start_time).total_seconds()
            stats["duration"] = duration  # type: ignore[assignment]
            self._last_new_item_check = datetime.utcnow()
            self._sync_stats["new_items_discovered"] += stats["items_discovered"]

            logger.info(
                f"New item discovery completed: {stats['items_discovered']} items created "
                f"in {stats['duration']:.2f}s"
            )

            return stats

        except Exception as e:
            logger.error(f"New item discovery failed: {str(e)}")
            stats["errors"] = 1
            return stats

    def should_check_new_items(self) -> bool:
        """Check if it's time to discover new items (every 30 minutes)."""
        if self._last_new_item_check is None:
            return True
        elapsed = (datetime.utcnow() - self._last_new_item_check).total_seconds()
        return elapsed >= self._new_item_check_interval

    def should_run_nightly_sync(self) -> bool:
        """
        Check if it's time for nightly full sync.
        Runs once per day at the configured hour (default 2 AM).
        """
        now = datetime.utcnow()

        # Check if we're in the nightly sync hour
        if now.hour != self.nightly_sync_hour:
            return False

        # Check if we already ran today
        if self._last_nightly_sync is not None:
            last_sync_date = self._last_nightly_sync.date()
            if last_sync_date == now.date():
                return False  # Already ran today

        return True

    async def nightly_full_sync(self) -> dict[str, Any]:
        """
        Full data verification sync - runs every night.
        Fetches ALL items from SQL Server and ensures MongoDB is in sync.
        This is heavier than variance sync but ensures data integrity.

        Returns:
            Sync statistics
        """
        if not self.sql_connector.test_connection():
            logger.warning("SQL Server not connected, skipping nightly sync")
            return {"error": "SQL Server not connected", "items_synced": 0}

        start_time = datetime.utcnow()
        stats = {
            "items_checked": 0,
            "qty_updated": 0,
            "items_created": 0,
            "variances_found": 0,
            "errors": 0,
            "duration": 0,
        }

        try:
            logger.info("🌙 Starting nightly full data verification sync...")

            # Fetch ALL items from SQL Server
            sql_items = await asyncio.to_thread(self.sql_connector.get_all_items)
            stats["items_checked"] = len(sql_items)
            logger.info(f"Retrieved {len(sql_items)} items from SQL Server for verification")

            # Get all MongoDB item codes for comparison
            mongo_items_cursor = self.mongo_db.erp_items.find({}, {"item_code": 1, "stock_qty": 1})
            mongo_items = {}
            async for item in mongo_items_cursor:
                item_code = item.get("item_code")
                if item_code:
                    mongo_items[item_code] = float(item.get("stock_qty", 0.0))

            # Process each SQL item
            batch_size = 100
            for i in range(0, len(sql_items), batch_size):
                batch = sql_items[i : i + batch_size]

                for sql_item in batch:
                    try:
                        await self._sync_single_item(sql_item, stats)
                    except Exception as e:
                        logger.error(f"Error syncing item {sql_item.get('item_code')}: {e}")
                        stats["errors"] += 1

            stats["duration"] = (datetime.utcnow() - start_time).total_seconds()
            self._last_nightly_sync = datetime.utcnow()
            # isoformat returns str, dict expects int
            last_sync_iso = self._last_nightly_sync.isoformat()
            self._sync_stats["last_nightly_sync"] = last_sync_iso  # type: ignore[assignment]

            logger.info(
                f"🌙 Nightly sync completed: {stats['items_checked']} items verified, "
                f"{stats['qty_updated']} updated, {stats['items_created']} created, "
                f"in {stats['duration']:.2f}s"
            )

            # Update sync metadata
            await self._update_sync_metadata(stats)
            return stats

        except Exception as e:
            logger.error(f"Nightly sync failed: {str(e)}")
            stats["errors"] = 1
            return stats

    async def sync_quantities_only(self) -> dict[str, Any]:
        """
        Sync ONLY quantity changes from SQL Server to MongoDB
        Preserves all enriched data (serial numbers, MRP, HSN codes, etc.)

        Returns:
            Sync statistics
        """
        if not self.sql_connector.test_connection():
            from backend.exceptions import SQLServerConnectionError

            raise SQLServerConnectionError("SQL Server connection not available")

        start_time = datetime.utcnow()
        stats = {
            "items_checked": 0,
            "qty_updated": 0,
            "items_created": 0,
            "qty_changes_detected": 0,
            "errors": 0,
            "duration": 0,
        }

        try:
            # Fetch all items from SQL Server
            logger.info("Starting SQL Server quantity sync...")
            sql_items = self.sql_connector.get_all_items()

            # Batch process items
            batch_size = 100
            for i in range(0, len(sql_items), batch_size):
                batch = sql_items[i : i + batch_size]

                for sql_item in batch:
                    try:
                        await self._sync_single_item(sql_item, stats)
                    except Exception as e:
                        logger.error(f"Error syncing item {sql_item.get('item_code')}: {str(e)}")
                        stats["errors"] += 1

            duration = (datetime.utcnow() - start_time).total_seconds()
            stats["duration"] = duration  # type: ignore[assignment]
            self._finalize_sync_stats(stats)

            logger.info(
                f"SQL qty sync completed: {stats['items_checked']} items checked, "
                f"{stats['qty_changes_detected']} qty changes detected, "
                f"{stats['items_created']} new items, "
                f"in {stats['duration']:.2f}s"
            )

            await self._update_sync_metadata(stats)
            return stats

        except Exception as e:
            logger.error(f"SQL qty sync failed: {str(e)}")
            self._sync_stats["failed_syncs"] += 1
            stats["errors"] = 1
            raise

    async def _sync_single_item(self, sql_item: dict[str, Any], stats: dict[str, Any]) -> None:
        """Process a single item from SQL Server for sync."""
        item_code = sql_item.get("item_code", "")
        sql_qty = float(sql_item.get("stock_qty", 0.0))
        now = datetime.utcnow()

        # Get current MongoDB record
        mongo_item = await self.mongo_db.erp_items.find_one({"item_code": item_code})

        if not mongo_item:
            # New item - create with basic data
            new_item = _build_new_item_dict(sql_item, sql_qty, now)
            await self.mongo_db.erp_items.insert_one(new_item)
            stats["items_created"] += 1
            logger.debug(f"Created new item: {item_code}")
        else:
            # Existing item - update ONLY quantity if changed
            await self._update_existing_item(item_code, sql_item, sql_qty, mongo_item, stats)

        stats["items_checked"] += 1

    async def _update_existing_item(
        self,
        item_code: str,
        sql_item: dict[str, Any],
        sql_qty: float,
        mongo_item: dict[str, Any],
        stats: dict[str, Any],
    ) -> None:
        """Update an existing MongoDB item with SQL data."""
        mongo_qty = float(mongo_item.get("stock_qty", 0.0))
        now = datetime.utcnow()

        # Prepare backfill for optional metadata
        metadata_candidates = _build_metadata_candidates(sql_item)
        metadata_updates = _compute_metadata_updates(metadata_candidates, mongo_item)

        update_fields: dict[str, Any] = {
            "last_synced": now,
            "updated_at": now,
        }

        if sql_qty != mongo_qty:
            update_fields.update(
                {
                    "stock_qty": sql_qty,
                    "sql_server_qty": sql_qty,
                    "qty_changed_at": now,
                    "qty_change_delta": sql_qty - mongo_qty,
                }
            )
            stats["qty_changes_detected"] += 1
            stats["qty_updated"] += 1

            logger.info(
                f"Qty updated for {item_code}: {mongo_qty} → {sql_qty} (Δ {sql_qty - mongo_qty})"
            )

        if metadata_updates:
            update_fields.update(metadata_updates)

        await self.mongo_db.erp_items.update_one(
            {"item_code": item_code},
            {"$set": update_fields},
        )

    def _finalize_sync_stats(self, stats: dict[str, Any]) -> None:
        """Update backwards-compatible stats and internal tracking."""
        # Backwards-compatible stats keys for older callers/tests
        if "items_updated" not in stats:
            stats["items_updated"] = stats.get("qty_updated", 0)

        if "items_unchanged" not in stats:
            checked = stats.get("items_checked", 0)
            updated = stats.get("qty_updated", 0)
            created = stats.get("items_created", 0)
            stats["items_unchanged"] = max(0, checked - updated - created)

        self._last_sync = datetime.utcnow()
        self._sync_stats["successful_syncs"] += 1
        self._sync_stats["items_synced"] = stats["items_checked"]
        self._sync_stats["qty_changes_detected"] = stats["qty_changes_detected"]
        self._sync_stats["last_sync"] = self._last_sync.isoformat()  # type: ignore[assignment]

    async def _update_sync_metadata(self, stats: dict[str, Any]) -> None:
        """Update sync metadata collection (best-effort)."""
        sync_metadata_collection = getattr(self.mongo_db, "sync_metadata", None)
        if sync_metadata_collection is not None:
            try:
                await sync_metadata_collection.update_one(
                    {"_id": "sql_qty_sync"},
                    {
                        "$set": {
                            "last_sync": self._last_sync,
                            "stats": stats,
                            "updated_at": datetime.utcnow(),
                        },
                        "$inc": {"total_syncs": 1},
                    },
                    upsert=True,
                )
            except Exception:
                logger.warning(
                    "Failed to update sync_metadata collection during qty sync",
                    exc_info=True,
                )
        else:
            logger.debug(
                "MongoDB sync_metadata collection not configured; skipping metadata update",
            )

    async def check_item_qty_realtime(self, item_code: str) -> dict[str, Any]:
        """
        Real-time quantity check for a specific item
        Called when staff selects an item for counting

        Args:
            item_code: Item code to check

        Returns:
            Dictionary with qty info and update status
        """
        if not self.sql_connector.test_connection():
            logger.warning("SQL Server not available for real-time check")
            # Return MongoDB data without update
            mongo_item = await self.mongo_db.erp_items.find_one({"item_code": item_code})
            if mongo_item:
                return {
                    "item_code": item_code,
                    "sql_qty": mongo_item.get("stock_qty"),
                    "updated": False,
                    "source": "mongodb_cache",
                    "message": "SQL Server unavailable, using cached data",
                }
            else:
                raise ValueError(f"Item {item_code} not found")

        try:
            # Fetch latest qty from SQL Server
            sql_item = self.sql_connector.get_item_by_code(item_code)
            if not sql_item:
                raise ValueError(f"Item {item_code} not found in SQL Server")

            sql_qty = float(sql_item.get("stock_qty", 0.0))

            # Get current MongoDB record
            mongo_item = await self.mongo_db.erp_items.find_one({"item_code": item_code})

            if not mongo_item:
                logger.warning(f"Item {item_code} not in MongoDB, will be created on next sync")
                return {
                    "item_code": item_code,
                    "sql_qty": sql_qty,
                    "updated": False,
                    "source": "sql_server",
                    "message": "Item not in MongoDB yet",
                }

            mongo_qty = float(mongo_item.get("stock_qty", 0.0))

            # Check if qty changed
            if sql_qty != mongo_qty:
                # Update MongoDB with new qty (preserve enrichments!)
                await self.mongo_db.erp_items.update_one(
                    {"item_code": item_code},
                    {
                        "$set": {
                            "stock_qty": sql_qty,
                            "sql_server_qty": sql_qty,
                            "last_checked": datetime.utcnow(),
                            "qty_changed_at": datetime.utcnow(),
                            "qty_change_delta": sql_qty - mongo_qty,
                        }
                    },
                )

                logger.info(f"Real-time qty update for {item_code}: {mongo_qty} → {sql_qty}")

                return {
                    "item_code": item_code,
                    "sql_qty": sql_qty,
                    "previous_qty": mongo_qty,
                    "delta": sql_qty - mongo_qty,
                    "updated": True,
                    "source": "sql_server",
                    "message": "Quantity updated from SQL Server",
                }
            else:
                # Qty unchanged
                await self.mongo_db.erp_items.update_one(
                    {"item_code": item_code},
                    {"$set": {"last_checked": datetime.utcnow()}},
                )

                return {
                    "item_code": item_code,
                    "sql_qty": sql_qty,
                    "updated": False,
                    "source": "sql_server",
                    "message": "Quantity unchanged",
                }

        except Exception as e:
            logger.error(f"Real-time qty check failed for {item_code}: {str(e)}")
            raise

    async def _sync_loop(self):
        """
        Background sync loop with three sync modes:
        1. Variance-only sync (every 15 min) - minimal SQL load
        2. New item discovery (every 30 min) - finds new items
        3. Nightly full sync (at 2 AM) - complete data verification
        """
        while self._running and self.enabled:
            try:
                # Check connection before attempting sync
                if not self.sql_connector.test_connection():
                    logger.warning(
                        "SQL Server connection not available, skipping sync. "
                        "Will retry in next interval."
                    )
                    self._sync_stats["failed_syncs"] += 1
                else:
                    # Check if it's time for nightly full sync (2 AM)
                    if self.should_run_nightly_sync():
                        logger.info("🌙 Running nightly full data verification...")
                        await self.nightly_full_sync()
                        self._sync_stats["total_syncs"] += 1
                    else:
                        # Regular variance-only sync (minimal SQL load)
                        await self.sync_variance_only()
                        self._sync_stats["total_syncs"] += 1

                        # Check for new items every 30 minutes
                        if self.should_check_new_items():
                            logger.info("🔍 Running new item discovery (every 30 min)...")
                            await self.discover_new_items(limit=200)

            except Exception as e:
                logger.error(f"Sync loop error: {str(e)}")
                self._sync_stats["failed_syncs"] += 1

            # Wait for next sync interval
            await asyncio.sleep(self.sync_interval)

    def start(self):
        """Start background sync"""
        if self._running:
            logger.warning("SQL sync service already running")
            return

        if not self.enabled:
            logger.info("SQL sync service is disabled")
            return

        # Check if SQL Server connection is available (don't fail if not)
        if not self.sql_connector.test_connection():
            logger.warning(
                "SQL sync service started but SQL Server connection not available. "
                "Sync will retry periodically."
            )
        else:
            logger.info(
                f"SQL sync service started "
                f"(interval: {self.sync_interval}s = {self.sync_interval / 60:.1f} min)"
            )

        self._running = True
        self._task = asyncio.create_task(self._sync_loop())

    async def stop(self):
        """Stop background sync"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("SQL sync service stopped")

    async def sync_now(self) -> dict[str, Any]:
        """Trigger immediate variance-only sync"""
        return await self.sync_variance_only()

    async def sync_items(self) -> dict[str, Any]:
        """Alias for sync_variance_only - backward compatibility"""
        return await self.sync_variance_only()

    async def sync_all_items(self) -> dict[str, Any]:
        """Alias for sync_variance_only - backward compatibility for tests"""
        return await self.sync_variance_only()

    def get_stats(self) -> dict[str, Any]:
        """Get sync statistics"""
        return {
            **self._sync_stats,
            "running": self._running,
            "enabled": self.enabled,
            "sync_interval": self.sync_interval,
            "sync_interval_minutes": round(self.sync_interval / 60, 1),
            "next_sync": (
                (self._last_sync + timedelta(seconds=self.sync_interval)).isoformat()
                if self._last_sync
                else None
            ),
        }

    def set_interval(self, interval: int):
        """Update sync interval"""
        self.sync_interval = interval
        logger.info(f"Sync interval updated to {interval}s ({interval / 60:.1f} min)")

    def enable(self):
        """Enable sync service"""
        self.enabled = True
        if not self._running:
            self.start()
        logger.info("SQL sync service enabled")

    def disable(self):
        """Disable sync service"""
        self.enabled = False
        logger.info("SQL sync service disabled")
