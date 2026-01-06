"""
Tests for ERP Sync Service (Refactored)
Tests the modular sync flow with proper exception handling
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.exceptions import SQLServerConnectionError
from backend.services.sql_sync_service import SQLSyncService


class AsyncIterator:
    """Helper class to create async iterators for testing MongoDB cursors"""

    def __init__(self, items):
        self.items = items
        self.index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index >= len(self.items):
            raise StopAsyncIteration
        item = self.items[self.index]
        self.index += 1
        return item


@pytest.fixture
def mock_sql_connector():
    """Mock SQL Server connector"""
    connector = Mock()
    connector.test_connection.return_value = True
    connector.get_all_items.return_value = [
        {
            "item_code": "ITEM001",
            "item_name": "Test Item 1",
            "stock_qty": 100.0,
            "barcode": "BAR001",
            "category": "Electronics",
        },
        {
            "item_code": "ITEM002",
            "item_name": "Test Item 2",
            "stock_qty": 50.0,
            "barcode": "BAR002",
            "category": "General",
        },
    ]
    # Mock get_item_quantities_only for variance sync
    connector.get_item_quantities_only = Mock(return_value={"ITEM001": 100.0, "ITEM002": 50.0})
    return connector


@pytest.fixture
def mock_mongo_db():
    """Mock MongoDB database"""
    db = AsyncMock(spec=AsyncIOMotorDatabase)

    # Mock erp_items collection
    db.erp_items = AsyncMock()
    db.erp_items.find_one = AsyncMock()
    db.erp_items.update_one = AsyncMock()
    db.erp_items.insert_one = AsyncMock()
    # Default find returns empty async iterator
    db.erp_items.find = Mock(return_value=AsyncIterator([]))

    return db


@pytest.fixture
def sync_service(mock_sql_connector, mock_mongo_db):
    """Create sync service instance"""
    return SQLSyncService(
        sql_connector=mock_sql_connector,
        mongo_db=mock_mongo_db,
        sync_interval=3600,
        enabled=True,
    )


class TestSQLSyncService:
    """Test SQL Sync Service"""

    @pytest.mark.asyncio
    async def test_sync_items_success(self, sync_service, mock_sql_connector, mock_mongo_db):
        """Test successful sync with variance detection"""
        # Mock existing items in MongoDB with async cursor
        mock_mongo_db.erp_items.find = Mock(
            return_value=AsyncIterator(
                [
                    {"item_code": "ITEM001", "stock_qty": 90.0},  # Qty changed (SQL has 100)
                    {"item_code": "ITEM002", "stock_qty": 50.0},  # Qty same (SQL has 50)
                ]
            )
        )

        # Mock SQL connector to return quantities with variance
        mock_sql_connector.get_item_quantities_only = Mock(
            return_value={"ITEM001": 100.0, "ITEM002": 50.0}
        )

        # Mock update result
        update_result = Mock()
        update_result.modified_count = 1
        mock_mongo_db.erp_items.update_one.return_value = update_result

        # Execute sync
        result = await sync_service.sync_items()

        # Verify results
        assert result["items_checked"] == 2
        assert result["variances_found"] == 1  # ITEM001 has variance
        assert result["errors"] == 0
        assert result["duration"] > 0

        # Verify MongoDB update was called for variance
        assert mock_mongo_db.erp_items.update_one.called

    @pytest.mark.asyncio
    async def test_sync_items_no_connection(self, sync_service, mock_sql_connector):
        """Test sync fails when SQL Server connection unavailable"""
        mock_sql_connector.test_connection.return_value = False

        with pytest.raises(SQLServerConnectionError) as exc_info:
            await sync_service.sync_items()

        assert "SQL Server connection not available" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_sync_items_preserves_enrichment_data(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test that sync preserves enrichment data when updating quantity"""
        # Mock existing items in MongoDB - variance triggers update
        mock_mongo_db.erp_items.find = Mock(
            return_value=AsyncIterator(
                [
                    {"item_code": "ITEM001", "stock_qty": 90.0},  # Variance detected
                ]
            )
        )

        # SQL returns different quantity
        mock_sql_connector.get_item_quantities_only = Mock(return_value={"ITEM001": 100.0})

        update_result = Mock()
        update_result.modified_count = 1
        mock_mongo_db.erp_items.update_one.return_value = update_result

        # Execute sync
        await sync_service.sync_items()

        # Verify update_one was called
        assert mock_mongo_db.erp_items.update_one.called

        # Get the update call arguments
        call_args = mock_mongo_db.erp_items.update_one.call_args

        # Verify only quantity-related fields are updated
        update_doc = call_args.args[1]["$set"]
        assert "sql_server_qty" in update_doc
        assert "stock_qty" in update_doc

        # Verify enrichment fields are NOT in the update (preserved)
        assert "serial_number" not in update_doc
        assert "hsn_code" not in update_doc
        assert "condition" not in update_doc

    @pytest.mark.asyncio
    async def test_sync_items_updates_location(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test that variance sync updates only quantity fields"""
        # Mock existing items in MongoDB with variance
        mock_mongo_db.erp_items.find = Mock(
            return_value=AsyncIterator(
                [
                    {"item_code": "ITEM001", "stock_qty": 90.0},
                ]
            )
        )

        # SQL returns different quantity
        mock_sql_connector.get_item_quantities_only = Mock(return_value={"ITEM001": 100.0})

        update_result = Mock()
        update_result.modified_count = 1
        mock_mongo_db.erp_items.update_one.return_value = update_result

        # Execute sync
        await sync_service.sync_items()

        # Verify update_one was called
        assert mock_mongo_db.erp_items.update_one.called

    @pytest.mark.asyncio
    async def test_sync_items_unchanged_quantity(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test sync skips items with unchanged quantity"""
        # Mock existing items with same quantity as SQL
        mock_mongo_db.erp_items.find = Mock(
            return_value=AsyncIterator(
                [
                    {"item_code": "ITEM001", "stock_qty": 100.0},
                    {"item_code": "ITEM002", "stock_qty": 50.0},
                ]
            )
        )

        # SQL returns same quantities - no variance
        mock_sql_connector.get_item_quantities_only = Mock(
            return_value={"ITEM001": 100.0, "ITEM002": 50.0}
        )

        # Execute sync
        result = await sync_service.sync_items()

        # Verify items were checked but no variances found
        assert result["items_checked"] == 2
        assert result["variances_found"] == 0

        # Verify update_one was NOT called (no variances)
        assert not mock_mongo_db.erp_items.update_one.called

    @pytest.mark.asyncio
    async def test_sync_items_handles_errors_gracefully(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test sync handles SQL Server errors gracefully"""
        # Mock existing items in MongoDB
        mock_mongo_db.erp_items.find = Mock(
            return_value=AsyncIterator(
                [
                    {"item_code": "ITEM001", "stock_qty": 90.0},
                ]
            )
        )

        # Mock SQL connector to raise error
        mock_sql_connector.get_item_quantities_only = Mock(
            side_effect=Exception("SQL connection error")
        )

        # Execute sync
        result = await sync_service.sync_items()

        # Verify errors are tracked
        assert result["errors"] > 0

    @pytest.mark.asyncio
    async def test_sync_items_batch_processing(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test batch processing with multiple items"""
        # Create list of items in MongoDB with variances
        mongo_items = [
            {"item_code": f"ITEM{i:03d}", "stock_qty": float(i * 10)} for i in range(250)
        ]
        mock_mongo_db.erp_items.find = Mock(return_value=AsyncIterator(mongo_items))

        # SQL returns different quantities for all items
        sql_quantities = {f"ITEM{i:03d}": float(i * 10 + 5) for i in range(250)}
        mock_sql_connector.get_item_quantities_only = Mock(return_value=sql_quantities)

        update_result = Mock()
        update_result.modified_count = 1
        mock_mongo_db.erp_items.update_one.return_value = update_result

        # Execute sync
        result = await sync_service.sync_items()

        # Verify all items were processed
        assert result["items_checked"] == 250
        assert result["variances_found"] == 250
        assert result["errors"] == 0

    @pytest.mark.asyncio
    async def test_sync_now_triggers_immediate_sync(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test sync_now triggers immediate sync"""
        # Mock items in MongoDB with variance
        mock_mongo_db.erp_items.find = Mock(
            return_value=AsyncIterator(
                [
                    {"item_code": "ITEM001", "stock_qty": 90.0},
                ]
            )
        )

        mock_sql_connector.get_item_quantities_only = Mock(return_value={"ITEM001": 100.0})

        update_result = Mock()
        update_result.modified_count = 1
        mock_mongo_db.erp_items.update_one.return_value = update_result

        result = await sync_service.sync_now()

        assert result["items_checked"] == 1
        assert mock_sql_connector.get_item_quantities_only.called

    def test_get_stats_returns_sync_statistics(self, sync_service):
        """Test get_stats returns sync statistics"""
        stats = sync_service.get_stats()

        assert "total_syncs" in stats
        assert "successful_syncs" in stats
        assert "failed_syncs" in stats
        assert "running" in stats
        assert "enabled" in stats
        assert "sync_interval" in stats

    def test_set_interval_updates_sync_interval(self, sync_service):
        """Test set_interval updates sync interval"""
        sync_service.set_interval(7200)

        assert sync_service.sync_interval == 7200
        stats = sync_service.get_stats()
        assert stats["sync_interval"] == 7200

    @pytest.mark.asyncio
    async def test_disable_service(self, sync_service):
        """Test disable service"""
        # Initially enabled
        assert sync_service.enabled is True

        # Disable
        sync_service.disable()
        assert sync_service.enabled is False

    @pytest.mark.asyncio
    async def test_enable_service(self, sync_service):
        """Test enable service"""
        # Mock start to avoid background task issues
        with patch.object(sync_service, "start") as mock_start:
            # Start disabled
            sync_service.disable()
            assert sync_service.enabled is False

            # Enable
            sync_service.enable()
            assert sync_service.enabled is True
            # Verify start() was called
            assert mock_start.called

    @pytest.mark.asyncio
    async def test_sync_all_items_backwards_compatibility(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test sync_all_items is backwards compatible alias"""
        # Mock items in MongoDB
        mock_mongo_db.erp_items.find = Mock(
            return_value=AsyncIterator(
                [
                    {"item_code": "ITEM001", "stock_qty": 100.0},
                ]
            )
        )

        mock_sql_connector.get_item_quantities_only = Mock(return_value={"ITEM001": 100.0})

        # Both methods should work
        result1 = await sync_service.sync_items()
        result2 = await sync_service.sync_all_items()

        # Both should produce similar results structure
        assert "items_checked" in result1
        assert "items_checked" in result2
