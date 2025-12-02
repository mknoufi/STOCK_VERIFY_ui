"""
Connection Pool Service - SQL Server Connection Pooling
Handles multiple concurrent connections efficiently
"""

import pyodbc
import threading
from queue import Queue, Empty
from typing import Optional, Dict, Any
import logging
from contextlib import contextmanager
import time
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
        self._checked_out: set = set()
        self._created: int = 0
        self._lock = threading.Lock()

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
            timeout=self.timeout
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
            except Exception as e:
                logger.debug(f"Could not set connection attributes: {str(e)}")
            finally:
                cursor.close()

            logger.debug(f"Created optimized connection. Pool size: {self._created}")
            return conn
        except Exception as e:
            logger.error(f"Failed to create connection: {str(e)}")
            raise

    def _initialize_pool(self):
        """Pre-create initial connections"""
        initial_size = min(self.pool_size, 3)  # Start with 3 connections
        for _ in range(initial_size):
            try:
                conn = self._create_connection()
                self._pool.put((conn, time.time()))
                with self._lock:
                    self._created += 1
            except Exception as e:
                logger.warning(f"Failed to pre-create connection: {str(e)}")

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

                # Check if connection is still valid and not too old
                age = time.time() - created_at
                if age > self.recycle:
                    try:
                        conn.close()
                    except Exception:
                        pass
                    # Create new connection
                    conn = self._create_connection()
                    with self._lock:
                        self._created += 1

                elif not self._is_connection_valid(conn):
                    # Connection is dead, create new one
                    try:
                        conn.close()
                    except Exception:
                        pass
                    conn = self._create_connection()
                    with self._lock:
                        self._created += 1

                # Mark as checked out
                with self._lock:
                    self._checked_out.add(id(conn))

                return conn

            except Empty:
                # Pool is empty, try to create new connection if under limit
                with self._lock:
                    if self._created < self.pool_size + self.max_overflow:
                        conn = self._create_connection()
                        self._created += 1
                        self._checked_out.add(id(conn))
                        return conn

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
            self._checked_out.remove(conn_id)

        # Check if connection is still valid before returning
        if self._is_connection_valid(conn):
            try:
                self._pool.put_nowait((conn, time.time()))
            except Exception as e:
                logger.error(f"Failed to return connection to pool: {str(e)}")
                try:
                    conn.close()
                except Exception:
                    pass
                with self._lock:
                    self._created -= 1
        else:
            # Connection is dead, close it
            try:
                conn.close()
            except Exception:
                pass
            with self._lock:
                self._created -= 1

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
            except Exception:
                pass

        with self._lock:
            self._checked_out.clear()
            self._created = 0

    def get_stats(self) -> Dict[str, Any]:
        """Get pool statistics"""
        with self._lock:
            return {
                "pool_size": self.pool_size,
                "max_overflow": self.max_overflow,
                "created": self._created,
                "available": self._pool.qsize(),
                "checked_out": len(self._checked_out),
                "utilization": (
                    (len(self._checked_out) / (self.pool_size + self.max_overflow)) * 100
                    if (self.pool_size + self.max_overflow) > 0
                    else 0
                ),
            }
