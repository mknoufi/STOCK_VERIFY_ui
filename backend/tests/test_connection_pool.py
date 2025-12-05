"""
Test Connection Pool
Tests for the standard SQLServerConnectionPool
"""

import time
from unittest.mock import Mock, patch

import pytest

from backend.services.connection_pool import SQLServerConnectionPool


class TestConnectionPool:
    """Test suite for SQLServerConnectionPool"""

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
            "recycle": 3600,
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

    @patch("backend.services.connection_pool.pyodbc.connect")
    def test_initialization(self, mock_connect, pool_config, mock_connection):
        """Test pool initialization"""
        mock_connect.return_value = mock_connection

        pool = SQLServerConnectionPool(**pool_config)

        # Should have created pool_size connections
        assert pool._active_connections == pool_config["pool_size"]
        assert pool._pool.qsize() == pool_config["pool_size"]
        assert mock_connect.call_count == pool_config["pool_size"]

    @patch("backend.services.connection_pool.pyodbc.connect")
    def test_get_connection(self, mock_connect, pool_config, mock_connection):
        """Test getting a connection from the pool"""
        mock_connect.return_value = mock_connection

        pool = SQLServerConnectionPool(**pool_config)

        # Get a connection
        conn = pool._get_connection()

        assert conn == mock_connection
        assert pool._pool.qsize() == pool_config["pool_size"] - 1
        assert len(pool._checked_out) == 1

    @patch("backend.services.connection_pool.pyodbc.connect")
    def test_return_connection(self, mock_connect, pool_config, mock_connection):
        """Test returning a connection to the pool"""
        mock_connect.return_value = mock_connection

        pool = SQLServerConnectionPool(**pool_config)

        # Get and return
        conn = pool._get_connection()
        pool._return_connection(conn)

        assert pool._pool.qsize() == pool_config["pool_size"]
        assert len(pool._checked_out) == 0

    @patch("backend.services.connection_pool.pyodbc.connect")
    def test_create_overflow_connection(self, mock_connect, pool_config, mock_connection):
        """Test creating connections beyond pool size (overflow)"""
        # Return a new mock connection each time to ensure unique IDs
        mock_connect.side_effect = lambda *args, **kwargs: Mock(wraps=mock_connection)

        # Initialize with empty pool for this test to control creation
        with patch.object(SQLServerConnectionPool, "_initialize_pool"):
            pool = SQLServerConnectionPool(**pool_config)

            # Drain the pool (it's empty initially due to mock)

            # Request more connections than pool_size
            conns = []
            # We need to mock _create_connection to ensure it doesn't try to connect for real
            # But we already mocked pyodbc.connect.

            # The issue might be that _get_connection waits if pool is empty and max_overflow reached.
            # But here we are within limits (pool_size + 1 <= pool_size + max_overflow(2)).

            # Let's ensure we don't block.
            for _ in range(pool_config["pool_size"] + 1):
                conns.append(pool._get_connection())

            assert pool._active_connections == pool_config["pool_size"] + 1
            assert len(pool._checked_out) == pool_config["pool_size"] + 1

    @patch("backend.services.connection_pool.pyodbc.connect")
    def test_recycle_connection(self, mock_connect, pool_config, mock_connection):
        """Test connection recycling"""
        mock_connect.return_value = mock_connection

        pool = SQLServerConnectionPool(**pool_config)

        # Mock a connection created a long time ago
        old_conn = Mock()
        old_time = time.time() - pool_config["recycle"] - 100

        # Manually put an old connection in the pool
        # Manually put an old connection in the pool
        # First drain the pool completely
        while not pool._pool.empty():
            pool._pool.get_nowait()

        pool._pool.put((old_conn, old_time))

        # Get connection - should trigger recycle
        # We need to mock _discard_connection to verify it's called, or check side effects
        with patch.object(
            pool, "_discard_connection", wraps=pool._discard_connection
        ) as mock_discard:
            conn = pool._get_connection()

            # Should have discarded the old one and created a new one
            mock_discard.assert_called_with(old_conn)
            assert conn != old_conn
            assert conn == mock_connection  # The new one from mock_connect

    @patch("backend.services.connection_pool.pyodbc.connect")
    def test_invalid_connection_validation(self, mock_connect, pool_config, mock_connection):
        """Test that invalid connections are discarded"""
        mock_connect.return_value = mock_connection

        pool = SQLServerConnectionPool(**pool_config)

        # Mock validation to fail
        with patch(
            "backend.utils.db_connection.SQLServerConnectionBuilder.is_connection_valid",
            return_value=False,
        ):
            pool._get_connection()

            # Should have created a new connection (mock_connect called again)
            # Initial init calls: 5. Get connection calls: 1 (discarded) + 1 (new) = 7?
            # Actually: init=5. _get_connection gets one from pool. Validates -> False. Discards. Creates new.
            # So total connect calls should be 5 + 1 = 6.
            assert mock_connect.call_count == pool_config["pool_size"] + 1

    @patch("backend.services.connection_pool.pyodbc.connect")
    def test_context_manager(self, mock_connect, pool_config, mock_connection):
        """Test the get_connection context manager"""
        mock_connect.return_value = mock_connection

        pool = SQLServerConnectionPool(**pool_config)

        with pool.get_connection() as conn:
            assert conn == mock_connection
            assert len(pool._checked_out) == 1

        assert len(pool._checked_out) == 0

    @patch("backend.services.connection_pool.pyodbc.connect")
    def test_close_all(self, mock_connect, pool_config, mock_connection):
        """Test closing all connections"""
        mock_connect.return_value = mock_connection

        pool = SQLServerConnectionPool(**pool_config)

        # Checkout one
        pool._get_connection()

        pool.close_all()

        assert pool._active_connections == 0
        assert pool._pool.empty()
        assert len(pool._checked_out) == 0

        # The checked out connection should also be closed eventually or handled,
        # but close_all clears the tracking.
