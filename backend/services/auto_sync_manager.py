"""
Auto Sync Manager - Automatically syncs data from SQL Server when available
Monitors SQL Server connection and triggers sync service when connection is restored
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.services.erp_sync_service import SQLSyncService
from backend.sql_server_connector import SQLServerConnector

logger = logging.getLogger(__name__)


class AutoSyncManager:
    """
    Manages automatic synchronization from SQL Server to MongoDB
    - Monitors SQL Server connection status
    - Automatically triggers sync when connection available
    - Tracks sync state and history
    - Provides status information
    """

    def __init__(
        self,
        sql_connector: SQLServerConnector,
        mongo_db: AsyncIOMotorDatabase,
        sync_interval: int = 3600,  # 1 hour default
        check_interval: int = 30,  # Check connection every 30 seconds
        enabled: bool = True,
    ):
        self.sql_connector = sql_connector
        self.mongo_db = mongo_db
        self.sync_interval = sync_interval
        self.check_interval = check_interval
        self.enabled = enabled

        # State tracking
        self._running = False
        self._monitoring_task: Optional[asyncio.Task] = None
        self._sync_service: Optional[SQLSyncService] = None
        self._last_connection_check: Optional[datetime] = None
        self._last_sync_attempt: Optional[datetime] = None
        self._sql_available = False
        self._sync_in_progress = False

        # Statistics
        self._stats = {
            "connection_checks": 0,
            "connection_restored": 0,
            "connection_lost": 0,
            "syncs_triggered": 0,
            "syncs_completed": 0,
            "syncs_failed": 0,
            "last_connection_time": None,
            "last_sync_time": None,
            "last_sync_status": None,
        }

        # Callbacks
        self._on_connection_restored: Optional[Callable] = None
        self._on_connection_lost: Optional[Callable] = None
        self._on_sync_complete: Optional[Callable] = None

    def set_callbacks(
        self,
        on_connection_restored: Optional[Callable] = None,
        on_connection_lost: Optional[Callable] = None,
        on_sync_complete: Optional[Callable] = None,
    ):
        """Set callback functions for events"""
        self._on_connection_restored = on_connection_restored
        self._on_connection_lost = on_connection_lost
        self._on_sync_complete = on_sync_complete

    async def start(self):
        """Start monitoring SQL Server connection"""
        if not self.enabled:
            logger.info("Auto-sync manager is disabled")
            return

        if self._running:
            logger.warning("Auto-sync manager is already running")
            return

        logger.info("🚀 Starting auto-sync manager...")
        self._running = True

        # Check initial connection
        await self._check_connection()

        # Start monitoring task
        self._monitoring_task = asyncio.create_task(self._monitor_loop())
        logger.info("✅ Auto-sync manager started")

    async def stop(self):
        """Stop monitoring"""
        logger.info("Stopping auto-sync manager...")
        self._running = False

        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass

        if self._sync_service:
            await self._sync_service.stop()

        logger.info("✅ Auto-sync manager stopped")

    async def _monitor_loop(self):
        """Main monitoring loop"""
        while self._running:
            try:
                await self._check_connection()
                await asyncio.sleep(self.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(self.check_interval)

    async def _check_connection(self):
        """Check SQL Server connection status"""
        self._last_connection_check = datetime.utcnow()
        self._stats["connection_checks"] += 1

        try:
            # Test connection
            is_available = self.sql_connector.test_connection()

            # Connection state changed
            if is_available and not self._sql_available:
                # Connection restored
                logger.info("✅ SQL Server connection restored - triggering sync")
                self._sql_available = True
                self._stats["connection_restored"] += 1
                self._stats["last_connection_time"] = datetime.utcnow().isoformat()

                # Trigger sync
                await self._trigger_sync()

                # Callback
                if self._on_connection_restored:
                    try:
                        await self._on_connection_restored()
                    except Exception as e:
                        logger.error(f"Error in connection restored callback: {e}")

            elif not is_available and self._sql_available:
                # Connection lost
                logger.warning("⚠️ SQL Server connection lost")
                self._sql_available = False
                self._stats["connection_lost"] += 1

                # Stop sync service
                if self._sync_service:
                    await self._sync_service.stop()

                # Callback
                if self._on_connection_lost:
                    try:
                        await self._on_connection_lost()
                    except Exception as e:
                        logger.error(f"Error in connection lost callback: {e}")

        except Exception as e:
            logger.error(f"Error checking SQL Server connection: {e}")
            if self._sql_available:
                self._sql_available = False
                self._stats["connection_lost"] += 1

    async def _trigger_sync(self):
        """Trigger sync from SQL Server to MongoDB"""
        if self._sync_in_progress:
            logger.warning("Sync already in progress, skipping")
            return

        # Check if enough time has passed since last sync
        if self._last_sync_attempt:
            time_since_last = (datetime.utcnow() - self._last_sync_attempt).total_seconds()
            if time_since_last < self.sync_interval:
                logger.info(
                    f"Sync skipped - only {time_since_last:.0f}s since last sync (interval: {self.sync_interval}s)"
                )
                return

        self._last_sync_attempt = datetime.utcnow()
        self._stats["syncs_triggered"] += 1
        self._sync_in_progress = True

        try:
            logger.info("🔄 Starting automatic sync from SQL Server...")

            # Initialize sync service if needed
            if not self._sync_service:
                self._sync_service = SQLSyncService(
                    sql_connector=self.sql_connector,
                    mongo_db=self.mongo_db,
                    sync_interval=self.sync_interval,
                    enabled=True,
                )

            # Start sync
            await self._sync_service.start()

            # Wait for sync to complete (or timeout)
            await asyncio.sleep(1)  # Give it a moment to start

            logger.info("✅ Auto-sync triggered successfully")

        except Exception as e:
            logger.error(f"❌ Error triggering sync: {e}")
            self._stats["syncs_failed"] += 1
            self._stats["last_sync_status"] = f"failed: {str(e)}"
        finally:
            self._sync_in_progress = False

    async def trigger_manual_sync(self) -> Dict[str, Any]:
        """Manually trigger a sync (admin action)"""
        if not self._sql_available:
            return {"success": False, "error": "SQL Server connection not available"}

        if self._sync_in_progress:
            return {"success": False, "error": "Sync already in progress"}

        try:
            await self._trigger_sync()
            return {"success": True, "message": "Sync triggered successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        """Get current status"""
        return {
            "enabled": self.enabled,
            "running": self._running,
            "sql_available": self._sql_available,
            "sync_in_progress": self._sync_in_progress,
            "last_connection_check": (
                self._last_connection_check.isoformat() if self._last_connection_check else None
            ),
            "last_sync_attempt": (
                self._last_sync_attempt.isoformat() if self._last_sync_attempt else None
            ),
            "stats": self._stats.copy(),
            "sync_service_status": self._sync_service.get_status() if self._sync_service else None,
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics"""
        return self._stats.copy()
