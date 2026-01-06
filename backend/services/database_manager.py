"""
Comprehensive Database Manager - Handles all database operations with enhanced features
"""

import logging
import time
from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from backend.sql_server_connector import SQLServerConnector

logger = logging.getLogger(__name__)


def _build_collection_recommendation(
    collection: str, count: int, priority: str, msg_template: str
) -> dict[str, Any]:
    """Build a recommendation dict for database insights."""
    return {
        "type": "performance" if priority == "medium" else "data",
        "priority": priority,
        "message": msg_template.format(collection=collection, count=count),
    }


class DatabaseManager:
    """
    Centralized database management with:
    - Connection health monitoring
    - Performance optimization
    - Data integrity checks
    - Automated maintenance
    - Backup coordination
    """

    def __init__(
        self,
        mongo_client: AsyncIOMotorClient,
        mongo_db: AsyncIOMotorDatabase,
        sql_connector: SQLServerConnector,
    ):
        self.mongo_client = mongo_client
        self.mongo_db = mongo_db
        self.sql_connector = sql_connector
        self._health_stats = {
            "last_health_check": None,
            "mongo_health": "unknown",
            "sql_health": "unknown",
            "mongo_response_time": 0.0,
            "sql_response_time": 0.0,
            "mongo_connections": 0,
            "sql_connections": 0,
        }

    async def check_database_health(self) -> dict[str, Any]:
        """Comprehensive database health check"""
        health_start = time.time()

        # MongoDB Health Check
        mongo_health = await self._check_mongodb_health()

        # SQL Server Health Check
        sql_health = await self._check_sql_server_health()

        # Overall health determination
        overall_status = "healthy"
        if mongo_health["status"] != "healthy" or sql_health["status"] != "healthy":
            overall_status = "degraded"

        if mongo_health["status"] == "error" or sql_health["status"] == "error":
            overall_status = "critical"

        health_report = {
            "overall_status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "check_duration": (time.time() - health_start) * 1000,
            "mongodb": mongo_health,
            "sql_server": sql_health,
            "data_consistency": await self._check_data_consistency(),
            "performance_metrics": await self._get_performance_metrics(),
        }

        # Update health stats
        self._health_stats.update(
            {
                "last_health_check": datetime.utcnow(),
                "mongo_health": mongo_health["status"],
                "sql_health": sql_health["status"],
                "mongo_response_time": mongo_health["response_time_ms"],
                "sql_response_time": sql_health["response_time_ms"],
            }
        )

        return health_report

    async def _check_mongodb_health(self) -> dict[str, Any]:
        """MongoDB specific health check"""
        try:
            start = time.time()

            # Ping test
            await self.mongo_client.admin.command("ping")

            # Get server info
            server_info = await self.mongo_client.server_info()

            # Get database stats
            db_stats = await self.mongo_db.command("dbStats")

            # Count documents in key collections
            collections_info = {}
            key_collections = ["erp_items", "sessions", "count_lines", "users"]

            for collection in key_collections:
                try:
                    count = await self.mongo_db[collection].count_documents({})
                    collections_info[collection] = count
                except Exception as e:
                    logger.error(f"Error counting documents in {collection}: {e}")
                    collections_info[collection] = -1  # Error getting count

            response_time = (time.time() - start) * 1000

            return {
                "status": "healthy",
                "response_time_ms": response_time,
                "server_version": server_info["version"],
                "database_size_mb": db_stats["dataSize"] / (1024 * 1024),
                "collections": collections_info,
                "indexes": await self._get_index_info(),
            }

        except Exception as e:
            logger.error(f"MongoDB health check failed: {str(e)}")
            return {"status": "error", "error": str(e), "response_time_ms": 0}

    async def _check_sql_server_health(self) -> dict[str, Any]:
        """SQL Server specific health check"""
        try:
            start = time.time()

            # Test connection
            connected = self.sql_connector.test_connection()

            if not connected:
                return {
                    "status": "error",
                    "error": "Connection test failed",
                    "response_time_ms": 0,
                }

            # Test query performance
            cursor = self.sql_connector.connection.cursor()
            cursor.execute("SELECT COUNT(*) FROM dbo.Products WHERE IsActive = 1")
            active_products = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM dbo.ProductBatches WHERE AutoBarcode IS NOT NULL")
            items_with_barcodes = cursor.fetchone()[0]

            cursor.close()

            response_time = (time.time() - start) * 1000

            return {
                "status": "healthy",
                "response_time_ms": response_time,
                "active_products": active_products,
                "items_with_barcodes": items_with_barcodes,
                "connection_info": self.sql_connector.config,
            }

        except Exception as e:
            logger.error(f"SQL Server health check failed: {str(e)}")
            return {"status": "error", "error": str(e), "response_time_ms": 0}

    async def _check_data_consistency(self) -> dict[str, Any]:
        """Check data consistency between SQL Server and MongoDB"""
        try:
            # Get counts from both databases
            mongo_count = await self.mongo_db.erp_items.count_documents({})

            if not self.sql_connector.test_connection():
                return {"status": "error", "error": "SQL Server not connected"}

            cursor = self.sql_connector.connection.cursor()
            cursor.execute(
                """
                SELECT COUNT(*) FROM dbo.Products P
                INNER JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
                WHERE P.IsActive = 1 AND PB.AutoBarcode IS NOT NULL
            """
            )
            sql_count = cursor.fetchone()[0]
            cursor.close()

            # Calculate consistency
            difference = abs(mongo_count - sql_count)
            consistency_percent = (
                min(mongo_count, sql_count) / max(mongo_count, sql_count, 1)
            ) * 100

            status = (
                "healthy" if difference < 100 else "degraded" if difference < 500 else "critical"
            )

            return {
                "status": status,
                "mongodb_items": mongo_count,
                "sql_server_items": sql_count,
                "difference": difference,
                "consistency_percent": consistency_percent,
                "last_checked": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Data consistency check failed: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def _get_performance_metrics(self) -> dict[str, Any]:
        """Get database performance metrics"""
        try:
            # MongoDB performance
            mongo_start = time.time()
            sample_item = await self.mongo_db.erp_items.find_one({"barcode": "528120"})
            mongo_query_time = (time.time() - mongo_start) * 1000

            # Index usage stats
            index_stats = await self.mongo_db.erp_items.aggregate([{"$indexStats": {}}]).to_list(
                None
            )

            return {
                "mongodb": {
                    "sample_query_time_ms": mongo_query_time,
                    "index_count": len(index_stats),
                    "sample_item_found": sample_item is not None,
                },
                "sql_server": {
                    "connection_pool_size": getattr(self.sql_connector, "_pool_size", 1),
                    "active_connections": 1,  # Basic connection
                },
            }

        except Exception as e:
            logger.error(f"Performance metrics failed: {str(e)}")
            return {"error": str(e)}

    async def _get_index_info(self) -> dict[str, list[str]]:
        """Get index information for all collections"""
        index_info = {}

        try:
            collections = await self.mongo_db.list_collection_names()

            for collection in collections:
                try:
                    indexes = await self.mongo_db[collection].list_indexes().to_list(None)
                    index_info[collection] = [idx["name"] for idx in indexes]
                except Exception as e:
                    logger.error(f"Error listing indexes for {collection}: {e}")
                    index_info[collection] = ["error"]

            return index_info
        except Exception as e:
            logger.error(f"Index info collection failed: {str(e)}")
            # Return dict with explicit type
            error_dict: dict[str, Any] = {"error": str(e)}
            return error_dict

    async def optimize_database_performance(self) -> dict[str, Any]:
        """Optimize database performance"""
        optimizations = {
            "indexes_created": 0,
            "indexes_rebuilt": 0,
            "maintenance_tasks": [],
        }

        try:
            # Create missing indexes
            missing_indexes = await self._detect_missing_indexes()

            for collection, indexes in missing_indexes.items():
                for index_spec in indexes:
                    try:
                        await self.mongo_db[collection].create_index(
                            index_spec["keys"], name=index_spec["name"], background=True
                        )
                        optimizations["indexes_created"] += 1
                        optimizations["maintenance_tasks"].append(
                            f"Created index {index_spec['name']} on {collection}"
                        )
                    except Exception as e:
                        logger.warning(f"Index creation failed: {str(e)}")

            # Compact collections if needed
            large_collections = await self._identify_large_collections()

            for collection in large_collections:
                try:
                    await self.mongo_db.command("compact", collection)
                    optimizations["maintenance_tasks"].append(f"Compacted collection {collection}")
                except Exception as e:
                    logger.warning(f"Collection compaction failed for {collection}: {str(e)}")

            return optimizations

        except Exception as e:
            logger.error(f"Database optimization failed: {str(e)}")
            return {"error": str(e)}

    async def _detect_missing_indexes(self) -> dict[str, list[dict]]:
        """Detect missing performance indexes"""
        missing = {}

        # Critical indexes that should exist
        recommended_indexes = {
            "erp_items": [
                {"keys": [("barcode", 1)], "name": "idx_barcode_performance"},
                {"keys": [("item_code", 1)], "name": "idx_item_code_performance"},
                {
                    "keys": [("warehouse", 1), ("category", 1)],
                    "name": "idx_warehouse_category",
                },
                {"keys": [("stock_qty", 1)], "name": "idx_stock_level"},
                {"keys": [("synced_at", -1)], "name": "idx_sync_timestamp"},
            ],
            "count_lines": [
                {
                    "keys": [("session_id", 1), ("item_code", 1)],
                    "name": "idx_session_item",
                },
                {"keys": [("counted_at", -1)], "name": "idx_count_timestamp"},
            ],
            "activity_logs": [
                {"keys": [("timestamp", -1)], "name": "idx_activity_timestamp"},
                {"keys": [("user_id", 1), ("action", 1)], "name": "idx_user_action"},
            ],
        }

        # Check which indexes are missing
        for collection, indexes in recommended_indexes.items():
            try:
                existing_indexes = await self.mongo_db[collection].list_indexes().to_list(None)
                existing_names = {idx["name"] for idx in existing_indexes}

                missing_for_collection = []
                for index_spec in indexes:
                    if index_spec["name"] not in existing_names:
                        missing_for_collection.append(index_spec)

                if missing_for_collection:
                    missing[collection] = missing_for_collection

            except Exception as e:
                logger.warning(f"Could not check indexes for {collection}: {str(e)}")

        return missing

    async def _identify_large_collections(self) -> list[str]:
        """Identify collections that might benefit from compaction"""
        large_collections = []

        try:
            collections = await self.mongo_db.list_collection_names()

            for collection in collections:
                try:
                    stats = await self.mongo_db.command("collStats", collection)
                    size_mb = stats.get("size", 0) / (1024 * 1024)

                    # Consider compaction for collections > 10MB
                    if size_mb > 10:
                        large_collections.append(collection)

                except Exception:
                    continue  # Skip collections that can't be analyzed

        except Exception as e:
            logger.warning(f"Collection analysis failed: {str(e)}")

        return large_collections

    async def get_database_insights(self) -> dict[str, Any]:
        """Get insights about database usage and optimization opportunities"""
        insights = {
            "timestamp": datetime.utcnow().isoformat(),
            "recommendations": [],
            "statistics": {},
            "health_summary": await self.check_database_health(),
        }

        try:
            await self._analyze_mongo_collections(insights)
            self._analyze_sql_server(insights)
        except Exception as e:
            logger.error(f"Database insights failed: {str(e)}")
            insights["error"] = str(e)

        return insights

    async def _analyze_mongo_collections(self, insights: dict[str, Any]) -> None:
        """Analyze MongoDB collections and add recommendations."""
        stats = insights["statistics"]
        collections = await self.mongo_db.list_collection_names()

        for collection in collections:
            try:
                count = await self.mongo_db[collection].count_documents({})
                sample = await self.mongo_db[collection].find().limit(1).to_list(1)

                stats[f"{collection}_count"] = count
                stats[f"{collection}_has_data"] = len(sample) > 0

                if count > 50000:
                    insights["recommendations"].append(
                        _build_collection_recommendation(
                            collection,
                            count,
                            "medium",
                            "Collection {collection} has {count:,} documents. Consider archiving old data.",
                        )
                    )

                if count == 0 and collection in ["erp_items", "sessions"]:
                    insights["recommendations"].append(
                        _build_collection_recommendation(
                            collection,
                            count,
                            "high",
                            "Collection {collection} is empty. Check sync services.",
                        )
                    )
            except Exception:
                continue

    def _analyze_sql_server(self, insights: dict[str, Any]) -> None:
        """Analyze SQL Server and add recommendations."""
        if not self.sql_connector.test_connection():
            return

        try:
            cursor = self.sql_connector.connection.cursor()
            cursor.execute(
                """
                SELECT COUNT(*) FROM dbo.Products P
                LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
                WHERE P.IsActive = 1 AND (PB.AutoBarcode IS NULL OR PB.AutoBarcode = '')
            """
            )
            items_without_barcodes = cursor.fetchone()[0]
            cursor.close()

            if items_without_barcodes > 0:
                insights["recommendations"].append(
                    {
                        "type": "data_quality",
                        "priority": "medium",
                        "message": f"{items_without_barcodes:,} products have no AutoBarcode. Consider data cleanup in ERP.",
                    }
                )
        except Exception as e:
            logger.warning(f"SQL Server analysis failed: {str(e)}")

    async def verify_data_flow(self) -> dict[str, Any]:
        """Verify complete data flow from SQL Server to Frontend"""
        flow_test = {
            "timestamp": datetime.utcnow().isoformat(),
            "steps": {},
            "overall_status": "unknown",
        }

        try:
            # Step 1: SQL Server data fetch
            if self.sql_connector.test_connection():
                test_item = self.sql_connector.get_item_by_barcode("528120")
                flow_test["steps"]["sql_server_fetch"] = {
                    "status": "success" if test_item else "no_data",
                    "item_found": test_item is not None,
                    "item_code": test_item.get("item_code") if test_item else None,
                }
            else:
                flow_test["steps"]["sql_server_fetch"] = {
                    "status": "error",
                    "error": "Connection failed",
                }

            # Step 2: MongoDB cache check
            mongo_item = await self.mongo_db.erp_items.find_one({"barcode": "528120"})
            flow_test["steps"]["mongodb_cache"] = {
                "status": "success" if mongo_item else "no_data",
                "item_found": mongo_item is not None,
                "item_code": mongo_item.get("item_code") if mongo_item else None,
            }

            # Step 3: Data consistency check
            if test_item and mongo_item:
                consistent = test_item.get("item_code") == mongo_item.get(
                    "item_code"
                ) and test_item.get("item_name") == mongo_item.get("item_name")
                flow_test["steps"]["data_consistency"] = {
                    "status": "success" if consistent else "mismatch",
                    "sql_item_code": test_item.get("item_code"),
                    "mongo_item_code": mongo_item.get("item_code"),
                    "consistent": consistent,
                }

            # Determine overall status
            steps_dict: dict[str, Any] = dict(flow_test["steps"])  # type: ignore[arg-type]
            all_success = all(step.get("status") == "success" for step in steps_dict.values())

            flow_test["overall_status"] = "success" if all_success else "partial_failure"

        except Exception as e:
            logger.error(f"Data flow verification failed: {str(e)}")
            flow_test["overall_status"] = "error"
            flow_test["error"] = str(e)

        return flow_test
