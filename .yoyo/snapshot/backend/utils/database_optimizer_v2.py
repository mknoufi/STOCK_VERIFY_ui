"""
Ultra-Modern Database Query Optimizer (2024/2025 Best Practices)
Zero-error, type-safe, high-performance database operations
"""

import logging
from typing import Dict, Any, List, Optional, TypeVar, Generic
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
import time

from backend.utils.result_types import Result
from backend.utils.async_utils import AsyncExecutor, safe_async_execute

logger = logging.getLogger(__name__)

T = TypeVar("T")


class OptimizedDatabaseQuery(Generic[T]):
    """
    Type-safe, zero-error database query builder
    Modern fluent API with Result types
    """

    def __init__(
        self,
        collection: AsyncIOMotorCollection,
        executor: Optional[AsyncExecutor] = None,
    ):
        self.collection = collection
        self.executor = executor or AsyncExecutor()
        self._pipeline = []
        self._filters = {}
        self._projection = None
        self._sort = None
        self._limit_val = None
        self._skip_val = None

    def filter(self, **filters: Any) -> "OptimizedDatabaseQuery[T]":
        """Add filters (chainable)"""
        self._filters.update(filters)
        return self

    def project(self, projection: Dict[str, int]) -> "OptimizedDatabaseQuery[T]":
        """Add projection (field selection)"""
        self._projection = projection
        return self

    def sort(self, sort_dict: Dict[str, int]) -> "OptimizedDatabaseQuery[T]":
        """Add sorting"""
        self._sort = sort_dict
        return self

    def limit(self, limit: int) -> "OptimizedDatabaseQuery[T]":
        """Add limit"""
        self._limit_val = limit
        return self

    def skip(self, skip: int) -> "OptimizedDatabaseQuery[T]":
        """Add skip"""
        self._skip_val = skip
        return self

    async def find_one(self) -> Result[Optional[Dict[str, Any]], Exception]:
        """Find one document with zero-error handling"""

        async def _find_one():
            return await self.collection.find_one(self._filters, self._projection)

        return await safe_async_execute(_find_one(), f"find_one:{self.collection.name}")

    async def find_many(self) -> Result[List[Dict[str, Any]], Exception]:
        """Find many documents with zero-error handling"""

        async def _find_many():
            cursor = self.collection.find(self._filters, self._projection)

            if self._sort:
                cursor = cursor.sort(list(self._sort.items()))

            if self._skip_val:
                cursor = cursor.skip(self._skip_val)

            if self._limit_val:
                cursor = cursor.limit(self._limit_val)

            return await cursor.to_list(length=self._limit_val or 1000)

        return await safe_async_execute(_find_many(), f"find_many:{self.collection.name}")

    async def count(self) -> Result[int, Exception]:
        """Count documents with zero-error handling"""

        async def _count():
            return await self.collection.count_documents(self._filters)

        return await safe_async_execute(_count(), f"count:{self.collection.name}")

    async def aggregate(
        self, pipeline: List[Dict[str, Any]]
    ) -> Result[List[Dict[str, Any]], Exception]:
        """Execute aggregation pipeline with zero-error handling"""

        async def _aggregate():
            cursor = self.collection.aggregate(pipeline)
            return await cursor.to_list(length=None)

        return await safe_async_execute(_aggregate(), f"aggregate:{self.collection.name}")

    async def upsert(
        self, document: Dict[str, Any], upsert_key: str = "_id"
    ) -> Result[bool, Exception]:
        """Upsert document with zero-error handling"""

        async def _upsert():
            key_value = document.get(upsert_key)
            if not key_value:
                raise ValueError(f"Upsert key {upsert_key} not found in document")

            result = await self.collection.update_one(
                {upsert_key: key_value},
                {"$set": document, "$setOnInsert": {"created_at": datetime.utcnow()}},
                upsert=True,
            )
            return result.upserted_id is not None

        return await safe_async_execute(_upsert(), f"upsert:{self.collection.name}")


class DatabaseQueryBuilder:
    """
    Ultra-modern database query builder with zero-error patterns
    """

    def __init__(self, mongo_db: AsyncIOMotorDatabase):
        self.mongo_db = mongo_db
        self.executor = AsyncExecutor()

    def collection(self, name: str) -> OptimizedDatabaseQuery:
        """Get query builder for collection"""
        return OptimizedDatabaseQuery(self.mongo_db[name], self.executor)

    async def bulk_upsert(
        self,
        collection_name: str,
        documents: List[Dict[str, Any]],
        upsert_key: str = "item_code",
        batch_size: int = 500,
    ) -> Result[Dict[str, int], Exception]:
        """
        Ultra-fast bulk upsert with batching and zero-error handling
        """

        async def _bulk_upsert():
            collection = self.mongo_db[collection_name]
            stats = {"created": 0, "updated": 0, "errors": 0}

            # Process in batches
            for i in range(0, len(documents), batch_size):
                batch = documents[i : i + batch_size]

                # Prepare bulk operations
                bulk_ops = []
                for doc in batch:
                    key_value = doc.get(upsert_key)
                    if not key_value:
                        stats["errors"] += 1
                        continue

                    bulk_ops.append(
                        {
                            "updateOne": {
                                "filter": {upsert_key: key_value},
                                "update": {
                                    "$set": {**doc, "updated_at": datetime.utcnow()},
                                    "$setOnInsert": {"created_at": datetime.utcnow()},
                                },
                                "upsert": True,
                            }
                        }
                    )

                if bulk_ops:
                    try:
                        result = await collection.bulk_write(bulk_ops, ordered=False)
                        stats["created"] += result.upserted_count
                        stats["updated"] += result.modified_count
                    except Exception as e:
                        logger.error(f"Bulk upsert batch failed: {str(e)}")
                        stats["errors"] += len(bulk_ops)

            return stats

        return await safe_async_execute(_bulk_upsert(), f"bulk_upsert:{collection_name}")

    async def indexed_lookup(
        self, collection_name: str, index_field: str, value: Any
    ) -> Result[Optional[Dict[str, Any]], Exception]:
        """
        Optimized indexed lookup with zero-error handling
        Ensures index usage for maximum performance
        """

        async def _indexed_lookup():
            collection = self.mongo_db[collection_name]

            # Verify index exists
            indexes = await collection.list_indexes().to_list(None)
            index_names = [idx.get("name") for idx in indexes]

            # Create index if missing
            if f"{index_field}_1" not in index_names:
                await collection.create_index(index_field, background=True)

            # Execute indexed query
            return await collection.find_one({index_field: value})

        return await safe_async_execute(
            _indexed_lookup(), f"indexed_lookup:{collection_name}:{index_field}"
        )

    async def get_with_cache(
        self,
        collection_name: str,
        cache_key: str,
        query: Dict[str, Any],
        ttl: int = 1800,
        cache: Optional[Any] = None,
    ) -> Result[Optional[Dict[str, Any]], Exception]:
        """
        Get document with automatic caching (zero-error)
        """
        # Try cache first if available
        if cache:
            try:
                cached = await cache.get(cache_key)
                if cached is not None:
                    return Result.success(cached)
            except Exception:
                pass  # Continue to database

        # Get from database
        result = await self.indexed_lookup(
            collection_name, list(query.keys())[0], list(query.values())[0]
        )

        # Cache result if successful
        if result.is_success and result._value and cache:
            try:
                await cache.set(cache_key, result._value, ttl)
            except Exception:
                pass  # Non-critical

        return result


class PerformanceMonitor:
    """
    High-performance query performance monitoring
    """

    def __init__(self):
        self._metrics = {}
        self._slow_query_threshold = 1.0  # seconds

    async def measure_query(self, operation_name: str, coro) -> Result[Any, Exception]:
        """Measure query performance"""
        start_time = time.time()

        result = await coro

        duration = time.time() - start_time

        # Track metrics
        if operation_name not in self._metrics:
            self._metrics[operation_name] = {
                "count": 0,
                "total_time": 0.0,
                "min_time": float("inf"),
                "max_time": 0.0,
                "slow_queries": 0,
            }

        metrics = self._metrics[operation_name]
        metrics["count"] += 1
        metrics["total_time"] += duration
        metrics["min_time"] = min(metrics["min_time"], duration)
        metrics["max_time"] = max(metrics["max_time"], duration)

        if duration > self._slow_query_threshold:
            metrics["slow_queries"] += 1
            logger.warning(f"Slow query detected: {operation_name} took {duration:.2f}s")

        return result

    def get_metrics(self, operation_name: Optional[str] = None) -> Dict[str, Any]:
        """Get performance metrics"""
        if operation_name:
            if operation_name in self._metrics:
                metrics = self._metrics[operation_name]
                return {
                    **metrics,
                    "avg_time": (
                        metrics["total_time"] / metrics["count"] if metrics["count"] > 0 else 0
                    ),
                }
            return {}

        # Return all metrics
        return {
            name: {
                **metrics,
                "avg_time": metrics["total_time"] / metrics["count"] if metrics["count"] > 0 else 0,
            }
            for name, metrics in self._metrics.items()
        }


# Global instances
_query_builder = None
_performance_monitor = PerformanceMonitor()


def get_query_builder(mongo_db) -> DatabaseQueryBuilder:
    """Get global query builder instance"""
    global _query_builder
    if _query_builder is None:
        _query_builder = DatabaseQueryBuilder(mongo_db)
    return _query_builder
