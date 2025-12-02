"""
Connection Pool Service - SQL Server Connection Pooling
Handles multiple concurrent connections efficiently
"""

import logging
import threading
import time
from contextlib import contextmanager
from queue import Empty, Full, Queue
from typing import Any, Dict, Optional

import pyodbc

from ..utils.db_connection import SQLServerConnectionBuilder

logger = logging.getLogger(__name__)


class SQLServerConnectionPool:
    """
    Thread-safe connection pool for SQL Server
    Supports multiple concurrent users
    """

    def __init__(
        self,
        host: str,
        port: int,
        database: str,
        user: Optional[str] = None,
        password: Optional[str] = None,
        pool_size: int = 10,
        max_overflow: int = 5,
        timeout: int = 30,
        recycle: int = 3600,  # Recycle connections after 1 hour
    ):
        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.timeout = timeout
        self.recycle = recycle

        self._pool: Queue = Queue(maxsize=pool_size + max_overflow)
        self._checked_out: Dict[int, float] = {}  # Track checkout time
        self._active_connections: int = 0
        self._lock = threading.RLock()

        # Pre-create initial connections
        self._initialize_pool()

    def _build_connection_string(self) -> str:
        """Build optimized ODBC connection string using shared utility"""
        return SQLServerConnectionBuilder.build_connection_string(
            host=self.host,
            database=self.database,
            port=self.port,
            user=self.user,
            password=self.password,
            timeout=self.timeout,
        )

    def _create_connection(self) -> pyodbc.Connection:
        """Create a new optimized SQL Server connection"""
        try:
            conn_str = self._build_connection_string()
            conn = pyodbc.connect(conn_str, timeout=self.timeout)

            # Set connection attributes for performance
            conn.timeout = self.timeout

            # Optimize connection settings
            cursor = conn.cursor()
            try:
                # Enable fast execution settings
                cursor.execute("SET ARITHABORT ON")
                cursor.execute("SET ANSI_NULLS ON")
                cursor.execute("SET ANSI_PADDING ON")
                cursor.execute("SET ANSI_WARNINGS ON")
                cursor.execute("SET CONCAT_NULL_YIELDS_NULL ON")
                cursor.execute("SET QUOTED_IDENTIFIER ON")
                # Optimize for faster queries
                cursor.execute("SET NOCOUNT ON")  # Reduces network traffic
            except pyodbc.Error as e:
                logger.debug(f"Could not set connection attributes: {str(e)}")
            finally:
                cursor.close()

            logger.debug(f"Created optimized connection. Pool size: {self._active_connections}")
            return conn
        except pyodbc.Error as e:
            logger.error(f"Failed to create connection: {str(e)}")
            raise

    def _initialize_pool(self):
        """Initialize the pool with minimum connections."""
        try:
            for _ in range(self.pool_size):
                conn = self._create_connection()
                self._pool.put((conn, time.time()))
                with self._lock:
                    self._active_connections += 1
            logger.info(f"Initialized pool with {self.pool_size} connections")
        except Exception as e:
            logger.error(f"Failed to initialize pool: {str(e)}")

    def _create_and_track_connection(self) -> pyodbc.Connection:
        """Creates a new connection and updates pool statistics."""
        conn = self._create_connection()
        with self._lock:
            self._active_connections += 1
            self._checked_out[id(conn)] = time.time()
        return conn

    def _discard_connection(self, conn: pyodbc.Connection):
        """Safely closes a connection and decrements active count."""
        try:
            conn.close()
        except Exception:
            pass
        finally:
            with self._lock:
                if id(conn) in self._checked_out:
                    del self._checked_out[id(conn)]
                if self._active_connections > 0:
                    self._active_connections -= 1

    def _validate_and_refresh(
        self, conn: pyodbc.Connection, created_at: float
    ) -> pyodbc.Connection:
        """
        Validates a pooled connection.
        If invalid or expired, discards it and creates a new one.
        """
        age = time.time() - created_at

        # Check if recycle is needed
        if self.recycle and age > self.recycle:
            logger.info(f"Recycling connection (age: {age:.1f}s)")
            self._discard_connection(conn)
            return self._create_and_track_connection()

        # Check validity
        if not self._is_connection_valid(conn):
            logger.warning("Pooled connection invalid, creating new one")
            self._discard_connection(conn)
            return self._create_and_track_connection()

        # Connection is good, mark as checked out
        with self._lock:
            self._checked_out[id(conn)] = time.time()
        return conn

    def _is_connection_valid(self, conn: pyodbc.Connection) -> bool:
        """Check if connection is still valid using shared utility"""
        return SQLServerConnectionBuilder.is_connection_valid(conn)

    def _get_connection(self, timeout: Optional[float] = None) -> pyodbc.Connection:
        """Get a connection from the pool"""
        deadline = time.time() + (timeout or self.timeout)

        while time.time() < deadline:
            try:
                # Try to get from pool
                conn, created_at = self._pool.get_nowait()
                return self._validate_and_refresh(conn, created_at)

            except Empty:
                # Pool is empty, try to create new connection if under limit
                with self._lock:
                    if self._active_connections < self.pool_size + self.max_overflow:
                        return self._create_and_track_connection()

                # Use exponential backoff to reduce CPU usage under high load
                wait_time = min(0.05 * (2 ** min(5, int((deadline - time.time()) / 0.1))), 0.5)
                time.sleep(wait_time)
                continue

        raise TimeoutError("Failed to get connection from pool within timeout")

    def _return_connection(self, conn: pyodbc.Connection):
        """Return a connection to the pool"""
        conn_id = id(conn)

        with self._lock:
            if conn_id not in self._checked_out:
                logger.warning("Attempted to return connection not checked out")
                return
            del self._checked_out[conn_id]

        # Check if connection is still valid before returning
        if self._is_connection_valid(conn):
            try:
                self._pool.put_nowait((conn, time.time()))
            except Full:
                logger.warning("Pool full, discarding returned connection")
                self._discard_connection(conn)
        else:
            # Connection is dead, close it
            self._discard_connection(conn)

    @contextmanager
    def get_connection(self, timeout: Optional[float] = None):
        """
        Context manager to get and return a connection
        Usage:
            with pool.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                ...
        """
        conn = None
        try:
            conn = self._get_connection(timeout)
            yield conn
        finally:
            if conn:
                self._return_connection(conn)

    def close_all(self):
        """Close all connections in the pool"""
        while not self._pool.empty():
            try:
                conn, _ = self._pool.get_nowait()
                conn.close()
            except (Empty, pyodbc.Error):
                pass

        with self._lock:
            self._checked_out.clear()
            self._active_connections = 0

    def get_stats(self) -> Dict[str, Any]:
        """Get pool statistics"""
        with self._lock:
            return {
                "pool_size": self.pool_size,
                "max_overflow": self.max_overflow,
                "active_connections": self._active_connections,
                "available": self._pool.qsize(),
                "checked_out": len(self._checked_out),
                "utilization": (
                    (len(self._checked_out) / (self.pool_size + self.max_overflow)) * 100
                    if (self.pool_size + self.max_overflow) > 0
                    else 0
                ),
            }
