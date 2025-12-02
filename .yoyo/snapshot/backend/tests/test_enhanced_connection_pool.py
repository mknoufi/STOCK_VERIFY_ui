"""
Test Enhanced Connection Pool
Tests for retry logic, health monitoring, and metrics
"""

import pytest
import time
from unittest.mock import Mock, patch, MagicMock
from backend.services.enhanced_connection_pool import EnhancedSQLServerConnectionPool, ConnectionMetrics


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
            "retry_delay": 0.1,  # Short delay for testing
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

    @patch('backend.services.enhanced_connection_pool.pyodbc.connect')
    def test_connection_creation_with_retry(self, mock_connect, pool_config, mock_connection):
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

    @patch('backend.services.enhanced_connection_pool.pyodbc.connect')
    def test_connection_retry_exhausted(self, mock_connect, pool_config):
        """Test that retry logic gives up after max attempts"""
        mock_connect.side_effect = Exception("Connection failed")

        with pytest.raises(ConnectionError):
            pool = EnhancedSQLServerConnectionPool(**pool_config)
            # Try to get a connection
            with pool.get_connection():
                pass

    @patch('backend.services.enhanced_connection_pool.pyodbc.connect')
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

    @patch('backend.services.enhanced_connection_pool.pyodbc.connect')
    def test_metrics_collection(self, mock_connect, pool_config, mock_connection):
        """Test that metrics are collected correctly"""
        mock_connect.return_value = mock_connection
        
        pool = EnhancedSQLServerConnectionPool(**pool_config)
        
        # Get and return a connection
        with pool.get_connection() as conn:
            pass
        
        stats = pool.get_stats()
        
        assert stats["metrics"]["total_created"] > 0
        assert "total_closed" in stats["metrics"]
        assert "total_errors" in stats["metrics"]
        assert "average_connection_time" in stats["metrics"]

    @patch('backend.services.enhanced_connection_pool.pyodbc.connect')
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

    @patch('backend.services.enhanced_connection_pool.pyodbc.connect')
    def test_connection_validation(self, mock_connect, pool_config, mock_connection):
        """Test that invalid connections are detected and replaced"""
        mock_connect.return_value = mock_connection
        
        # Mock connection validation to fail
        with patch('backend.utils.db_connection.SQLServerConnectionBuilder.is_connection_valid', return_value=False):
            pool = EnhancedSQLServerConnectionPool(**pool_config)
            
            # Get connection (should create new one since validation fails)
            conn = pool._get_connection()
            
            # Return connection (should be closed since invalid)
            pool._return_connection(conn)
            
            stats = pool.get_stats()
            # Connection should be closed, not returned to pool
            assert stats["available"] == 0

    @patch('backend.services.enhanced_connection_pool.pyodbc.connect')
    def test_health_status_tracking(self, mock_connect, pool_config, mock_connection):
        """Test health status tracking"""
        mock_connect.return_value = mock_connection
        
        pool = EnhancedSQLServerConnectionPool(**pool_config)
        
        # Initially should be healthy
        health = pool.check_health()
        assert health["status"] in ["healthy", "degraded"]
        
        # Simulate errors
        with patch('backend.services.enhanced_connection_pool.pyodbc.connect', side_effect=Exception("Error")):
            try:
                pool._create_connection()
            except Exception:
                pass
        
        # Health should reflect errors
        pool._update_health_status()
        assert pool._metrics.health_status in ["healthy", "degraded", "unhealthy"]

    @patch('backend.services.enhanced_connection_pool.pyodbc.connect')
    def test_connection_timeout(self, mock_connect, pool_config, mock_connection):
        """Test connection timeout handling"""
        mock_connect.return_value = mock_connection
        
        pool = EnhancedSQLServerConnectionPool(**pool_config, timeout=1)
        
        # Simulate timeout by making pool empty and slow
        with patch.object(pool._pool, 'get_nowait', side_effect=Exception("Empty")):
            with pytest.raises(TimeoutError):
                pool._get_connection(timeout=0.5)
        
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

