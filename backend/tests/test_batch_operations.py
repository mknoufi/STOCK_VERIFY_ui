"""
Tests for Batch Operations Service
Verifies batch processing functionality and error handling
"""

from unittest.mock import AsyncMock, Mock

import pytest
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

from backend.services.batch_operations import BatchOperationsService


@pytest.fixture
def mock_db():
    """Mock MongoDB database"""
    db = AsyncMock(spec=AsyncIOMotorDatabase)

    # Mock collections
    test_collection = AsyncMock()
    erp_items = AsyncMock()

    db.test_collection = test_collection
    db.erp_items = erp_items

    # Configure __getitem__ to return collections
    def get_collection(name):
        if name == "test_collection":
            return test_collection
        if name == "erp_items":
            return erp_items
        return AsyncMock()

    db.__getitem__.side_effect = get_collection

    return db


@pytest.fixture
def batch_service(mock_db):
    """Create batch operations service instance"""
    return BatchOperationsService(db=mock_db)


class TestBatchInsert:
    """Test batch insert operations"""

    @pytest.mark.asyncio
    async def test_batch_insert_empty_list(self, batch_service):
        """Test batch insert with empty list"""
        result = await batch_service.batch_insert("test_collection", [])

        assert result["inserted_count"] == 0
        assert result["total"] == 0
        assert result["errors"] == []
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_batch_insert_single_batch(self, batch_service, mock_db):
        """Test batch insert with single batch"""
        documents = [{"_id": i, "name": f"Item {i}"} for i in range(50)]

        # Mock insert_many result
        insert_result = Mock()
        insert_result.inserted_ids = [f"id_{i}" for i in range(50)]
        mock_db.test_collection.insert_many.return_value = insert_result

        result = await batch_service.batch_insert("test_collection", documents)

        assert result["inserted_count"] == 50
        assert result["total"] == 50
        assert result["errors"] == []
        assert result["success"] is True
        assert mock_db.test_collection.insert_many.called

    @pytest.mark.asyncio
    async def test_batch_insert_multiple_batches(self, batch_service, mock_db):
        """Test batch insert with multiple batches"""
        documents = [{"_id": i, "name": f"Item {i}"} for i in range(250)]

        # Mock insert_many result
        insert_result = Mock()
        insert_result.inserted_ids = [f"id_{i}" for i in range(100)]
        mock_db.test_collection.insert_many.return_value = insert_result

        result = await batch_service.batch_insert("test_collection", documents)

        # Should process 3 batches (100, 100, 50)
        assert mock_db.test_collection.insert_many.call_count == 3
        assert result["total"] == 250

    @pytest.mark.asyncio
    async def test_batch_insert_with_errors(self, batch_service, mock_db):
        """Test batch insert handles errors gracefully"""
        documents = [{"_id": i, "name": f"Item {i}"} for i in range(150)]

        # Mock first batch succeeds, second fails
        insert_result_success = Mock()
        insert_result_success.inserted_ids = [f"id_{i}" for i in range(100)]

        mock_db.test_collection.insert_many.side_effect = [
            insert_result_success,
            PyMongoError("Database error"),
        ]

        result = await batch_service.batch_insert("test_collection", documents, ordered=True)

        assert result["inserted_count"] == 100
        assert len(result["errors"]) > 0
        assert result["success"] is False

    @pytest.mark.asyncio
    async def test_batch_insert_unordered_continues_on_error(self, batch_service, mock_db):
        """Test unordered insert continues on error"""
        documents = [{"_id": i, "name": f"Item {i}"} for i in range(250)]

        insert_result = Mock()
        insert_result.inserted_ids = [f"id_{i}" for i in range(100)]

        mock_db.test_collection.insert_many.side_effect = [
            insert_result,
            PyMongoError("Error"),
            insert_result,
        ]

        await batch_service.batch_insert("test_collection", documents, ordered=False)

        # Should continue processing despite error
        assert mock_db.test_collection.insert_many.call_count == 3


class TestBatchUpdate:
    """Test batch update operations"""

    @pytest.mark.asyncio
    async def test_batch_update_empty_list(self, batch_service):
        """Test batch update with empty list"""
        result = await batch_service.batch_update("test_collection", [])

        assert result["updated_count"] == 0
        assert result["total"] == 0
        assert result["errors"] == []
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_batch_update_with_default_operation(self, batch_service, mock_db):
        """Test batch update with default operation"""
        updates = [
            {"filter": {"_id": 1}, "update": {"$set": {"status": "active"}}},
            {"filter": {"_id": 2}, "update": {"$set": {"status": "inactive"}}},
        ]

        # Mock bulk_write result

        update_result = Mock()

        update_result.modified_count = 2

        mock_db.test_collection.bulk_write.return_value = update_result

        result = await batch_service.batch_update("test_collection", updates)

        assert result["updated_count"] == 2

        assert result["total"] == 2

        assert result["errors"] == []

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_batch_update_with_custom_operation(self, batch_service, mock_db):
        """Test batch update with custom operation"""
        updates = [{"item_code": f"ITEM{i:03d}", "qty": i * 10} for i in range(50)]

        async def custom_update(update_data):
            # Custom update logic
            result = Mock()
            result.modified_count = len(update_data)
            return len(update_data)

        result = await batch_service.batch_update(
            "test_collection", updates, update_operation=custom_update
        )

        assert result["updated_count"] == 50
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_batch_update_handles_errors(self, batch_service, mock_db):
        """Test batch update handles errors gracefully"""
        updates = [
            {"filter": {"_id": 1}, "update": {"$set": {"status": "active"}}},
            {"filter": {"_id": 2}, "update": {"$set": {"status": "inactive"}}},
        ]

        # Mock update to raise error
        mock_db.test_collection.bulk_write.side_effect = Exception("Update error")

        result = await batch_service.batch_update("test_collection", updates)

        assert len(result["errors"]) > 0
        assert result["success"] is False


class TestBatchDelete:
    """Test batch delete operations"""

    @pytest.mark.asyncio
    async def test_batch_delete_empty_list(self, batch_service):
        """Test batch delete with empty list"""
        result = await batch_service.batch_delete("test_collection", [])

        assert result["deleted_count"] == 0
        assert result["total"] == 0
        assert result["errors"] == []
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_batch_delete_single_filter(self, batch_service, mock_db):
        """Test batch delete with single filter"""
        filters = [{"_id": 1}]

        delete_result = Mock()
        delete_result.deleted_count = 1
        mock_db.test_collection.delete_many.return_value = delete_result

        result = await batch_service.batch_delete("test_collection", filters)

        assert result["deleted_count"] == 1
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_batch_delete_multiple_filters(self, batch_service, mock_db):
        """Test batch delete with multiple filters"""
        filters = [{"_id": i} for i in range(5)]

        delete_result = Mock()
        delete_result.deleted_count = 5
        mock_db.test_collection.delete_many.return_value = delete_result

        result = await batch_service.batch_delete("test_collection", filters)

        # Should combine filters with $or
        call_args = mock_db.test_collection.delete_many.call_args[0][0]
        assert "$or" in call_args
        assert result["deleted_count"] == 5

    @pytest.mark.asyncio
    async def test_batch_delete_handles_errors(self, batch_service, mock_db):
        """Test batch delete handles errors gracefully"""
        filters = [{"_id": 1}]

        mock_db.test_collection.delete_many.side_effect = PyMongoError("Delete error")

        result = await batch_service.batch_delete("test_collection", filters, ordered=False)
        assert len(result["errors"]) > 0
        assert result["success"] is False


class TestBatchImportItems:
    """Test batch import items operation"""

    @pytest.mark.asyncio
    async def test_batch_import_items_empty_list(self, batch_service):
        """Test batch import with empty list"""
        result = await batch_service.batch_import_items([])

        assert result["imported_count"] == 0
        assert result["total"] == 0
        assert result["errors"] == []
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_batch_import_items_upsert(self, batch_service, mock_db):
        """Test batch import with upsert"""
        items = [
            {
                "item_code": f"ITEM{i:03d}",
                "item_name": f"Item {i}",
                "stock_qty": i * 10,
            }
            for i in range(50)
        ]

        # Mock bulk_write result
        bulk_result = Mock()
        bulk_result.upserted_count = 30
        bulk_result.modified_count = 20
        bulk_result.inserted_count = 0
        mock_db.erp_items.bulk_write.return_value = bulk_result

        result = await batch_service.batch_import_items(items, upsert=True)

        assert result["imported_count"] == 50
        assert result["success"] is True
        assert mock_db.erp_items.bulk_write.called

    @pytest.mark.asyncio
    async def test_batch_import_items_insert_only(self, batch_service, mock_db):
        """Test batch import without upsert"""
        items = [
            {
                "item_code": f"ITEM{i:03d}",
                "item_name": f"Item {i}",
                "stock_qty": i * 10,
            }
            for i in range(50)
        ]

        bulk_result = Mock()
        bulk_result.upserted_count = 0
        bulk_result.modified_count = 0
        bulk_result.inserted_count = 50
        mock_db.erp_items.bulk_write.return_value = bulk_result

        result = await batch_service.batch_import_items(items, upsert=False)

        assert result["imported_count"] == 50
        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_batch_import_items_adds_timestamps(self, batch_service, mock_db):
        """Test batch import adds timestamps"""
        items = [{"item_code": "ITEM001", "item_name": "Test Item"}]

        bulk_result = Mock()
        bulk_result.upserted_count = 1
        bulk_result.modified_count = 0
        bulk_result.inserted_count = 0
        mock_db.erp_items.bulk_write.return_value = bulk_result

        await batch_service.batch_import_items(items, upsert=True)

        # Check that bulk_write was called with operations containing timestamps
        call_args = mock_db.erp_items.bulk_write.call_args
        operations = call_args[0][0]

        assert len(operations) > 0
        # Check that replacement document has timestamps
        # ReplaceOne object stores replacement in _doc attribute (private but needed for verification)
        replacement = operations[0]._doc
        assert "synced_at" in replacement or "updated_at" in replacement

    @pytest.mark.asyncio
    async def test_batch_import_items_handles_errors(self, batch_service, mock_db):
        """Test batch import handles errors gracefully"""
        items = [{"item_code": f"ITEM{i:03d}"} for i in range(150)]

        bulk_result = Mock()
        bulk_result.upserted_count = 0
        bulk_result.modified_count = 0
        bulk_result.inserted_count = 100

        # First batch succeeds, second fails with PyMongoError
        mock_db.erp_items.bulk_write.side_effect = [
            bulk_result,
            PyMongoError("Bulk write error"),
        ]

        result = await batch_service.batch_import_items(items)

        assert len(result["errors"]) > 0
        # Should have imported first batch
        assert result["imported_count"] >= 100


class TestBatchServiceConfiguration:
    """Test batch service configuration"""

    def test_batch_size_default(self, batch_service):
        """Test default batch size"""
        assert batch_service.batch_size == 100

    def test_custom_batch_size(self, mock_db):
        """Test custom batch size"""
        service = BatchOperationsService(db=mock_db)
        service.batch_size = 50
        assert service.batch_size == 50
