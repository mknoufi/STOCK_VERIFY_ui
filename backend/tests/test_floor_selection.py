from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.api.schemas import CountLineCreate


@pytest.fixture
def mock_db():
    """Mock MongoDB database"""
    db = MagicMock()
    db.sessions = MagicMock()
    db.erp_items = MagicMock()
    db.count_lines = MagicMock()

    db.sessions.find_one = AsyncMock()
    db.erp_items.find_one = AsyncMock()
    db.count_lines.count_documents = AsyncMock()
    db.count_lines.insert_one = AsyncMock()
    db.count_lines.aggregate = MagicMock()

    # Mock aggregate to return an object with to_list
    mock_cursor = AsyncMock()
    mock_cursor.to_list = AsyncMock(return_value=[{"total_items": 1, "total_variance": 0}])
    db.count_lines.aggregate.return_value = mock_cursor

    return db


@pytest.fixture(autouse=True)
def override_server_db(monkeypatch, mock_db):
    """Ensure backend.server uses the mock DB for all tests in this module."""
    monkeypatch.setattr("backend.server.db", mock_db)


@pytest.fixture
def mock_current_user():
    return {"username": "testuser", "role": "staff"}


@pytest.mark.asyncio
async def test_create_count_line_saves_floor_no(mock_db, mock_current_user):
    """Test that creating a count line saves the floor_no correctly"""
    from fastapi import Request

    from backend.server import create_count_line

    # Setup mocks
    mock_db.sessions.find_one.return_value = {"session_id": "test-session"}
    mock_db.erp_items.find_one.return_value = {
        "item_code": "ITEM001",
        "item_name": "Test Item",
        "barcode": "123456",
        "stock_qty": 10,
        "mrp": 100,
    }
    mock_db.count_lines.count_documents.return_value = 0

    # Input data with floor_no
    line_data = CountLineCreate(
        session_id="test-session",
        item_code="ITEM001",
        counted_qty=10,
        floor_no="First Floor",
        rack_no="R1",
    )

    # Mock request
    mock_request = MagicMock(spec=Request)

    # Call function
    await create_count_line(mock_request, line_data, mock_current_user)

    # Verify insert_one was called with correct floor_no
    call_args = mock_db.count_lines.insert_one.call_args
    assert call_args is not None
    inserted_doc = call_args[0][0]
    assert inserted_doc["floor_no"] == "First Floor"
    assert inserted_doc["rack_no"] == "R1"

    # Verify erp_items.update_one was called to update location
    mock_db.erp_items.update_one.assert_called_once()
    update_args = mock_db.erp_items.update_one.call_args
    assert update_args[0][0] == {"item_code": "ITEM001"}
    assert update_args[0][1] == {"$set": {"floor_no": "First Floor", "rack_no": "R1"}}

    assert inserted_doc["floor_no"] == "First Floor"
    assert inserted_doc["rack_no"] == "R1"
    assert inserted_doc["item_code"] == "ITEM001"
