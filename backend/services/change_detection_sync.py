"""
Change Detection Sync Service
Syncs specific fields (item_name, AutoBarcode, MRP) from Products table
with change detection to only update changed items

This module uses the Result pattern for error handling to make error states
explicit and handle them in a functional way.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import UpdateMany

from backend.sql_server_connector import SQLServerConnector
from backend.utils.result import Fail, Ok, Result, result_function

from .errors import ConnectionError, DatabaseError, SyncConfigError, SyncError

logger = logging.getLogger(__name__)

# Type aliases for better readability
SyncResult = Result[dict[str, Any], SyncError]
ProductData = dict[str, Any]
SyncStats = dict[str, Any]


class ChangeDetectionSyncService:
    """
    Service to sync specific product fields with change detection
    Tracks changes in ERP Products table for: ProductName, AutoBarcode (6-digit), MRP
    """

    def __init__(
        self,
        sql_connector: SQLServerConnector,
        mongo_db: AsyncIOMotorDatabase,
        sync_interval: int = 300,  # 5 minutes default (faster for change detection)
        enabled: bool = True,
        batch_size: int = 1000,
    ):
        self.sql_connector = sql_connector
        self.mongo_db = mongo_db
        self.sync_interval = sync_interval
        self.enabled = enabled
        self.batch_size = batch_size
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._last_sync: Optional[datetime] = None

        # Initialize statistics with proper typing
        self._sync_stats: SyncStats = {
            "total_syncs": 0,
            "successful_syncs": 0,
            "failed_syncs": 0,
            "items_updated": 0,
            "items_checked": 0,
            "last_sync": None,
            "last_error": None,
            "last_success": None,
            "avg_process_time_ms": 0,
        }

    def _get_products_with_changes_query(
        self, last_sync_time: Optional[datetime] = None
    ) -> Result[str, SyncError]:
        """
        Get SQL query to fetch products that may have changed.

        Args:
            last_sync_time: The timestamp of the last successful sync.

        Returns:
            Result containing the SQL query string or an error.
        """
        try:
            mapping = self.sql_connector.mapping
            if not mapping:
                return Fail(SyncConfigError("Database mapping not configured"))

            table_name = mapping["tables"].get("items")
            if not table_name:
                return Fail(SyncConfigError("Items table not configured in mapping"))

            columns = ", ".join(
                [f"{col} as {alias}" for alias, col in mapping["items_columns"].items()]
            )

            query = f"""
                SELECT {columns}
                FROM {table_name}
            """  # nosec

            # Add modified date filter if available
            modified_column = mapping.get("query_options", {}).get("modified_date_column")
            if modified_column and last_sync_time:
                query += f" WHERE {modified_column} >= ?"

            return Ok(query)

        except Exception as e:
            return Fail(
                DatabaseError(
                    "Failed to generate products query",
                    {"error": str(e), "last_sync_time": last_sync_time},
                )
            )
            # unreachable fallback query removed (after return)

    def _build_update_operations(
        self, changes: list[ProductData]
    ) -> Result[list[dict[str, Any]], SyncError]:
        """
        Build MongoDB update operations for changed products.

        Args:
            changes: List of product changes to process.

        Returns:
            Result containing list of update operations or an error.
        """
        if not changes:
            return Ok([])

        try:
            operations = []
            for change in changes:
                if not change.get("barcode"):
                    logger.warning("Skipping product without barcode: %s", change)
                    continue

                update_data = {
                    "item_name": change.get("item_name"),
                    "barcode": change.get("barcode"),  # AutoBarcode (6-digit)
                    "mrp": change.get("mrp"),
                    "last_updated": datetime.utcnow(),
                }

                # Remove None values
                update_data = {k: v for k, v in update_data.items() if v is not None}

                operations.append(
                    UpdateMany(
                        {"barcode": change["barcode"]},
                        {"$set": update_data},
                        upsert=False,  # Don't create new documents, only update existing
                    )
                )

            return Ok(operations)

        except Exception as e:
            return Fail(
                DatabaseError(
                    "Failed to build update operations",
                    {"error": str(e), "num_changes": len(changes) if changes else 0},
                )
            )

    @result_function(SyncError)
    async def _fetch_changed_products(self) -> list[ProductData]:
        """Fetch changed products from the database."""
        query_result = self._get_products_with_changes_query(self._last_sync)
        if query_result.is_err:
            return query_result  # type: ignore

        query = query_result.unwrap()
        params = [self._last_sync] if self._last_sync else None

        try:
            # Execute query and return results
            results = await self.sql_connector.execute_query(query, params)
            return Ok(results or [])
        except Exception as e:
            return Fail(
                DatabaseError(
                    "Failed to execute products query",
                    {"query": query, "error": str(e)},
                )
            )

    @result_function(SyncError)
    async def _apply_changes_to_mongodb(self, changes: list[ProductData]) -> dict[str, int]:
        """Apply changes to MongoDB."""
        if not changes:
            return Ok({"matched": 0, "modified": 0})

        operations_result = self._build_update_operations(changes)
        if operations_result.is_err:
            return operations_result  # type: ignore

        operations = operations_result.unwrap()
        if not operations:
            return Ok({"matched": 0, "modified": 0})

        try:
            result = await self.mongo_db.products.bulk_write(operations)
            return Ok(
                {
                    "matched": result.matched_count,
                    "modified": result.modified_count,
                    "upserted": result.upserted_count,
                }
            )
        except Exception as e:
            return Fail(
                DatabaseError(
                    "Bulk write operation failed",
                    {"num_operations": len(operations), "error": str(e)},
                )
            )

    async def _sync_changes(self) -> SyncResult:
        """
        Perform a single sync of changed products.

        Returns:
            Result containing sync statistics or an error.
        """
        if not self.enabled:
            return Fail(SyncConfigError("Sync is disabled"))

        logger.info("Starting change detection sync...")
        start_time = datetime.utcnow()

        try:
            # Step 1: Fetch changed products
            fetch_result = await self._fetch_changed_products()
            if fetch_result.is_err:
                return fetch_result

            changed_products = fetch_result.unwrap()

            if not changed_products:
                logger.debug("No changed products found")
                return self._finalize_sync(start_time, 0, 0)

            # Step 2: Apply changes to MongoDB
            update_result = await self._apply_changes_to_mongodb(changed_products)
            if update_result.is_err:
                return update_result

            stats = update_result.unwrap()

            # Log results
            logger.info(
                "Updated products in MongoDB. Matched: %d, Modified: %d, Upserted: %d",
                stats["matched"],
                stats["modified"],
                stats.get("upserted", 0),
            )

            # Update and return stats
            return self._finalize_sync(start_time, len(changed_products), stats["modified"])

        except Exception as e:
            error = DatabaseError("Unexpected error during sync", {"error": str(e)})
            logger.exception("Error during change detection sync")
            return Fail(error)

    def _finalize_sync(
        self, start_time: datetime, items_checked: int, items_updated: int
    ) -> SyncResult:
        """Update sync statistics and return results."""
        end_time = datetime.utcnow()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        # Update statistics
        self._sync_stats["total_syncs"] += 1
        self._sync_stats["successful_syncs"] += 1
        self._sync_stats["items_checked"] += items_checked
        self._sync_stats["items_updated"] += items_updated
        self._sync_stats["last_sync"] = end_time.isoformat()
        self._sync_stats["last_success"] = end_time.isoformat()

        # Calculate average processing time
        total_syncs = self._sync_stats["total_syncs"]
        current_avg = self._sync_stats["avg_process_time_ms"]
        self._sync_stats["avg_process_time_ms"] = (
            current_avg * (total_syncs - 1) + duration_ms
        ) / total_syncs

        # Prepare result
        result = {
            "status": "success",
            "duration_ms": duration_ms,
            "items_checked": items_checked,
            "items_updated": items_updated,
            "timestamp": end_time.isoformat(),
        }

        return Ok(result)

    def _update_sync_stats(
        self, success: bool, items_processed: int = 0, error: Optional[str] = None
    ) -> None:
        """
        Update sync statistics.

        Args:
            success: Whether the sync was successful.
            items_processed: Number of items processed in this sync.
            error: Error message if the sync failed.
        """
        now = datetime.utcnow()
        self._sync_stats["total_syncs"] += 1

        if success:
            self._sync_stats["successful_syncs"] += 1
            self._sync_stats["items_checked"] += items_processed
            self._sync_stats["last_success"] = now.isoformat()
            self._sync_stats["last_error"] = None
        else:
            self._sync_stats["failed_syncs"] += 1
            self._sync_stats["last_error"] = {
                "message": error,
                "timestamp": now.isoformat(),
            }

        self._sync_stats["last_sync"] = now.isoformat()

        # Log stats periodically
        if self._sync_stats["total_syncs"] % 10 == 0:  # Every 10 syncs
            logger.info(
                "Sync stats - Total: %d, Success: %d, Failed: %d, Items Checked: %d, Last Error: %s",
                self._sync_stats["total_syncs"],
                self._sync_stats["successful_syncs"],
                self._sync_stats["failed_syncs"],
                self._sync_stats["items_checked"],
                self._sync_stats.get("last_error", "None"),
            )

    async def start(self) -> SyncResult:
        """
        Start the sync service.

        Returns:
            Result indicating success or failure of starting the service.
        """
        if self._running:
            msg = "Sync service already running"
            logger.warning(msg)
            return Fail(SyncError(msg))

        if not self.sql_connector.connection:
            error = ConnectionError("SQL Server connection not established")
            logger.error(str(error))
            return Fail(error)

        try:
            self._running = True
            self._task = asyncio.create_task(self._run())
            logger.info("Change detection sync service started")
            return Ok({"status": "started", "timestamp": datetime.utcnow().isoformat()})

        except Exception as e:
            self._running = False
            error = SyncError("Failed to start sync service", {"error": str(e)})
            logger.error(str(error))
            return Fail(error)

    async def stop(self) -> SyncResult:
        """
        Stop the sync service.

        Returns:
            Result indicating success or failure of stopping the service.
        """
        if not self._running:
            msg = "Sync service not running"
            logger.warning(msg)
            return Fail(SyncError(msg))

        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                logger.debug("Sync task cancelled successfully")
            except Exception as e:
                error = SyncError("Error while stopping sync service", {"error": str(e)})
                logger.error(str(error))
                return Fail(error)

        logger.info("Change detection sync service stopped")
        return Ok({"status": "stopped", "timestamp": datetime.utcnow().isoformat()})

    async def sync_now(self) -> dict[str, Any]:
        """Trigger immediate change detection sync"""
        return await self.sync_changed_items(force_full=True)

    def get_status(self) -> dict[str, Any]:
        """
        Get current status of the sync service.

        Returns:
            Dictionary containing the current status, including:
            - running: Whether the service is currently running
            - enabled: Whether the service is enabled
            - last_sync: Timestamp of last sync
            - next_sync_in: Seconds until next sync
            - stats: Detailed sync statistics
        """
        status = {
            "running": self._running,
            "enabled": self.enabled,
            "last_sync": self._last_sync.isoformat() if self._last_sync else None,
            "next_sync_in": self._get_next_sync_in(),
            "stats": self._sync_stats.copy(),  # Return a copy to prevent modification
        }

        # Add additional calculated metrics
        if self._sync_stats["total_syncs"] > 0:
            success_rate = (
                self._sync_stats["successful_syncs"] / self._sync_stats["total_syncs"] * 100
            )
            status["success_rate"] = f"{success_rate:.1f}%"

        return status
