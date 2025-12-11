"""
Test Stock Verification Feature
"""

from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_db():
    """Mock MongoDB database"""
    db = MagicMock()
    db.count_lines = MagicMock()
    db.count_lines.find_one = AsyncMock()
    db.count_lines.update_one = AsyncMock()
    db.count_lines.find = AsyncMock()
    db.count_lines.count_documents = AsyncMock()
    return db


@pytest.fixture(autouse=True)
def override_server_db(monkeypatch, mock_db):
    """Ensure backend.server uses the mock DB for all tests in this module."""
    monkeypatch.setattr("backend.server.db", mock_db)


@pytest.fixture
def mock_current_user():
    """Mock current user (supervisor)"""
    return {
        "username": "supervisor",
        "role": "supervisor",
        "full_name": "Test Supervisor",
    }


@pytest.fixture
def mock_count_line():
    """Mock count line data"""
    return {
        "id": "test-line-id",
        "session_id": "test-session-id",
        "item_code": "ITEM001",
        "item_name": "Test Item",
        "verified": False,
        "verified_at": None,
        "verified_by": None,
        "status": "pending",
    }


@pytest.mark.asyncio
async def test_verify_stock_supervisor_only(mock_db, mock_current_user, mock_count_line):
    """Test that only supervisors can verify stock"""
    from backend.server import verify_stock

    # Mock staff user
    staff_user = {"username": "staff1", "role": "staff"}

    # Setup mock
    mock_db.count_lines.find_one = AsyncMock(return_value=mock_count_line)
    mock_db.count_lines.update_one = AsyncMock(return_value=MagicMock(modified_count=1))

    # Should raise 403 for staff
    with pytest.raises(Exception):  # HTTPException will be raised
        await verify_stock("test-line-id", staff_user)


@pytest.mark.asyncio
async def test_verify_stock_updates_fields(mock_db, mock_current_user, mock_count_line):
    """Test that verify_stock updates correct fields"""
    from backend.server import verify_stock

    # Setup mocks
    mock_db.count_lines.find_one = AsyncMock(return_value=mock_count_line)
    update_result = MagicMock(modified_count=1)
    mock_db.count_lines.update_one = AsyncMock(return_value=update_result)

    # Mock activity log service
    with patch("backend.server.activity_log_service") as mock_activity:
        mock_activity.log_activity = AsyncMock()

        # Call verify_stock
        await verify_stock("test-line-id", mock_current_user)

        # Verify update was called with correct fields
        call_args = mock_db.count_lines.update_one.call_args
        assert call_args is not None
        update_doc = call_args[1]["update"]
        update_op = update_doc["$set"]
        assert update_op["verified"] is True
        assert update_op["verified_by"] == "supervisor"
        assert "verified_at" in update_op

        # Verify activity was logged
        mock_activity.log_activity.assert_called_once()


@pytest.mark.asyncio
async def test_unverify_stock_removes_verification(mock_db, mock_current_user):
    """Test that unverify_stock removes verification"""
    from backend.server import unverify_stock

    verified_line = {
        "id": "test-line-id",
        "verified": True,
        "verified_by": "supervisor",
        "verified_at": datetime.utcnow(),
    }

    mock_db.count_lines.find_one = AsyncMock(return_value=verified_line)
    update_result = MagicMock(modified_count=1)
    mock_db.count_lines.update_one = AsyncMock(return_value=update_result)

    with patch("backend.server.activity_log_service") as mock_activity:
        mock_activity.log_activity = AsyncMock()

        await unverify_stock("test-line-id", mock_current_user)

        # Verify update was called
        call_args = mock_db.count_lines.update_one.call_args
        assert call_args is not None
        update_doc = call_args[1]["update"]
        update_op = update_doc["$set"]
        assert update_op["verified"] is False
        assert update_op["verified_by"] is None
        assert update_op["verified_at"] is None


@pytest.mark.asyncio
async def test_get_count_lines_with_verification_filter(mock_db, mock_current_user):
    """Test that get_count_lines filters by verification status"""
    from backend.server import get_count_lines

    # Mock count documents
    mock_db.count_lines.count_documents = AsyncMock(return_value=10)

    # Mock find cursor
    mock_cursor = MagicMock()
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.skip = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(return_value=[])
    mock_db.count_lines.find = MagicMock(return_value=mock_cursor)

    # Test with verified=True filter
    await get_count_lines("test-session-id", mock_current_user, page=1, page_size=50, verified=True)

    # Verify filter was applied
    find_call = mock_db.count_lines.find.call_args
    assert find_call is not None
    filter_query = find_call[0][0]
    assert filter_query["verified"] is True
    assert filter_query["session_id"] == "test-session-id"

    # Test with verified=False filter
    await get_count_lines(
        "test-session-id", mock_current_user, page=1, page_size=50, verified=False
    )

    find_call = mock_db.count_lines.find.call_args
    filter_query = find_call[0][0]
    assert filter_query["verified"] is False


def test_verification_fields_in_count_line_creation():
    """Test that new count lines have verification fields"""

    # This is a structural test - verify the fields are set in the code
    server_file = Path(__file__).parent.parent / "server.py"
    content = server_file.read_text(encoding="utf-8")

    # Check for verification fields in count line creation
    assert '"verified": False' in content or "'verified': False" in content
    assert "verified_at" in content
    assert "verified_by" in content
