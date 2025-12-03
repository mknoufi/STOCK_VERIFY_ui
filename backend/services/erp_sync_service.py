"""
SQL Server Sync Service - Sync quantity changes from SQL Server to MongoDB
CRITICAL: Only syncs quantity changes, preserves all enrichment data
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.sql_server_connector import SQLServerConnector
from backend.exceptions import SQLServerConnectionError, SyncError

logger = logging.getLogger(__name__)


class SQLSyncService:
    """
    Service to sync SQL Server quantity changes to MongoDB
    CRITICAL: Preserves enrichment data (serial#, MRP, HSN, etc.)
    Only updates: sql_server_qty, last_synced, sql_modified
    """

    def __init__(
        self,
        sql_connector: SQLServerConnector,
        mongo_db: AsyncIOMotorDatabase,
        sync_interval: int = 3600,  # 1 hour default
        enabled: bool = True,
    ):
        self.sql_connector = sql_connector
        self.mongo_db = mongo_db
        self.sync_interval = sync_interval
        self.enabled = enabled
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_sync: Optional[datetime] = None
        self._sync_stats: Dict[str, Any] = {
            "total_syncs": 0,
            "successful_syncs": 0,
            "failed_syncs": 0,
            "last_sync": None,
            "items_synced": 0,
        }

    async def sync_items(self) -> Dict[str, Any]:
        """
        Sync ONLY quantity changes from SQL Server to MongoDB
        CRITICAL: Preserves all enrichment data (serial#, MRP, HSN, location, etc.)

        Returns sync statistics
        """
        if not self.sql_connector.test_connection():
            raise SQLServerConnectionError("SQL Server connection not available")

        start_time = datetime.utcnow()
        stats: Dict[str, Any] = {
            "items_checked": 0,
            "items_updated": 0,
            "items_unchanged": 0,
            "items_created": 0,
            "errors": 0,
            "duration": 0.0,
        }

        try:
            # Fetch all items from SQL Server
            logger.info("Starting SQL Server qty sync...")
            sql_items = self.sql_connector.get_all_items()

            # Batch process items with parallel execution for better performance
            batch_size = 100
            max_concurrent_batches = 5  # Process up to 5 batches in parallel

            # Create batches
            batches = [sql_items[i : i + batch_size] for i in range(0, len(sql_items), batch_size)]

            # Process batches with controlled concurrency
            semaphore = asyncio.Semaphore(max_concurrent_batches)

            async def process_batch_with_semaphore(batch: list) -> None:
                async with semaphore:
                    await self._process_batch(batch, stats)

            # Process all batches concurrently
            await asyncio.gather(*[process_batch_with_semaphore(batch) for batch in batches])

            # Update sync statistics
            self._update_sync_stats(stats, start_time)

            logger.info(
                f"SQL Server sync completed: {stats['items_checked']} checked, "
                f"{stats['items_updated']} updated, {stats['items_created']} created, "
                f"{stats['errors']} errors in {stats['duration']:.2f}s"
            )

            return stats

        except SQLServerConnectionError:
            raise
        except Exception as e:
            self._sync_stats["failed_syncs"] = int(self._sync_stats.get("failed_syncs", 0)) + 1
            logger.error(f"Sync failed: {str(e)}")
            raise SyncError(
                message=f"Sync operation failed: {str(e)}",
                sync_type="quantity_sync",
                details={"error_type": type(e).__name__},
            ) from e

    async def _process_batch(self, batch: List[Dict[str, Any]], stats: Dict[str, Any]) -> None:
        """Process a batch of items"""
        for sql_item in batch:
            try:
                await self._process_item(sql_item, stats)
            except Exception as e:
                item_code = sql_item.get("item_code", "unknown")
                logger.error(f"Error syncing item {item_code}: {str(e)}", exc_info=True)
                stats["errors"] += 1

    async def _process_item(self, sql_item: Dict[str, Any], stats: Dict[str, Any]) -> None:
        """Process a single item"""
        item_code = sql_item.get("item_code", "")
        if not item_code:
            stats["errors"] += 1
            return

        # Get current MongoDB item
        existing_item = await self.mongo_db.erp_items.find_one({"item_code": item_code})
        sql_qty = float(sql_item.get("stock_qty", 0.0))
        stats["items_checked"] += 1

        if existing_item:
            await self._update_existing_item(item_code, existing_item, sql_item, stats)
        else:
            await self._create_new_item(item_code, sql_item, sql_qty, stats)

    async def _update_existing_item(
        self,
        item_code: str,
        existing_item: Dict[str, Any],
        sql_item: Dict[str, Any],
        stats: Dict[str, Any],
    ) -> None:
        """Update existing item quantity and location, preserving other enrichment data"""
        sql_qty = float(sql_item.get("stock_qty", 0.0))
        old_qty = existing_item.get("sql_server_qty", existing_item.get("stock_qty", 0.0))

        # Check for location change
        new_location = sql_item.get("location")
        old_location = existing_item.get("location")
        location_changed = new_location != old_location

        # Only update if qty changed or location changed
        if abs(sql_qty - old_qty) > 0.001 or location_changed:
            update_doc = {
                "$set": {
                    "sql_server_qty": sql_qty,
                    "stock_qty": sql_qty,  # Keep both for compatibility
                    "last_synced": datetime.utcnow(),
                }
            }

            if abs(sql_qty - old_qty) > 0.001:
                update_doc["$set"]["qty_changed"] = True
                update_doc["$set"]["qty_change_detected_at"] = datetime.utcnow()

            if location_changed:
                update_doc["$set"]["location"] = new_location

            result = await self.mongo_db.erp_items.update_one(
                {"item_code": item_code},
                update_doc,
            )

            if result.modified_count > 0:
                stats["items_updated"] += 1
                logger.debug(
                    f"Updated item {item_code}: qty {old_qty}->{sql_qty}, loc {old_location}->{new_location}"
                )
        else:
            stats["items_unchanged"] += 1

    async def _create_new_item(
        self, item_code: str, sql_item: Dict[str, Any], sql_qty: float, stats: Dict[str, Any]
    ) -> None:
        """Create new item with basic data"""
        item_doc = {
            "item_code": item_code,
            "item_name": sql_item.get("item_name", ""),
            "barcode": sql_item.get("barcode", ""),
            "sql_server_qty": sql_qty,
            "stock_qty": sql_qty,  # Keep for compatibility
            "category": sql_item.get("category", "General"),
            "subcategory": sql_item.get("subcategory", ""),
            "warehouse": sql_item.get("warehouse", "Main"),
            "uom_code": sql_item.get("uom_code", ""),
            "uom_name": sql_item.get("uom_name", ""),
            # Enrichment fields (empty/null initially)
            "serial_number": None,
            "mrp": sql_item.get("mrp", 0.0),  # Some may come from SQL
            "hsn_code": None,
            "location": sql_item.get("location"),
            "condition": None,
            # Metadata
            "synced_at": datetime.utcnow(),
            "last_synced": datetime.utcnow(),
            "synced_from_sql": True,
            "created_at": datetime.utcnow(),
            # Enrichment tracking
            "data_complete": False,
            "completion_percentage": 0.0,
            "enrichment_history": [],
            # Verification tracking
            "verified": False,
            "verified_by": None,
            "verified_at": None,
            "verification_status": "pending",
        }

        await self.mongo_db.erp_items.insert_one(item_doc)
        stats["items_created"] += 1
        logger.debug(f"Created new item: {item_code}")

    def _update_sync_stats(self, stats: Dict[str, Any], start_time: datetime) -> None:
        """Update sync statistics"""
        stats["duration"] = float((datetime.utcnow() - start_time).total_seconds())
        self._last_sync = datetime.utcnow()
        self._sync_stats["total_syncs"] = int(self._sync_stats.get("total_syncs", 0)) + 1
        self._sync_stats["successful_syncs"] = int(self._sync_stats.get("successful_syncs", 0)) + 1
        self._sync_stats["last_sync"] = self._last_sync.isoformat() if self._last_sync else None
        self._sync_stats["items_synced"] = stats["items_checked"]

    async def sync_all_items(self) -> Dict[str, Any]:
        """
        Backwards compatible alias retained for older tests that still patch
        `sync_all_items`. The new implementation delegates to `sync_items`.
        """
        return await self.sync_items()

    async def _sync_loop(self):
        """Background sync loop"""
        while self._running and self.enabled:
            try:
                # Check connection before attempting sync
                if not self.sql_connector.test_connection():
                    logger.warning(
                        "SQL Server connection not available, skipping sync. Will retry later."
                    )
                    self._sync_stats["failed_syncs"] = (
                        int(self._sync_stats.get("failed_syncs", 0)) + 1
                    )
                else:
                    await self.sync_items()
                    self._sync_stats["total_syncs"] = (
                        int(self._sync_stats.get("total_syncs", 0)) + 1
                    )
            except Exception as e:
                logger.error(f"Sync loop error: {str(e)}")
                self._sync_stats["failed_syncs"] = int(self._sync_stats.get("failed_syncs", 0)) + 1

            # Wait for next sync interval
            await asyncio.sleep(self.sync_interval)

    def start(self):
        """Start background sync"""
        if self._running:
            logger.warning("Sync service already running")
            return

        if not self.enabled:
            logger.info("Sync service is disabled")
            return

        # Check if SQL Server connection is available (don't fail if not)
        if not self.sql_connector.test_connection():
            logger.warning(
                "ERP sync service started but SQL Server connection not available. Sync will retry periodically."
            )
        else:
            logger.info(f"ERP sync service started (interval: {self.sync_interval}s)")

        self._running = True
        self._task = asyncio.create_task(self._sync_loop())

    def stop(self):
        """Stop background sync"""
        self._running = False
        if self._task:
            self._task.cancel()
        logger.info("ERP sync service stopped")

    async def sync_now(self) -> Dict[str, Any]:
        """Trigger immediate sync"""
        return await self.sync_items()

    def get_stats(self) -> Dict[str, Any]:
        """Get sync statistics"""
        return {
            **self._sync_stats,
            "running": self._running,
            "enabled": self.enabled,
            "sync_interval": self.sync_interval,
            "next_sync": (
                (self._last_sync + timedelta(seconds=self.sync_interval)).isoformat()
                if self._last_sync
                else None
            ),
        }

    def set_interval(self, interval: int):
        """Update sync interval"""
        self.sync_interval = interval
        logger.info(f"Sync interval updated to {interval}s")

    def enable(self):
        """Enable sync service"""
        self.enabled = True
        if not self._running:
            self.start()
        logger.info("ERP sync service enabled")

    def disable(self):
        """Disable sync service"""
        self.enabled = False
        logger.info("ERP sync service disabled")
