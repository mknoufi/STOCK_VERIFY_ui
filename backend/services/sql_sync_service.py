"""
SQL Sync Service - Sync ONLY quantity changes from SQL Server to MongoDB
CRITICAL: Preserves all enriched data (serial numbers, MRP, HSN codes, etc.)
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.sql_server_connector import SQLServerConnector

logger = logging.getLogger(__name__)


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
    ):
        self.sql_connector = sql_connector
        self.mongo_db = mongo_db
        self.sync_interval = sync_interval
        self.enabled = enabled
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_sync: Optional[datetime] = None
        self._sync_stats = {
            "total_syncs": 0,
            "successful_syncs": 0,
            "failed_syncs": 0,
            "last_sync": None,
            "items_synced": 0,
            "qty_changes_detected": 0,
        }

    async def sync_quantities_only(self) -> Dict[str, Any]:
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
                        item_code = sql_item.get("item_code", "")
                        sql_qty = float(sql_item.get("stock_qty", 0.0))

                        # Get current MongoDB record
                        mongo_item = await self.mongo_db.erp_items.find_one(
                            {"item_code": item_code}
                        )

                        if not mongo_item:
                            # New item - create with basic data
                            new_item = {
                                "item_code": item_code,
                                "item_name": sql_item.get("item_name", ""),
                                "category": sql_item.get("category", "General"),
                                "subcategory": sql_item.get("subcategory", ""),
                                "warehouse": sql_item.get("warehouse", "Main"),
                                "uom_code": sql_item.get("uom_code", ""),
                                "uom_name": sql_item.get("uom_name", ""),
                                # Stock quantity from SQL Server
                                "stock_qty": sql_qty,
                                "sql_server_qty": sql_qty,
                                # Enrichment fields (empty initially)
                                "serial_number": None,
                                "mrp": None,
                                "hsn_code": None,
                                "barcode": sql_item.get("barcode", ""),
                                "location": None,
                                "condition": None,
                                # Tracking fields
                                "data_complete": False,
                                "completion_percentage": 0,
                                "missing_fields": ["serial_number", "mrp", "hsn_code"],
                                "enrichment_history": [],
                                # Sync metadata
                                "last_synced": datetime.utcnow(),
                                "qty_changed_at": None,
                                "created_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow(),
                                "synced_from_sql": True,
                            }

                            await self.mongo_db.erp_items.insert_one(new_item)
                            stats["items_created"] += 1
                            logger.debug(f"Created new item: {item_code}")

                        else:
                            # Existing item - update ONLY quantity if changed
                            mongo_qty = float(mongo_item.get("stock_qty", 0.0))

                            if sql_qty != mongo_qty:
                                # Quantity changed! Update it
                                await self.mongo_db.erp_items.update_one(
                                    {"item_code": item_code},
                                    {
                                        "$set": {
                                            # Update quantity fields
                                            "stock_qty": sql_qty,
                                            "sql_server_qty": sql_qty,
                                            # Update sync metadata
                                            "last_synced": datetime.utcnow(),
                                            "qty_changed_at": datetime.utcnow(),
                                            "qty_change_delta": sql_qty - mongo_qty,
                                            "updated_at": datetime.utcnow(),
                                        }
                                        # NOTE: $set does NOT overwrite enrichment fields!
                                        # serial_number, mrp, hsn_code, etc. are preserved!
                                    },
                                )

                                stats["qty_changes_detected"] += 1
                                stats["qty_updated"] += 1

                                logger.info(
                                    f"Qty updated for {item_code}: "
                                    f"{mongo_qty} → {sql_qty} "
                                    f"(Δ {sql_qty - mongo_qty})"
                                )
                            else:
                                # Quantity unchanged - just update sync timestamp
                                await self.mongo_db.erp_items.update_one(
                                    {"item_code": item_code},
                                    {"$set": {"last_synced": datetime.utcnow()}},
                                )

                        stats["items_checked"] += 1

                    except Exception as e:
                        logger.error(f"Error syncing item {sql_item.get('item_code')}: {str(e)}")
                        stats["errors"] += 1

            stats["duration"] = (datetime.utcnow() - start_time).total_seconds()
            self._last_sync = datetime.utcnow()
            self._sync_stats["successful_syncs"] += 1
            self._sync_stats["items_synced"] = stats["items_checked"]
            self._sync_stats["qty_changes_detected"] = stats["qty_changes_detected"]
            self._sync_stats["last_sync"] = self._last_sync.isoformat()

            logger.info(
                f"SQL qty sync completed: {stats['items_checked']} items checked, "
                f"{stats['qty_changes_detected']} qty changes detected, "
                f"{stats['items_created']} new items, "
                f"in {stats['duration']:.2f}s"
            )

            # Update sync metadata
            await self.mongo_db.sync_metadata.update_one(
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

            return stats

        except Exception as e:
            logger.error(f"SQL qty sync failed: {str(e)}")
            self._sync_stats["failed_syncs"] += 1
            stats["errors"] = 1
            raise

    async def check_item_qty_realtime(self, item_code: str) -> Dict[str, Any]:
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
                    {"item_code": item_code}, {"$set": {"last_checked": datetime.utcnow()}}
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
        """Background sync loop"""
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
                    await self.sync_quantities_only()
                    self._sync_stats["total_syncs"] += 1
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

    def stop(self):
        """Stop background sync"""
        self._running = False
        if self._task:
            self._task.cancel()
        logger.info("SQL sync service stopped")

    async def sync_now(self) -> Dict[str, Any]:
        """Trigger immediate sync"""
        return await self.sync_quantities_only()

    def get_stats(self) -> Dict[str, Any]:
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
