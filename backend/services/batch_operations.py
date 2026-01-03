"""
Batch Operations Service
Handles bulk operations for improved performance with progress tracking
"""

import asyncio
import logging
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any, Optional, Union

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import InsertOne, ReplaceOne, UpdateOne
from pymongo.errors import PyMongoError

UTC = timezone.utc

logger = logging.getLogger(__name__)


class BatchOperationsService:
    """Service for batch operations with progress tracking and optimized concurrency"""

    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        batch_size: int = 100,
        max_concurrent_batches: int = 5,
    ) -> None:
        """
        Initialize batch operations service

        Args:
            db: MongoDB database instance
            batch_size: Number of items per batch (default: 100)
            max_concurrent_batches: Maximum concurrent batches (default: 5)
        """
        self.db = db
        self.batch_size = batch_size
        self.max_concurrent_batches = max_concurrent_batches

    async def batch_insert(
        self,
        collection: str,
        documents: list[dict[str, Any]],
        ordered: bool = True,
        progress_callback: Callable[[int, int], None] = None,
    ) -> dict[str, Any]:
        """
        Insert multiple documents in batches with progress tracking

        Args:
            collection: Collection name
            documents: List of documents to insert
            ordered: Whether to stop on first error
            progress_callback: Optional callback(current, total) for progress updates
        """
        if not documents:
            return {"inserted_count": 0, "errors": [], "total": 0, "success": True}

        total_inserted = 0
        errors = []
        total = len(documents)
        batches = [documents[i : i + self.batch_size] for i in range(0, total, self.batch_size)]

        # Process batches with controlled concurrency
        semaphore = asyncio.Semaphore(self.max_concurrent_batches)

        async def process_batch(batch: list[dict[str, Any]], batch_num: int) -> None:
            async with semaphore:
                try:
                    result = await self.db[collection].insert_many(batch, ordered=ordered)
                    nonlocal total_inserted
                    total_inserted += len(result.inserted_ids)
                    logger.debug(f"Inserted batch {batch_num}: {len(batch)} documents")

                    if progress_callback:
                        progress_callback(total_inserted, total)
                except PyMongoError as e:
                    error_msg = f"Error inserting batch {batch_num}: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    errors.append(
                        {
                            "batch": batch_num,
                            "error": error_msg,
                            "error_type": type(e).__name__,
                        }
                    )
                    if ordered:
                        raise  # Re-raise to stop processing

        try:
            # Process batches concurrently
            tasks = [process_batch(batch, i + 1) for i, batch in enumerate(batches)]
            await asyncio.gather(*tasks, return_exceptions=True)
        except Exception as e:
            if ordered:
                logger.error(f"Batch insert stopped due to error: {str(e)}", exc_info=True)

        return {
            "inserted_count": total_inserted,
            "total": total,
            "errors": errors,
            "success": len(errors) == 0,
            "batches_processed": len(batches) - len(errors),
        }

    async def batch_update(
        self,
        collection: str,
        updates: list[dict[str, Any]],
        update_operation: Optional[Callable] = None,
        progress_callback: Callable[[int, int], None] = None,
    ) -> dict[str, Any]:
        """
        Update multiple documents in batches with progress tracking

        Args:
            collection: Collection name
            updates: List of update operations
            update_operation: Custom update function, or None for default
            progress_callback: Optional callback(current, total) for progress updates
        """
        if not updates:
            return {"updated_count": 0, "errors": [], "total": 0, "success": True}

        total_updated = 0
        errors = []
        total = len(updates)

        # Default update operation
        if update_operation is None:

            async def default_update(batch):
                operations = [
                    UpdateOne(item.get("filter", {}), item.get("update", {})) for item in batch
                ]
                if not operations:
                    return 0
                result = await self.db[collection].bulk_write(operations, ordered=False)
                return result.modified_count

            update_operation = default_update

        batches = [updates[i : i + self.batch_size] for i in range(0, total, self.batch_size)]
        semaphore = asyncio.Semaphore(self.max_concurrent_batches)

        async def process_batch(batch: list[dict[str, Any]], batch_num: int) -> None:
            async with semaphore:
                try:
                    # Execute batch updates
                    batch_updated = await update_operation(batch)

                    nonlocal total_updated
                    total_updated += batch_updated
                    logger.debug(f"Updated batch {batch_num}: {batch_updated} documents")

                    if progress_callback:
                        progress_callback(total_updated, total)
                except Exception as e:
                    error_msg = f"Error updating batch {batch_num}: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    errors.append({"batch": batch_num, "error": error_msg})

        # Process all batches concurrently
        tasks = [process_batch(batch, i + 1) for i, batch in enumerate(batches)]
        await asyncio.gather(*tasks, return_exceptions=True)

        return {
            "updated_count": total_updated,
            "total": total,
            "errors": errors,
            "success": len(errors) == 0,
            "batches_processed": len(batches),
        }

    async def batch_delete(
        self, collection: str, filters: list[dict[str, Any]], ordered: bool = True
    ) -> dict[str, Any]:
        """Delete multiple documents in batches"""
        if not filters:
            return {"deleted_count": 0, "errors": [], "total": 0, "success": True}

        total_deleted = 0
        errors = []

        # Process in batches
        for i in range(0, len(filters), self.batch_size):
            batch = filters[i : i + self.batch_size]
            try:
                # Combine filters with OR
                combined_filter = {"$or": batch} if len(batch) > 1 else batch[0]
                result = await self.db[collection].delete_many(combined_filter)
                total_deleted += result.deleted_count
                logger.info(
                    f"Deleted batch {i // self.batch_size + 1}: {result.deleted_count} documents"
                )
            except PyMongoError as e:
                error_msg = f"Error deleting batch {i // self.batch_size + 1}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                if ordered:
                    break

        return {
            "deleted_count": total_deleted,
            "total": len(filters),
            "errors": errors,
            "success": len(errors) == 0,
        }

    async def batch_import_items(
        self,
        items: list[dict[str, Any]],
        upsert: bool = True,
        progress_callback: Callable[[int, int], None] = None,
    ) -> dict[str, Any]:
        """
        Batch import ERP items with upsert and progress tracking

        Args:
            items: List of items to import
            upsert: Whether to upsert (update or insert)
            progress_callback: Optional callback(current, total) for progress updates
        """
        if not items:
            return {"imported_count": 0, "errors": [], "total": 0, "success": True}

        total_imported = 0
        errors = []
        total = len(items)
        batches = [items[i : i + self.batch_size] for i in range(0, total, self.batch_size)]
        semaphore = asyncio.Semaphore(self.max_concurrent_batches)

        async def process_batch(batch: list[dict[str, Any]], batch_num: int) -> None:
            async with semaphore:
                try:
                    operations: list[Union[InsertOne, ReplaceOne]] = []
                    now = datetime.now(UTC)

                    for item in batch:
                        if upsert:
                            operations.append(
                                ReplaceOne(
                                    filter={"item_code": item.get("item_code")},
                                    replacement={
                                        **item,
                                        "synced_at": now,
                                        "updated_at": now,
                                    },
                                    upsert=True,
                                )
                            )
                        else:
                            operations.append(
                                InsertOne(
                                    document={
                                        **item,
                                        "synced_at": now,
                                        "created_at": now,
                                    }
                                )
                            )

                    result = await self.db.erp_items.bulk_write(operations, ordered=False)
                    batch_imported = (
                        result.upserted_count + result.modified_count + result.inserted_count
                    )

                    nonlocal total_imported
                    total_imported += batch_imported
                    logger.debug(f"Imported batch {batch_num}: {batch_imported} items")

                    if progress_callback:
                        progress_callback(total_imported, total)
                except PyMongoError as e:
                    error_msg = f"Error importing batch {batch_num}: {str(e)}"
                    logger.error(error_msg, exc_info=True)
                    errors.append({"batch": batch_num, "error": error_msg})

        # Process all batches concurrently
        tasks = [process_batch(batch, i + 1) for i, batch in enumerate(batches)]
        await asyncio.gather(*tasks, return_exceptions=True)

        return {
            "imported_count": total_imported,
            "total": total,
            "errors": errors,
            "success": len(errors) == 0,
            "batches_processed": len(batches) - len(errors),
        }
