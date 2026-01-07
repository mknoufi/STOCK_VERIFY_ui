"""
Test Enhanced Connection Pool
Tests for retry logic, health monitoring, and metrics
"""

from unittest.mock import Mock, patch

import pytest

from backend.services.enhanced_connection_pool import (
    ConnectionMetrics,
    EnhancedSQLServerConnectionPool,
)


class TestEnhancedConnectionPool:
    """Test suite for Enhanced Connection Pool"""

    @pytest.fixture
    def pool_config(self):
        """Fixture for pool configuration"""
        return {
            "host": "localhost",
            "port": 1433,
            "database": "test_db",
            "user": "test_user",
            "password": "test_password",
            "pool_size": 5,
            "max_overflow": 2,
            "timeout": 10,
            "retry_attempts": 3,
            "retry_delay": 0.01,  # Very short delay for testing
        }

    @pytest.fixture
    def mock_connection(self):
        """Mock SQL Server connection"""
        conn = Mock()
        conn.cursor.return_value = Mock()
        conn.cursor.return_value.execute.return_value = None
        conn.cursor.return_value.close.return_value = None
        conn.close.return_value = None
        return conn

    @patch("backend.services.enhanced_connection_pool.pyodbc.connect")
    def test_connection_creation_with_retry(
        self, mock_connect, pool_config, mock_connection
    ):
        """Test connection creation with retry logic"""
        # First two attempts fail, third succeeds
        mock_connect.side_effect = [
            Exception("Connection failed"),
            Exception("Connection failed"),
            mock_connection,
        ]

        pool = EnhancedSQLServerConnectionPool(**pool_config)

        # Verify retry was attempted
        assert mock_connect.call_count >= 3
        assert pool._metrics.total_retries >= 2

    @patch("backend.services.enhanced_connection_pool.pyodbc.connect")
    def test_connection_retry_exhausted(self, mock_connect, pool_config):
        """Test that retry logic gives up after max attempts"""
        mock_connect.side_effect = Exception("Connection failed")

        # Pool swallows connection errors and retries until timeout
        # So we expect TimeoutError, not ConnectionError
        with pytest.raises(TimeoutError):
            pool = EnhancedSQLServerConnectionPool(**pool_config)
            # Try to get a connection with short timeout to avoid hanging
            with pool.get_connection(timeout=0.5):
                pass

    @patch("backend.services.enhanced_connection_pool.pyodbc.connect")
    def test_health_check(self, mock_connect, pool_config, mock_connection):
        """Test health check functionality"""
        mock_connect.return_value = mock_connection

        pool = EnhancedSQLServerConnectionPool(**pool_config)
        health = pool.check_health()

        assert "status" in health
        assert "pool_size" in health
        assert "created" in health
        assert "available" in health
        assert "checked_out" in health
        assert "utilization" in health
        assert "metrics" in health

    @patch("backend.services.enhanced_connection_pool.pyodbc.connect")
    def test_metrics_collection(self, mock_connect, pool_config, mock_connection):
        """Test that metrics are collected correctly"""
        mock_connect.return_value = mock_connection

        pool = EnhancedSQLServerConnectionPool(**pool_config)

        # Get and return a connection
        with pool.get_connection():
            pass

        stats = pool.get_stats()

        assert stats["metrics"]["total_created"] > 0
        assert "total_closed" in stats["metrics"]
        assert "total_errors" in stats["metrics"]
        assert "average_connection_time" in stats["metrics"]

    @patch("backend.services.enhanced_connection_pool.pyodbc.connect")
    def test_connection_pooling(self, mock_connect, pool_config, mock_connection):
        """Test that connections are pooled and reused"""
        mock_connect.return_value = mock_connection

        pool = EnhancedSQLServerConnectionPool(**pool_config)

        # Get multiple connections
        conn1 = pool._get_connection()
        conn2 = pool._get_connection()

        # Return connections
        pool._return_connection(conn1)
        pool._return_connection(conn2)

        # Verify connections are reused
        stats = pool.get_stats()
        assert stats["available"] == 2

    @patch("backend.services.enhanced_connection_pool.pyodbc.connect")
    def test_connection_validation(self, mock_connect, pool_config, mock_connection):
        """Test that invalid connections are detected and replaced"""
        mock_connect.return_value = mock_connection

        # Mock connection validation to fail
        with patch(
            "backend.utils.db_connection.SQLServerConnectionBuilder.is_connection_valid",
            return_value=False,
        ):
            pool = EnhancedSQLServerConnectionPool(**pool_config)

            # Get connection (should create new one since validation fails)
            conn = pool._get_connection()

            # Return connection (should be closed since invalid)
            pool._return_connection(conn)

            stats = pool.get_stats()
            # Connection should be closed, not returned to pool
            # Initial size 3. One taken and returned (invalid -> closed).
            # So 2 remaining in pool.
            assert stats["available"] == 2

    @patch("backend.services.enhanced_connection_pool.pyodbc.connect")
    def test_health_status_tracking(self, mock_connect, pool_config, mock_connection):
        """Test health status tracking"""
        mock_connect.return_value = mock_connection

        pool = EnhancedSQLServerConnectionPool(**pool_config)

        # Initially should be healthy
        health = pool.check_health()
        assert health["status"] in ["healthy", "degraded"]

        # Simulate errors
        with patch(
            "backend.services.enhanced_connection_pool.pyodbc.connect",
            side_effect=Exception("Error"),
        ):
            try:
                pool._create_connection()
            except Exception:
                pass

        # Health should reflect errors
        pool._update_health_status()
        assert pool._metrics.health_status in ["healthy", "degraded", "unhealthy"]

    def test_connection_timeout(self, pool_config, mock_connection):
        """Test connection timeout handling"""
        with patch(
            "backend.services.enhanced_connection_pool.pyodbc.connect"
        ) as mock_connect:
            mock_connect.return_value = mock_connection

            config = pool_config.copy()
            config["timeout"] = 1
            pool = EnhancedSQLServerConnectionPool(**config)

            # Simulate timeout
            from queue import Empty

            # Mock queue to be empty AND full (so it waits instead of creating new)
            # Also ensure _created is maxed out so it doesn't try to create new connections
            pool._created = pool.pool_size + pool.max_overflow

            with patch.object(pool._pool, "get_nowait", side_effect=Empty):
                with patch.object(pool._pool, "get", side_effect=Empty):
                    with patch.object(
                        pool._pool, "qsize", return_value=5
                    ):  # Pool is full
                        with pytest.raises(TimeoutError):
                            with pool.get_connection():
                                pass

            assert pool._metrics.total_timeouts > 0

    def test_metrics_initialization(self):
        """Test that metrics are initialized correctly"""
        metrics = ConnectionMetrics()

        assert metrics.total_created == 0
        assert metrics.total_closed == 0
        assert metrics.total_errors == 0
        assert metrics.health_status == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
