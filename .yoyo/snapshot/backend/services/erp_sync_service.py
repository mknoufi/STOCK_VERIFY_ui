"""
ERP Sync Service - Sync ERP data to MongoDB at regular intervals
Handles scheduled synchronization from SQL Server to MongoDB
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.sql_server_connector import SQLServerConnector

logger = logging.getLogger(__name__)


class ERPSyncService:
    """
    Service to sync ERP data (SQL Server) to MongoDB at regular intervals
    Keeps app database updated with latest ERP data
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
        self._sync_stats = {
            "total_syncs": 0,
            "successful_syncs": 0,
            "failed_syncs": 0,
            "last_sync": None,
            "items_synced": 0,
        }

    async def sync_items(self) -> Dict[str, Any]:
        """
        Sync items from ERP (SQL Server) to MongoDB
        Returns sync statistics
        """
        if not self.sql_connector.test_connection():
            raise Exception("SQL Server connection not available")

        start_time = datetime.utcnow()
        stats = {
            "items_synced": 0,
            "items_updated": 0,
            "items_created": 0,
            "errors": 0,
            "duration": 0,
        }

        try:
            # Fetch all items from SQL Server
            logger.info("Starting ERP sync...")
            items = self.sql_connector.get_all_items()

            # Batch process items
            batch_size = 100
            for i in range(0, len(items), batch_size):
                batch = items[i : i + batch_size]

                for item in batch:
                    try:
                        # Prepare item document
                        item_doc = {
                            "item_code": item.get("item_code", ""),
                            "item_name": item.get("item_name", ""),
                            "barcode": item.get("barcode", ""),
                            "stock_qty": float(item.get("stock_qty", 0.0)),
                            "mrp": float(item.get("mrp", 0.0)),
                            "category": item.get("category", "General"),
                            "subcategory": item.get("subcategory", ""),
                            "warehouse": item.get("warehouse", "Main"),
                            "uom_code": item.get("uom_code", ""),
                            "uom_name": item.get("uom_name", ""),
                            "floor": item.get("floor", ""),
                            "rack": item.get("rack", ""),
                            "synced_at": datetime.utcnow(),
                            "synced_from_erp": True,
                            "data_version": 3,
                        }

                        # Update or insert item, preserve verification metadata
                        result = await self.mongo_db.erp_items.update_one(
                            {"item_code": item_doc["item_code"]},
                            {
                                "$set": item_doc,
                                "$setOnInsert": {
                                    "created_at": datetime.utcnow(),
                                    "verified": False,
                                    "verified_by": None,
                                    "verified_at": None,
                                    "last_scanned_at": None,
                                },
                            },
                            upsert=True,
                        )

                        if result.upserted_id:
                            stats["items_created"] += 1
                        else:
                            stats["items_updated"] += 1

                        stats["items_synced"] += 1

                    except Exception as e:
                        logger.error(f"Error syncing item {item.get('item_code')}: {str(e)}")
                        stats["errors"] += 1

            stats["duration"] = (datetime.utcnow() - start_time).total_seconds()
            self._last_sync = datetime.utcnow()
            self._sync_stats["successful_syncs"] += 1
            self._sync_stats["items_synced"] = stats["items_synced"]
            self._sync_stats["last_sync"] = self._last_sync.isoformat()

            logger.info(
                f"ERP sync completed: {stats['items_synced']} items "
                f"({stats['items_created']} created, {stats['items_updated']} updated) "
                f"in {stats['duration']:.2f}s"
            )

            # Update sync metadata
            await self.mongo_db.erp_sync_metadata.update_one(
                {"_id": "sync_stats"},
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
            logger.error(f"ERP sync failed: {str(e)}")
            self._sync_stats["failed_syncs"] += 1
            stats["errors"] = 1
            raise

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
                    self._sync_stats["failed_syncs"] += 1
                else:
                    await self.sync_items()
                    self._sync_stats["total_syncs"] += 1
            except Exception as e:
                logger.error(f"Sync loop error: {str(e)}")
                self._sync_stats["failed_syncs"] += 1

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
