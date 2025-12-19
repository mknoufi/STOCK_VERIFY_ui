"""
Enhanced Connection Pool Service
Upgraded SQL Server connection pooling with retry logic, health monitoring, and metrics
"""

import pyodbc
import threading
from queue import Queue, Empty
from typing import Optional, Dict, Any, List
import logging
from contextlib import contextmanager
import time
from datetime import datetime
from dataclasses import dataclass, field
from ..utils.db_connection import SQLServerConnectionBuilder

logger = logging.getLogger(__name__)


@dataclass
class ConnectionMetrics:
    """Connection pool metrics"""

    total_created: int = 0
    total_closed: int = 0
    total_errors: int = 0
    total_timeouts: int = 0
    total_retries: int = 0
    average_connection_time: float = 0.0
    connection_times: List[float] = field(default_factory=list)
    last_error: Optional[str] = None
    last_error_time: Optional[datetime] = None
    health_status: str = "healthy"  # healthy, degraded, unhealthy
    last_health_check: Optional[datetime] = None


class EnhancedSQLServerConnectionPool:
    """
    Enhanced thread-safe connection pool for SQL Server
    Features:
    - Automatic retry logic with exponential backoff
    - Connection health monitoring
    - Detailed metrics and statistics
    - Connection recycling and validation
    - Graceful degradation
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
        recycle: int = 3600,
        retry_attempts: int = 3,
        retry_delay: float = 1.0,
        health_check_interval: int = 60,
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
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay
        self.health_check_interval = health_check_interval

        self._pool: Queue = Queue(maxsize=pool_size + max_overflow)
        self._checked_out: set = set()
        self._created: int = 0
        self._lock = threading.Lock()
        self._metrics = ConnectionMetrics()
        self._last_health_check: Optional[datetime] = None
        self._shutdown = False

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

    def _create_connection_with_retry(self) -> pyodbc.Connection:
        """Create a new connection with retry logic"""
        last_error = None

        for attempt in range(1, self.retry_attempts + 1):
            try:
                start_time = time.time()
                conn_str = self._build_connection_string()
                conn = pyodbc.connect(conn_str, timeout=self.timeout)

                connection_time = time.time() - start_time
                self._metrics.connection_times.append(connection_time)

                # Keep only last 100 connection times for average calculation
                if len(self._metrics.connection_times) > 100:
                    self._metrics.connection_times = self._metrics.connection_times[-100:]

                # Update average
                self._metrics.average_connection_time = sum(self._metrics.connection_times) / len(
                    self._metrics.connection_times
                )

                # Set connection attributes for performance
                conn.timeout = self.timeout

                # Optimize connection settings
                cursor = conn.cursor()
                try:
                    cursor.execute("SET ARITHABORT ON")
                    cursor.execute("SET ANSI_NULLS ON")
                    cursor.execute("SET ANSI_PADDING ON")
                    cursor.execute("SET ANSI_WARNINGS ON")
                    cursor.execute("SET CONCAT_NULL_YIELDS_NULL ON")
                    cursor.execute("SET QUOTED_IDENTIFIER ON")
                    cursor.execute("SET NOCOUNT ON")
                except Exception as e:
                    logger.debug(f"Could not set connection attributes: {str(e)}")
                finally:
                    cursor.close()

                with self._lock:
                    self._metrics.total_created += 1
                    self._metrics.health_status = "healthy"
                    self._metrics.last_error = None

                logger.debug(
                    f"Created optimized connection (attempt {attempt}). Pool size: {self._created}"
                )
                return conn

            except Exception as e:
                last_error = str(e)
                with self._lock:
                    self._metrics.total_errors += 1
                    self._metrics.total_retries += 1
                    self._metrics.last_error = last_error
                    self._metrics.last_error_time = datetime.now()

                if attempt < self.retry_attempts:
                    wait_time = self.retry_delay * (2 ** (attempt - 1))  # Exponential backoff
                    logger.warning(
                        f"Connection attempt {attempt} failed: {last_error}. Retrying in {wait_time:.2f}s..."
                    )
                    time.sleep(wait_time)
                else:
                    logger.error(
                        f"Failed to create connection after {self.retry_attempts} attempts: {last_error}"
                    )
                    self._update_health_status()
                    raise ConnectionError(
                        f"Failed to create connection after {self.retry_attempts} attempts: {last_error}"
                    ) from e

        raise ConnectionError(f"Failed to create connection: {last_error}")

    def _create_connection(self) -> pyodbc.Connection:
        """Create a new optimized SQL Server connection (wrapper for retry logic)"""
        return self._create_connection_with_retry()

    def _initialize_pool(self):
        """Pre-create initial connections"""
        initial_size = min(self.pool_size, 3)
        successful = 0

        for i in range(initial_size):
            try:
                conn = self._create_connection()
                self._pool.put((conn, time.time()))
                with self._lock:
                    self._created += 1
                    successful += 1
            except Exception as e:
                logger.warning(f"Failed to pre-create connection {i + 1}/{initial_size}: {str(e)}")

        if successful > 0:
            logger.info(f"Initialized connection pool with {successful}/{initial_size} connections")
        else:
            logger.error("Failed to initialize any connections in the pool")

    def _is_connection_valid(self, conn: pyodbc.Connection) -> bool:
        """Check if connection is still valid"""
        try:
            return SQLServerConnectionBuilder.is_connection_valid(conn)
        except Exception as e:
            logger.debug(f"Connection validation failed: {str(e)}")
            return False

    def _update_health_status(self):
        """Update health status based on recent errors"""
        if self._metrics.last_error_time:
            time_since_error = (datetime.now() - self._metrics.last_error_time).total_seconds()

            # If errors occurred recently, mark as degraded/unhealthy
            if time_since_error < 60:  # Last minute
                error_rate = self._metrics.total_errors / max(self._metrics.total_created, 1)
                if error_rate > 0.5:  # More than 50% error rate
                    self._metrics.health_status = "unhealthy"
                elif error_rate > 0.2:  # More than 20% error rate
                    self._metrics.health_status = "degraded"
                else:
                    self._metrics.health_status = "healthy"
            else:
                self._metrics.health_status = "healthy"

    def _get_connection(self, timeout: Optional[float] = None) -> pyodbc.Connection:
        """Get a connection from the pool with timeout"""
        deadline = time.time() + (timeout or self.timeout)
        attempt = 0

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
                        try:
                            conn = self._create_connection()
                            self._created += 1
                            self._checked_out.add(id(conn))
                            return conn
                        except Exception as e:
                            logger.warning(f"Failed to create new connection: {str(e)}")
                            # Continue to wait for available connection

                # Use exponential backoff to reduce CPU usage under high load
                attempt += 1
                wait_time = min(0.05 * (2 ** min(5, attempt)), 0.5)
                time.sleep(wait_time)
                continue

        # Timeout reached
        with self._lock:
            self._metrics.total_timeouts += 1
        raise TimeoutError(
            f"Failed to get connection from pool within {timeout or self.timeout}s timeout"
        )

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
                    self._metrics.total_closed += 1
        else:
            # Connection is dead, close it
            try:
                conn.close()
            except Exception:
                pass
            with self._lock:
                self._created -= 1
                self._metrics.total_closed += 1

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
        except Exception as e:
            logger.error(f"Error in connection context: {str(e)}")
            raise
        finally:
            if conn:
                self._return_connection(conn)

    def check_health(self) -> Dict[str, Any]:
        """Perform health check on the connection pool"""
        health_status = {
            "status": self._metrics.health_status,
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
            "metrics": {
                "total_created": self._metrics.total_created,
                "total_closed": self._metrics.total_closed,
                "total_errors": self._metrics.total_errors,
                "total_timeouts": self._metrics.total_timeouts,
                "total_retries": self._metrics.total_retries,
                "average_connection_time": round(self._metrics.average_connection_time, 3),
                "error_rate": (
                    (self._metrics.total_errors / max(self._metrics.total_created, 1)) * 100
                ),
                "last_error": self._metrics.last_error,
                "last_error_time": (
                    self._metrics.last_error_time.isoformat()
                    if self._metrics.last_error_time
                    else None
                ),
            },
        }

        # Test connection if health check interval has passed
        if (
            not self._last_health_check
            or (datetime.now() - self._last_health_check).total_seconds()
            > self.health_check_interval
        ):
            try:
                test_conn = self._create_connection()
                test_cursor = test_conn.cursor()
                test_cursor.execute("SELECT 1")
                test_cursor.close()
                test_conn.close()
                with self._lock:
                    self._metrics.total_closed += 1
                health_status["connection_test"] = "passed"
            except Exception as e:
                health_status["connection_test"] = f"failed: {str(e)}"
                health_status["status"] = "unhealthy"

            self._last_health_check = datetime.now()

        return health_status

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
                "metrics": {
                    "total_created": self._metrics.total_created,
                    "total_closed": self._metrics.total_closed,
                    "total_errors": self._metrics.total_errors,
                    "total_timeouts": self._metrics.total_timeouts,
                    "total_retries": self._metrics.total_retries,
                    "average_connection_time": round(self._metrics.average_connection_time, 3),
                    "error_rate": (
                        (self._metrics.total_errors / max(self._metrics.total_created, 1)) * 100
                    ),
                },
                "health_status": self._metrics.health_status,
            }

    def close_all(self):
        """Close all connections in the pool"""
        self._shutdown = True
        closed_count = 0

        while not self._pool.empty():
            try:
                conn, _ = self._pool.get_nowait()
                conn.close()
                closed_count += 1
            except Exception:
                pass

        with self._lock:
            self._checked_out.clear()
            self._created = 0
            self._metrics.total_closed += closed_count

        logger.info(f"Closed {closed_count} connections from pool")
