"""
Batch Operations Service
Handles bulk operations for improved performance
"""

import logging
from typing import List, Dict, Any, Callable
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
import asyncio

logger = logging.getLogger(__name__)


class BatchOperationsService:
    """Service for batch operations"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.batch_size = 100

    async def batch_insert(
        self, collection: str, documents: List[Dict[str, Any]], ordered: bool = True
    ) -> Dict[str, Any]:
        """Insert multiple documents in batches"""
        if not documents:
            return {"inserted_count": 0, "errors": []}

        total_inserted = 0
        errors = []

        # Process in batches
        for i in range(0, len(documents), self.batch_size):
            batch = documents[i : i + self.batch_size]
            try:
                result = await self.db[collection].insert_many(batch, ordered=ordered)
                total_inserted += len(result.inserted_ids)
                logger.info(f"Inserted batch {i // self.batch_size + 1}: {len(batch)} documents")
            except Exception as e:
                error_msg = f"Error inserting batch {i // self.batch_size + 1}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                if ordered:
                    break  # Stop on error if ordered

        return {
            "inserted_count": total_inserted,
            "total": len(documents),
            "errors": errors,
            "success": len(errors) == 0,
        }

    async def batch_update(
        self,
        collection: str,
        updates: List[Dict[str, Any]],
        update_operation: Callable = None,
    ) -> Dict[str, Any]:
        """Update multiple documents in batches"""
        if not updates:
            return {"updated_count": 0, "errors": []}

        total_updated = 0
        errors = []

        # Default update operation
        if update_operation is None:

            async def default_update(update_data):
                filter_query = update_data.get("filter", {})
                update_query = update_data.get("update", {})
                result = await self.db[collection].update_many(filter_query, update_query)
                return result.modified_count

        # Process in batches
        for i in range(0, len(updates), self.batch_size):
            batch = updates[i : i + self.batch_size]
            try:
                # Execute batch updates concurrently
                tasks = [update_operation(item) for item in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                for idx, result in enumerate(results):
                    if isinstance(result, Exception):
                        errors.append(f"Error updating item {i + idx}: {str(result)}")
                    else:
                        total_updated += result

                logger.info(f"Updated batch {i // self.batch_size + 1}: {len(batch)} documents")
            except Exception as e:
                error_msg = f"Error updating batch {i // self.batch_size + 1}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)

        return {
            "updated_count": total_updated,
            "total": len(updates),
            "errors": errors,
            "success": len(errors) == 0,
        }

    async def batch_delete(
        self, collection: str, filters: List[Dict[str, Any]], ordered: bool = True
    ) -> Dict[str, Any]:
        """Delete multiple documents in batches"""
        if not filters:
            return {"deleted_count": 0, "errors": []}

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
            except Exception as e:
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
        self, items: List[Dict[str, Any]], upsert: bool = True
    ) -> Dict[str, Any]:
        """Batch import ERP items with upsert"""
        if not items:
            return {"imported_count": 0, "errors": []}

        total_imported = 0
        errors = []

        # Process in batches
        for i in range(0, len(items), self.batch_size):
            batch = items[i : i + self.batch_size]
            try:
                operations = []
                for item in batch:
                    if upsert:
                        operations.append(
                            {
                                "replaceOne": {
                                    "filter": {"item_code": item.get("item_code")},
                                    "replacement": {
                                        **item,
                                        "synced_at": datetime.utcnow(),
                                        "updated_at": datetime.utcnow(),
                                    },
                                    "upsert": True,
                                }
                            }
                        )
                    else:
                        operations.append(
                            {
                                "insertOne": {
                                    "document": {
                                        **item,
                                        "synced_at": datetime.utcnow(),
                                        "created_at": datetime.utcnow(),
                                    }
                                }
                            }
                        )

                result = await self.db.erp_items.bulk_write(operations, ordered=False)
                total_imported += (
                    result.upserted_count + result.modified_count + result.inserted_count
                )
                logger.info(f"Imported batch {i // self.batch_size + 1}: {len(batch)} items")
            except Exception as e:
                error_msg = f"Error importing batch {i // self.batch_size + 1}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)

        return {
            "imported_count": total_imported,
            "total": len(items),
            "errors": errors,
            "success": len(errors) == 0,
        }
