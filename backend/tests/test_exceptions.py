"""
Tests for Custom Exception Classes
Verifies exception structure and error handling
"""

from backend.exceptions import (
    AuthenticationError,
    AuthorizationError,
    DatabaseConnectionError,
    ItemNotFoundError,
    MongoDBConnectionError,
    RateLimitError,
    SQLServerConnectionError,
    StockVerifyException,
    SyncError,
    ValidationError,
)


class TestStockVerifyException:
    """Test base exception class"""

    def test_base_exception_creation(self):
        """Test base exception can be created"""
        exc = StockVerifyException("Test error")

        assert str(exc) == "Test error"
        assert exc.message == "Test error"
        assert exc.error_code == "StockVerifyException"
        assert exc.status_code == 500
        assert exc.details == {}

    def test_base_exception_with_details(self):
        """Test base exception with custom details"""
        exc = StockVerifyException(
            "Test error",
            error_code="TEST_ERROR",
            details={"field": "test_field", "value": 123},
            status_code=400,
        )

        assert exc.error_code == "TEST_ERROR"
        assert exc.status_code == 400
        assert exc.details["field"] == "test_field"
        assert exc.details["value"] == 123

    def test_to_dict_conversion(self):
        """Test exception to dictionary conversion"""
        exc = StockVerifyException(
            "Test error",
            error_code="TEST_ERROR",
            details={"field": "test"},
        )

        result = exc.to_dict()

        assert result["error"] == "TEST_ERROR"
        assert result["message"] == "Test error"
        assert result["details"]["field"] == "test"


class TestDatabaseConnectionError:
    """Test database connection errors"""

    def test_database_connection_error(self):
        """Test generic database connection error"""
        exc = DatabaseConnectionError("Connection failed", database="test_db")

        assert exc.database == "test_db"
        assert exc.error_code == "DATABASE_CONNECTION_ERROR"
        assert exc.status_code == 503
        assert exc.details["database"] == "test_db"

    def test_sql_server_connection_error(self):
        """Test SQL Server specific connection error"""
        exc = SQLServerConnectionError("SQL Server unavailable")

        assert exc.database == "sql_server"
        assert exc.error_code == "SQL_SERVER_CONNECTION_ERROR"
        assert exc.status_code == 503

    def test_mongodb_connection_error(self):
        """Test MongoDB specific connection error"""
        exc = MongoDBConnectionError("MongoDB unavailable")

        assert exc.database == "mongodb"
        assert exc.error_code == "MONGODB_CONNECTION_ERROR"
        assert exc.status_code == 503


class TestSyncError:
    """Test sync operation errors"""

    def test_sync_error_creation(self):
        """Test sync error creation"""
        exc = SyncError(
            "Sync failed",
            sync_type="quantity_sync",
            item_code="ITEM001",
            details={"retry_count": 3},
        )

        assert exc.sync_type == "quantity_sync"
        assert exc.item_code == "ITEM001"
        assert exc.error_code == "SYNC_ERROR"
        assert exc.status_code == 500
        assert exc.details["sync_type"] == "quantity_sync"
        assert exc.details["item_code"] == "ITEM001"
        assert exc.details["retry_count"] == 3


class TestItemNotFoundError:
    """Test item not found errors"""

    def test_item_not_found_error(self):
        """Test item not found error"""
        exc = ItemNotFoundError("ITEM001")

        assert exc.item_code == "ITEM001"
        assert exc.error_code == "ITEM_NOT_FOUND"
        assert exc.status_code == 404
        assert "ITEM001" in exc.message
        assert exc.details["item_code"] == "ITEM001"


class TestValidationError:
    """Test validation errors"""

    def test_validation_error(self):
        """Test validation error"""
        exc = ValidationError("Invalid value", field="quantity")

        assert exc.field == "quantity"
        assert exc.error_code == "VALIDATION_ERROR"
        assert exc.status_code == 422
        assert exc.details["field"] == "quantity"


class TestAuthenticationError:
    """Test authentication errors"""

    def test_authentication_error_default(self):
        """Test default authentication error"""
        exc = AuthenticationError()

        assert exc.message == "Authentication failed"
        assert exc.error_code == "AUTHENTICATION_ERROR"
        assert exc.status_code == 401

    def test_authentication_error_custom(self):
        """Test custom authentication error"""
        exc = AuthenticationError("Token expired", details={"expired_at": "2024-01-01"})

        assert exc.message == "Token expired"
        assert exc.details["expired_at"] == "2024-01-01"


class TestAuthorizationError:
    """Test authorization errors"""

    def test_authorization_error_default(self):
        """Test default authorization error"""
        exc = AuthorizationError()

        assert exc.message == "Insufficient permissions"
        assert exc.error_code == "AUTHORIZATION_ERROR"
        assert exc.status_code == 403


class TestRateLimitError:
    """Test rate limit errors"""

    def test_rate_limit_error_default(self):
        """Test default rate limit error"""
        exc = RateLimitError()

        assert exc.message == "Rate limit exceeded"
        assert exc.error_code == "RATE_LIMIT_ERROR"
        assert exc.status_code == 429
        assert exc.retry_after is None

    def test_rate_limit_error_with_retry_after(self):
        """Test rate limit error with retry after"""
        exc = RateLimitError(retry_after=60)

        assert exc.retry_after == 60
        assert exc.details["retry_after"] == 60


class TestExceptionInheritance:
    """Test exception inheritance"""

    def test_all_exceptions_inherit_from_base(self):
        """Test all exceptions inherit from StockVerifyException"""
        exceptions = [
            DatabaseConnectionError("test"),
            SQLServerConnectionError("test"),
            MongoDBConnectionError("test"),
            SyncError("test"),
            ItemNotFoundError("ITEM001"),
            ValidationError("test"),
            AuthenticationError("test"),
            AuthorizationError("test"),
            RateLimitError(),
        ]

        for exc in exceptions:
            assert isinstance(exc, StockVerifyException)
            assert hasattr(exc, "to_dict")
            assert hasattr(exc, "error_code")
            assert hasattr(exc, "status_code")
            assert hasattr(exc, "details")
