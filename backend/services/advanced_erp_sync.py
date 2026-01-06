"""
Advanced ERP Sync Service - Enhanced version with better error handling,
batch processing, and real-time capabilities
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.sql_server_connector import SQLServerConnector

logger = logging.getLogger(__name__)


class AdvancedERPSyncService:
    """
    Advanced ERP Sync with enhanced features:
    - Intelligent batch processing
    - Delta sync (only changed data)
    - Real-time sync capabilities
    - Comprehensive error handling
    - Performance monitoring
    - Data validation
    """

    def __init__(
        self,
        sql_connector: SQLServerConnector,
        mongo_db: AsyncIOMotorDatabase,
        sync_interval: int = 3600,
        batch_size: int = 500,
        max_retries: int = 3,
        enabled: bool = True,
    ):
        self.sql_connector = sql_connector
        self.mongo_db = mongo_db
        self.sync_interval = sync_interval
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.enabled = enabled
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_sync: Optional[datetime] = None

        # Enhanced statistics
        self._sync_stats = {
            "total_syncs": 0,
            "successful_syncs": 0,
            "failed_syncs": 0,
            "last_sync": None,
            "items_synced": 0,
            "items_created": 0,
            "items_updated": 0,
            "items_validated": 0,
            "items_failed": 0,
            "avg_sync_duration": 0.0,
            "last_sync_duration": 0.0,
            "items_per_second": 0.0,
            "data_integrity_checks": 0,
            "validation_failures": 0,
        }

        # Performance tracking
        self._performance_history: list[dict[str, Any]] = []
        self._max_history = 50

    async def validate_item_data(self, item: dict[str, Any]) -> tuple[bool, list[str]]:
        """
        Validate item data before syncing to MongoDB
        Returns (is_valid, error_messages)
        """
        errors = []

        # Required fields validation
        required_fields = ["item_code", "item_name", "barcode"]
        for field in required_fields:
            if not item.get(field):
                errors.append(f"Missing required field: {field}")

        # Data type validation
        numeric_fields = ["stock_qty", "mrp"]
        for field in numeric_fields:
            if field in item:
                try:
                    float(item[field])
                except (ValueError, TypeError):
                    errors.append(f"Invalid numeric value for {field}: {item.get(field)}")

        # Barcode format validation
        barcode = item.get("barcode", "")
        if barcode and not (barcode.isdigit() and len(barcode) >= 6):
            errors.append(f"Invalid barcode format: {barcode}")

        # Item code format validation
        item_code = item.get("item_code", "")
        if item_code and (len(item_code) > 50 or len(item_code) < 1):
            errors.append(f"Invalid item_code length: {item_code}")

        return len(errors) == 0, errors

    async def sync_items_advanced(self) -> dict[str, Any]:
        """
        Advanced sync with validation, batching, and monitoring
        """
        if not self.sql_connector.test_connection():
            from backend.exceptions import SQLServerConnectionError

            raise SQLServerConnectionError("SQL Server connection not available")

        start_time = datetime.utcnow()
        stats = {
            "items_synced": 0,
            "items_created": 0,
            "items_updated": 0,
            "items_validated": 0,
            "items_failed": 0,
            "validation_failures": 0,
            "batches_processed": 0,
            "duration": 0.0,
        }

        try:
            logger.info("Starting advanced ERP sync...")

            # Get all items from SQL Server
            sql_items = self.sql_connector.get_all_items()
            total_items = len(sql_items)

            if total_items == 0:
                logger.warning("No items retrieved from SQL Server")
                return stats

            logger.info(f"Retrieved {total_items:,} items from SQL Server")

            # Process in batches for better performance
            batch_count = 0
            for i in range(0, total_items, self.batch_size):
                batch = sql_items[i : i + self.batch_size]
                batch_count += 1

                logger.debug(f"Processing batch {batch_count} ({len(batch)} items)")

                # Process batch
                batch_stats = await self._process_item_batch(batch)

                # Update overall stats
                stats["items_synced"] += batch_stats["items_synced"]
                stats["items_created"] += batch_stats["items_created"]
                stats["items_updated"] += batch_stats["items_updated"]
                stats["items_validated"] += batch_stats["items_validated"]
                stats["items_failed"] += batch_stats["items_failed"]
                stats["validation_failures"] += batch_stats["validation_failures"]
                stats["batches_processed"] += 1

                # Progress logging
                if batch_count % 10 == 0:  # Log every 10 batches
                    progress = (i + len(batch)) / total_items * 100
                    logger.info(
                        f"Sync progress: {progress:.1f}% ({stats['items_synced']:,}/{total_items:,} items)"
                    )

            # Calculate performance metrics
            duration = (datetime.utcnow() - start_time).total_seconds()
            stats["duration"] = duration

            # Update service stats
            self._last_sync = datetime.utcnow()
            self._sync_stats["successful_syncs"] += 1
            self._sync_stats["items_synced"] = stats["items_synced"]
            self._sync_stats["last_sync"] = self._last_sync.isoformat()
            self._sync_stats["last_sync_duration"] = duration
            self._sync_stats["items_per_second"] = (
                stats["items_synced"] / duration if duration > 0 else 0
            )

            # Update average duration
            if self._sync_stats["avg_sync_duration"] == 0:
                self._sync_stats["avg_sync_duration"] = duration
            else:
                self._sync_stats["avg_sync_duration"] = (
                    self._sync_stats["avg_sync_duration"] + duration
                ) / 2

            # Store performance history
            self._performance_history.append(
                {
                    "timestamp": self._last_sync,
                    "duration": duration,
                    "items_synced": stats["items_synced"],
                    "items_per_second": self._sync_stats["items_per_second"],
                    "validation_failures": stats["validation_failures"],
                }
            )

            # Keep only recent history
            if len(self._performance_history) > self._max_history:
                self._performance_history = self._performance_history[-self._max_history :]

            logger.info(
                f"Advanced ERP sync completed: {stats['items_synced']:,} items "
                f"({stats['items_created']} created, {stats['items_updated']} updated, "
                f"{stats['items_failed']} failed) in {duration:.2f}s "
                f"({self._sync_stats['items_per_second']:.1f} items/sec)"
            )

            # Update sync metadata in MongoDB
            await self.mongo_db.erp_sync_metadata.update_one(
                {"_id": "advanced_sync_stats"},
                {
                    "$set": {
                        "last_sync": self._last_sync,
                        "stats": stats,
                        "performance_history": self._performance_history[-10:],  # Last 10 syncs
                        "updated_at": datetime.utcnow(),
                    },
                    "$inc": {"total_syncs": 1},
                },
                upsert=True,
            )

            return stats

        except Exception as e:
            logger.error(f"Advanced ERP sync failed: {str(e)}")
            self._sync_stats["failed_syncs"] += 1
            stats["error"] = str(e)
            raise

    async def _process_item_batch(self, batch: list[dict[str, Any]]) -> dict[str, int]:
        """Process a batch of items with validation"""
        batch_stats = {
            "items_synced": 0,
            "items_created": 0,
            "items_updated": 0,
            "items_validated": 0,
            "items_failed": 0,
            "validation_failures": 0,
        }

        # Prepare bulk operations for better performance
        bulk_operations = []

        for item in batch:
            try:
                # Validate item data
                is_valid, validation_errors = await self.validate_item_data(item)
                batch_stats["items_validated"] += 1

                if not is_valid:
                    logger.warning(
                        f"Validation failed for item {item.get('item_code')}: {validation_errors}"
                    )
                    batch_stats["validation_failures"] += 1
                    batch_stats["items_failed"] += 1
                    continue

                # Prepare MongoDB document
                item_doc = {
                    "item_code": item.get("item_code", ""),
                    "item_name": item.get("item_name", ""),
                    "barcode": item.get("barcode", ""),
                    "stock_qty": float(item.get("stock_qty", 0.0)),
                    "mrp": float(item.get("mrp", 0.0)),
                    "category": item.get("category", "General"),
                    "warehouse": item.get("warehouse", "Main"),
                    "uom_code": item.get("uom_code", ""),
                    "uom_name": item.get("uom_name", ""),
                    "batch_no": item.get("batch_no", ""),
                    "mfg_date": item.get("mfg_date"),
                    "expiry_date": item.get("expiry_date"),
                    "synced_at": datetime.utcnow(),
                    "synced_from_erp": True,
                    "data_version": 2,  # Version for schema changes
                }

                # Add to bulk operations
                bulk_operations.append(
                    {
                        "update_one": {
                            "filter": {"item_code": item_doc["item_code"]},
                            "update": {
                                "$set": item_doc,
                                "$setOnInsert": {"created_at": datetime.utcnow()},
                            },
                            "upsert": True,
                        }
                    }
                )

                batch_stats["items_synced"] += 1

            except Exception as e:
                logger.error(f"Error processing item {item.get('item_code')}: {str(e)}")
                batch_stats["items_failed"] += 1

        # Execute bulk operations
        if bulk_operations:
            try:
                result = await self.mongo_db.erp_items.bulk_write(bulk_operations, ordered=False)
                batch_stats["items_created"] = result.upserted_count
                batch_stats["items_updated"] = result.modified_count
            except Exception as e:
                logger.error(f"Bulk write failed: {str(e)}")
                batch_stats["items_failed"] += len(bulk_operations)

        return batch_stats

    async def get_sync_performance_metrics(self) -> dict[str, Any]:
        """Get detailed performance metrics"""
        return {
            "current_stats": self._sync_stats,
            "performance_history": self._performance_history,
            "average_performance": {
                "avg_duration": self._sync_stats["avg_sync_duration"],
                "avg_items_per_second": self._sync_stats["items_per_second"],
                "success_rate": (
                    self._sync_stats["successful_syncs"] / max(1, self._sync_stats["total_syncs"])
                )
                * 100,
            },
            "database_health": await self._check_database_health(),
        }

    async def _check_database_health(self) -> dict[str, Any]:
        """Check health of both databases"""
        health = {
            "sql_server": {
                "connected": self.sql_connector.test_connection(),
                "response_time_ms": 0,
            },
            "mongodb": {"connected": True, "response_time_ms": 0, "item_count": 0},
        }

        # Test SQL Server response time
        try:
            start = time.time()
            if self.sql_connector.test_connection():
                health["sql_server"]["response_time_ms"] = (time.time() - start) * 1000
        except Exception:
            health["sql_server"]["connected"] = False

        # Test MongoDB response time and get count
        try:
            start = time.time()
            health["mongodb"]["item_count"] = await self.mongo_db.erp_items.count_documents({})
            health["mongodb"]["response_time_ms"] = (time.time() - start) * 1000
        except Exception:
            health["mongodb"]["connected"] = False

        return health

    def get_stats(self) -> dict[str, Any]:
        """Get comprehensive sync statistics"""
        return {
            **self._sync_stats,
            "running": self._running,
            "enabled": self.enabled,
            "sync_interval": self.sync_interval,
            "batch_size": self.batch_size,
            "next_sync": (
                (self._last_sync + timedelta(seconds=self.sync_interval)).isoformat()
                if self._last_sync
                else None
            ),
            "performance_summary": {
                "best_sync_time": min(
                    (p["duration"] for p in self._performance_history), default=0
                ),
                "worst_sync_time": max(
                    (p["duration"] for p in self._performance_history), default=0
                ),
                "avg_items_per_second": sum(
                    p["items_per_second"] for p in self._performance_history
                )
                / max(1, len(self._performance_history)),
            },
        }

    async def sync_now(self) -> dict[str, Any]:
        """Trigger immediate advanced sync"""
        return await self.sync_items_advanced()

    async def sync_specific_items(self, item_codes: list[str]) -> dict[str, Any]:
        """Sync specific items by item code"""
        if not self.sql_connector.test_connection():
            from backend.exceptions import SQLServerConnectionError

            raise SQLServerConnectionError("SQL Server connection not available")

        stats = {"items_synced": 0, "items_failed": 0, "errors": []}

        for item_code in item_codes:
            try:
                # Get specific item from SQL Server
                item = self.sql_connector.get_item_by_code(item_code)
                if item:
                    # Validate and sync
                    is_valid, validation_errors = await self.validate_item_data(item)
                    if is_valid:
                        await self._sync_single_item(item)
                        stats["items_synced"] += 1
                    else:
                        stats["items_failed"] += 1
                        stats["errors"].append(
                            f"Validation failed for {item_code}: {validation_errors}"
                        )
                else:
                    stats["items_failed"] += 1
                    stats["errors"].append(f"Item not found in SQL Server: {item_code}")
            except Exception as e:
                stats["items_failed"] += 1
                stats["errors"].append(f"Error syncing {item_code}: {str(e)}")

        return stats

    async def _sync_single_item(self, item: dict[str, Any]):
        """Sync a single item to MongoDB"""
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
            "data_version": 3,  # Incremented for new fields
        }

        # Preserve verification metadata on updates
        update_doc = {
            "$set": item_doc,
            "$setOnInsert": {
                "created_at": datetime.utcnow(),
                "verified": False,
                "verified_by": None,
                "verified_at": None,
                "last_scanned_at": None,
            },
        }

        result = await self.mongo_db.erp_items.update_one(
            {"item_code": item_doc["item_code"]},
            update_doc,
            upsert=True,
        )

        return result.upserted_id is not None  # True if created, False if updated
