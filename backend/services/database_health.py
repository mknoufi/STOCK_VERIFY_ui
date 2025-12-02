"""
Database Health Monitoring Service
Monitors database connections and provides health checks
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import InvalidOperation

if TYPE_CHECKING:
    from backend.sql_server_connector import SQLServerConnector
else:
    # Import SQLServerConnector - will be injected at runtime
    SQLServerConnector = None

logger = logging.getLogger(__name__)


class DatabaseHealthService:
    """
    Service to monitor database health and connection status
    Provides health checks, connection monitoring, and automatic recovery
    """

    def __init__(
        self,
        mongo_db: Optional[AsyncIOMotorDatabase],
        sql_connector: "SQLServerConnector",
        check_interval: int = 60,  # Check every 60 seconds
        mongo_uri: Optional[str] = None,
        db_name: Optional[str] = None,
        mongo_client_options: Optional[Dict[str, Any]] = None,
    ):
        self.mongo_db = mongo_db
        self.sql_connector = sql_connector
        self.check_interval = check_interval
        self._health_status = {
            "mongo": {
                "status": "unknown",
                "last_check": None,
                "response_time": None,
                "error": None,
            },
            "sql_server": {
                "status": "unknown",
                "last_check": None,
                "response_time": None,
                "error": None,
            },
            "overall": "unknown",
            "uptime_start": datetime.utcnow(),
        }
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._mongo_uri = mongo_uri
        self._db_name = db_name or getattr(mongo_db, "name", None)
        self._mongo_client_options = mongo_client_options or {}
        self._dedicated_client: Optional[AsyncIOMotorClient] = None

        if self.mongo_db is None and not self._switch_to_dedicated_client():
            raise RuntimeError("Failed to initialize MongoDB connection for health monitoring")

    def _switch_to_dedicated_client(self) -> bool:
        """Initialize a dedicated Mongo client if the shared one is unavailable."""
        if not self._mongo_uri or not self._db_name:
            return False

        try:
            if self._dedicated_client:
                self._dedicated_client.close()
            self._dedicated_client = AsyncIOMotorClient(
                self._mongo_uri,
                **self._mongo_client_options,
            )
            self.mongo_db = self._dedicated_client[self._db_name]
            logger.info("Database health service switched to dedicated MongoDB client")
            return True
        except Exception as e:
            logger.error(f"Failed to create dedicated MongoDB client: {e}")
            return False

    async def check_mongo_health(self, retry: bool = False) -> Dict[str, Any]:
        """Check MongoDB connection health"""
        start_time = datetime.utcnow()
        try:
            # Simple ping operation
            await self.mongo_db.command("ping")
            response_time = (datetime.utcnow() - start_time).total_seconds()

            self._health_status["mongo"] = {
                "status": "healthy",
                "last_check": datetime.utcnow().isoformat(),
                "response_time": response_time,
                "error": None,
            }

            logger.debug(f"MongoDB health check: OK ({response_time:.3f}s)")
            return {"status": "healthy", "response_time": response_time}

        except InvalidOperation as e:
            logger.warning(f"MongoDB health check detected closed client: {e}")
            if not retry and self._switch_to_dedicated_client():
                return await self.check_mongo_health(retry=True)

            error_msg = str(e)
            self._health_status["mongo"] = {
                "status": "unhealthy",
                "last_check": datetime.utcnow().isoformat(),
                "response_time": None,
                "error": error_msg,
            }
            return {"status": "unhealthy", "error": error_msg}

        except Exception as e:
            error_msg = str(e)
            self._health_status["mongo"] = {
                "status": "unhealthy",
                "last_check": datetime.utcnow().isoformat(),
                "response_time": None,
                "error": error_msg,
            }

            logger.error(f"MongoDB health check failed: {error_msg}")
            return {"status": "unhealthy", "error": error_msg}

    async def check_sql_server_health(self) -> Dict[str, Any]:
        """Check SQL Server connection health"""
        start_time = datetime.utcnow()
        try:
            if self.sql_connector is None or getattr(self.sql_connector, "config", None) is None:
                logger.debug("SQL Server not configured; skipping health check")
                self._health_status["sql_server"] = {
                    "status": "skipped",
                    "last_check": datetime.utcnow().isoformat(),
                    "response_time": None,
                    "error": "SQL Server not configured",
                }
                return {
                    "status": "skipped",
                    "error": "SQL Server not configured",
                }

            # Test connection
            if not self.sql_connector.test_connection():
                error_msg = "SQL Server connection not available"
                self._health_status["sql_server"] = {
                    "status": "unhealthy",
                    "last_check": datetime.utcnow().isoformat(),
                    "response_time": None,
                    "error": error_msg,
                }
                logger.warning(f"SQL Server health check: {error_msg}")
                return {"status": "unhealthy", "error": error_msg}

            response_time = (datetime.utcnow() - start_time).total_seconds()

            self._health_status["sql_server"] = {
                "status": "healthy",
                "last_check": datetime.utcnow().isoformat(),
                "response_time": response_time,
                "error": None,
            }

            logger.debug(f"SQL Server health check: OK ({response_time:.3f}s)")
            return {"status": "healthy", "response_time": response_time}

        except Exception as e:
            error_msg = str(e)
            self._health_status["sql_server"] = {
                "status": "unhealthy",
                "last_check": datetime.utcnow().isoformat(),
                "response_time": None,
                "error": error_msg,
            }

            logger.error(f"SQL Server health check failed: {error_msg}")
            return {"status": "unhealthy", "error": error_msg}

    async def check_all(self) -> Dict[str, Any]:
        """Check health of all databases"""
        mongo_result = await self.check_mongo_health()
        sql_result = await self.check_sql_server_health()

        # Determine overall status
        if mongo_result["status"] == "healthy" and sql_result["status"] == "healthy":
            overall_status = "healthy"
        elif mongo_result["status"] == "unhealthy" and sql_result["status"] == "unhealthy":
            overall_status = "unhealthy"
        else:
            overall_status = "degraded"

        self._health_status["overall"] = overall_status

        return {
            "overall": overall_status,
            "mongo": mongo_result,
            "sql_server": sql_result,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def _health_check_loop(self):
        """Background health check loop"""
        while self._running:
            try:
                await self.check_all()
            except Exception as e:
                logger.error(f"Health check loop error: {str(e)}")

            await asyncio.sleep(self.check_interval)

    def start(self):
        """Start background health monitoring"""
        if self._running:
            logger.warning("Database health service already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._health_check_loop())
        logger.info(f"Database health monitoring started (interval: {self.check_interval}s)")

    async def stop(self):
        """Stop background health monitoring"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self._dedicated_client:
            try:
                self._dedicated_client.close()
            except Exception:
                pass
        logger.info("Database health monitoring stopped")

    def get_status(self) -> Dict[str, Any]:
        """Get current health status"""
        uptime = (datetime.utcnow() - self._health_status["uptime_start"]).total_seconds()

        return {
            **self._health_status,
            "uptime_seconds": uptime,
            "uptime_human": str(timedelta(seconds=int(uptime))),
            "check_interval": self.check_interval,
            "running": self._running,
        }

    async def get_detailed_health(self) -> Dict[str, Any]:
        """Get detailed health check with current status"""
        # Perform fresh health checks
        health_check = await self.check_all()

        # Get status
        status = self.get_status()

        # Get database statistics
        mongo_stats = {}
        sql_stats = {}

        try:
            # MongoDB stats
            db_stats = await self.mongo_db.command("dbStats")
            mongo_stats = {
                "collections": db_stats.get("collections", 0),
                "data_size": db_stats.get("dataSize", 0),
                "storage_size": db_stats.get("storageSize", 0),
            }
        except InvalidOperation as e:
            if self._switch_to_dedicated_client():
                try:
                    db_stats = await self.mongo_db.command("dbStats")
                    mongo_stats = {
                        "collections": db_stats.get("collections", 0),
                        "data_size": db_stats.get("dataSize", 0),
                        "storage_size": db_stats.get("storageSize", 0),
                    }
                except Exception as inner:
                    mongo_stats = {"error": str(inner)}
            else:
                mongo_stats = {"error": str(e)}
        except Exception as e:
            mongo_stats = {"error": str(e)}

        try:
            # SQL Server stats (if connected)
            if self.sql_connector.test_connection():
                sql_stats = {
                    "connected": True,
                    "config": self.sql_connector.config,
                }
            else:
                sql_stats = {"connected": False}
        except Exception as e:
            sql_stats = {"error": str(e)}

        return {
            **health_check,
            "status": status,
            "database_stats": {
                "mongo": mongo_stats,
                "sql_server": sql_stats,
            },
        }
