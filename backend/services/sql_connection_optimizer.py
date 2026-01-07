"""
SQL Server Connection Optimizer
Optimizes SQL Server connections for better performance
"""

import logging
import time
from contextlib import contextmanager
from functools import wraps
from typing import Any

import pyodbc

from ..utils.db_connection import ConnectionStringOptimizer

logger = logging.getLogger(__name__)


class SQLConnectionOptimizer:
    """
    Optimizes SQL Server connections and queries
    """

    def __init__(
        self,
        connection_string: str,
        pool_size: int = 20,
        max_overflow: int = 10,
        pool_timeout: int = 30,
        pool_recycle: int = 3600,
        connect_timeout: int = 10,
        command_timeout: int = 30,
    ):
        self.connection_string = connection_string
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_timeout = pool_timeout
        self.pool_recycle = pool_recycle
        self.connect_timeout = connect_timeout
        self.command_timeout = command_timeout

        # Connection pool (simple implementation)
        self._pool: list[pyodbc.Connection] = []
        self._pool_lock = None  # Would use threading.Lock in production
        self._pool_stats = {
            "created": 0,
            "reused": 0,
            "closed": 0,
            "errors": 0,
        }

        # Query performance tracking
        self._query_stats: dict[str, dict[str, Any]] = {}
        self._slow_query_threshold = 2.0  # seconds

    def optimize_connection_string(self) -> str:
        """
        Add performance optimizations to connection string using shared utility
        """
        self.connection_string = (
            ConnectionStringOptimizer.optimize_existing_connection_string(
                self.connection_string,
                connect_timeout=self.connect_timeout,
                command_timeout=self.command_timeout,
            )
        )

        logger.info("SQL connection string optimized using shared utility")
        return self.connection_string

    @contextmanager
    def get_connection(self):
        """
        Get optimized database connection with proper cleanup
        """
        conn = None
        start_time = time.time()

        try:
            # Optimize connection string
            conn_str = self.optimize_connection_string()

            # Create connection
            conn = pyodbc.connect(
                conn_str,
                timeout=self.connect_timeout,
                autocommit=False,  # Use transactions for better control
            )

            # Set connection-level optimizations
            conn.setdecoding(pyodbc.SQL_CHAR, encoding="utf-8")
            conn.setdecoding(pyodbc.SQL_WCHAR, encoding="utf-8")
            conn.setencoding(encoding="utf-8")

            # Set connection attributes for performance
            cursor = conn.cursor()

            # Enable fast execution
            try:
                cursor.execute("SET ARITHABORT ON")
                cursor.execute("SET ANSI_NULLS ON")
                cursor.execute("SET ANSI_PADDING ON")
                cursor.execute("SET ANSI_WARNINGS ON")
                cursor.execute("SET CONCAT_NULL_YIELDS_NULL ON")
            except Exception as e:
                logger.debug(f"Could not set connection attributes: {str(e)}")

            cursor.close()

            connect_time = time.time() - start_time
            if connect_time > 1.0:
                logger.warning(f"Slow connection: {connect_time:.3f}s")

            self._pool_stats["created"] += 1

            yield conn

            # Commit if no exception
            conn.commit()

        except Exception as e:
            if conn:
                conn.rollback()
            self._pool_stats["errors"] += 1
            logger.error(f"Connection error: {str(e)}")
            raise

        finally:
            if conn:
                try:
                    conn.close()
                    self._pool_stats["closed"] += 1
                except Exception:
                    pass

    def track_query(self, query_name: str):
        """
        Decorator to track query performance
        """

        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()

                try:
                    result = func(*args, **kwargs)
                    execution_time = time.time() - start_time

                    # Track query stats
                    if query_name not in self._query_stats:
                        self._query_stats[query_name] = {
                            "count": 0,
                            "total_time": 0,
                            "avg_time": 0,
                            "max_time": 0,
                            "min_time": float("inf"),
                        }

                    stats = self._query_stats[query_name]
                    stats["count"] += 1
                    stats["total_time"] += execution_time
                    stats["avg_time"] = stats["total_time"] / stats["count"]
                    stats["max_time"] = max(stats["max_time"], execution_time)
                    stats["min_time"] = min(stats["min_time"], execution_time)

                    # Log slow queries
                    if execution_time > self._slow_query_threshold:
                        logger.warning(
                            f"Slow SQL query: {query_name} took {execution_time:.3f}s "
                            f"(threshold: {self._slow_query_threshold}s)"
                        )

                    return result

                except Exception as e:
                    execution_time = time.time() - start_time
                    logger.error(
                        f"Query failed: {query_name} after {execution_time:.3f}s - {str(e)}"
                    )
                    raise

            return wrapper

        return decorator

    def optimize_query(self, query: str) -> str:
        """
        Optimize SQL query for better performance
        """
        optimized = query.strip()

        # Remove unnecessary whitespace
        optimized = " ".join(optimized.split())

        # Add query hints if needed (be careful with this)
        # For now, just return cleaned query

        return optimized

    def get_connection_stats(self) -> dict[str, Any]:
        """Get connection pool statistics"""
        return {
            "pool_stats": self._pool_stats.copy(),
            "query_stats": self._query_stats.copy(),
            "pool_size": self.pool_size,
            "max_overflow": self.max_overflow,
        }

    def reset_stats(self):
        """Reset statistics"""
        self._pool_stats = {
            "created": 0,
            "reused": 0,
            "closed": 0,
            "errors": 0,
        }
        self._query_stats = {}

    async def check_connection_health(self) -> dict[str, Any]:
        """
        Check SQL Server connection health
        """
        start_time = time.time()

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                cursor.close()

            ping_time = time.time() - start_time

            return {
                "status": "healthy",
                "ping_time_ms": ping_time * 1000,
                "pool_stats": self._pool_stats.copy(),
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "ping_time_ms": (time.time() - start_time) * 1000,
            }
