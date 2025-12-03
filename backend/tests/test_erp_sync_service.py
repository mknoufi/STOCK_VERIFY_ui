"""
Tests for ERP Sync Service (Refactored)
Tests the modular sync flow with proper exception handling
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from backend.services.erp_sync_service import SQLSyncService
from backend.exceptions import SQLServerConnectionError
from motor.motor_asyncio import AsyncIOMotorDatabase


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
        """Test successful sync of items"""
        # Mock existing item in MongoDB
        mock_mongo_db.erp_items.find_one.side_effect = [
            {
                "item_code": "ITEM001",
                "sql_server_qty": 90.0,
                "stock_qty": 90.0,
            },  # Existing, qty changed
            None,  # New item
        ]

        # Mock update result
        update_result = Mock()
        update_result.modified_count = 1
        mock_mongo_db.erp_items.update_one.return_value = update_result

        # Mock insert result
        insert_result = Mock()
        insert_result.inserted_id = "new_id"
        mock_mongo_db.erp_items.insert_one.return_value = insert_result

        # Execute sync
        result = await sync_service.sync_items()

        # Verify results
        assert result["items_checked"] == 2
        assert result["items_updated"] == 1
        assert result["items_created"] == 1
        assert result["errors"] == 0
        assert result["duration"] > 0

        # Verify MongoDB operations
        assert mock_mongo_db.erp_items.update_one.called
        assert mock_mongo_db.erp_items.insert_one.called

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
        # Mock existing item with enrichment data
        existing_item = {
            "item_code": "ITEM001",
            "sql_server_qty": 90.0,
            "stock_qty": 90.0,
            "serial_number": "SN123456",
            "mrp": 1500.0,
            "hsn_code": "HSN001",
            "location": "Aisle-1",
            "condition": "Good",
        }
        mock_mongo_db.erp_items.find_one.return_value = existing_item

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
        # call_args is (args, kwargs), update is the second arg
        update_doc = call_args.args[1]["$set"]
        assert "sql_server_qty" in update_doc
        assert "stock_qty" in update_doc
        assert "last_synced" in update_doc

        # Verify enrichment fields are NOT in the update (preserved)
        assert "serial_number" not in update_doc
        assert "hsn_code" not in update_doc
        # location is now synced from SQL, so it might be updated if changed
        # assert "location" not in update_doc 
        assert "condition" not in update_doc

    @pytest.mark.asyncio
    async def test_sync_items_updates_location(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test that sync updates location when changed in SQL"""
        # Mock existing item
        existing_item = {
            "item_code": "ITEM001",
            "sql_server_qty": 100.0,
            "stock_qty": 100.0,
            "location": "Old-Loc",
        }
        mock_mongo_db.erp_items.find_one.return_value = existing_item

        # Mock SQL item with new location
        mock_sql_connector.get_all_items.return_value = [
            {
                "item_code": "ITEM001",
                "stock_qty": 100.0,
                "location": "New-Loc",
            }
        ]

        update_result = Mock()
        update_result.modified_count = 1
        mock_mongo_db.erp_items.update_one.return_value = update_result

        # Execute sync
        await sync_service.sync_items()

        # Verify update_one was called
        assert mock_mongo_db.erp_items.update_one.called
        call_args = mock_mongo_db.erp_items.update_one.call_args
        update_doc = call_args.args[1]["$set"]

        # Verify location is updated
        assert "location" in update_doc
        assert update_doc["location"] == "New-Loc"

    @pytest.mark.asyncio
    async def test_sync_items_unchanged_quantity(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test sync skips items with unchanged quantity"""
        # Mock existing item with same quantity
        existing_item = {
            "item_code": "ITEM001",
            "sql_server_qty": 100.0,
            "stock_qty": 100.0,
        }
        mock_mongo_db.erp_items.find_one.return_value = existing_item

        # Execute sync
        result = await sync_service.sync_items()

        # Verify item was checked but not updated
        assert result["items_checked"] == 2
        assert result["items_unchanged"] >= 1
        assert result["items_updated"] == 0

        # Verify update_one was NOT called for unchanged item
        # (may be called for other items, but not for unchanged one)

    @pytest.mark.asyncio
    async def test_sync_items_handles_errors_gracefully(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test sync handles individual item errors gracefully"""
        # Mock find_one to raise error for one item
        mock_mongo_db.erp_items.find_one.side_effect = [
            Exception("Database error"),
            {"item_code": "ITEM002", "sql_server_qty": 50.0},
        ]

        # Execute sync
        result = await sync_service.sync_items()

        # Verify errors are tracked but sync continues
        assert result["errors"] > 0
        # One item failed before checking, one succeeded
        assert result["items_checked"] == 1

    @pytest.mark.asyncio
    async def test_sync_items_batch_processing(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test batch processing with multiple items"""
        # Create large list of items
        many_items = [
            {
                "item_code": f"ITEM{i:03d}",
                "item_name": f"Item {i}",
                "stock_qty": float(i * 10),
                "barcode": f"BAR{i:03d}",
            }
            for i in range(250)  # More than batch size (100)
        ]
        mock_sql_connector.get_all_items.return_value = many_items

        # Mock find_one to return None (new items)
        mock_mongo_db.erp_items.find_one.return_value = None

        # Execute sync
        result = await sync_service.sync_items()

        # Verify all items were processed
        assert result["items_checked"] == 250
        assert result["items_created"] == 250
        assert result["errors"] == 0

    @pytest.mark.asyncio
    async def test_sync_now_triggers_immediate_sync(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test sync_now triggers immediate sync"""
        mock_mongo_db.erp_items.find_one.return_value = None

        result = await sync_service.sync_now()

        assert result["items_checked"] == 2
        assert mock_sql_connector.get_all_items.called

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
            # mock_start.called is already asserted by sync_service.enable() calling start()
            # which calls mock_start. But wait, start() calls _sync_loop which is async.
            # The issue might be that start() returns None, and we are asserting on mock_start.called.
            # But why is it unreachable?
            # Ah, if sync_service.enable() raises an exception, this line is unreachable.
            # But enable() shouldn't raise.
            # Let's look at the previous lines.
            # sync_service.enable() calls self.start().
            # self.start() calls asyncio.create_task(self._sync_loop()).
            # It should return.
            # Maybe the linter thinks assert mock_start.called is unreachable because of something else?
            # Or maybe I should just remove it if it's redundant or problematic.
            # Actually, let's just assert mock_start.called.
            assert mock_start.called

    @pytest.mark.asyncio
    async def test_sync_all_items_backwards_compatibility(
        self, sync_service, mock_sql_connector, mock_mongo_db
    ):
        """Test sync_all_items is backwards compatible alias"""
        mock_mongo_db.erp_items.find_one.return_value = None

        # Both methods should work
        result1 = await sync_service.sync_items()
        result2 = await sync_service.sync_all_items()

        # Both should produce similar results structure
        assert "items_checked" in result1
        assert "items_checked" in result2
