"""
Comprehensive Integration Tests
Tests all implementations including stock verification, activity logs, error logs, help feature
"""

import re
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def mock_db():
    """Mock MongoDB database"""
    db = MagicMock()

    # Collections
    db.users = MagicMock()
    db.sessions = MagicMock()
    db.count_lines = MagicMock()
    db.erp_items = MagicMock()
    db.activity_logs = MagicMock()
    db.error_logs = MagicMock()
    db.erp_sync_metadata = MagicMock()

    # Mock async methods
    for collection_name in [
        "users",
        "sessions",
        "count_lines",
        "erp_items",
        "activity_logs",
        "error_logs",
        "erp_sync_metadata",
    ]:
        collection = getattr(db, collection_name)
        collection.find_one = AsyncMock()
        collection.find = MagicMock()
        collection.insert_one = AsyncMock()
        collection.update_one = AsyncMock()
        collection.count_documents = AsyncMock()

    return db


@pytest.fixture(autouse=True)
def override_server_db(monkeypatch, mock_db):
    """Ensure backend.server uses the mock DB for integration-style tests."""
    monkeypatch.setattr("backend.server.db", mock_db)


@pytest.fixture
def mock_supervisor():
    """Mock supervisor user"""
    return {
        "username": "supervisor",
        "role": "supervisor",
        "full_name": "Test Supervisor",
    }


@pytest.fixture
def mock_staff():
    """Mock staff user"""
    return {"username": "staff1", "role": "staff", "full_name": "Test Staff"}


@pytest.mark.asyncio
async def test_stock_verification_workflow(mock_db, mock_supervisor):
    """Test complete stock verification workflow"""
    from backend.server import get_count_lines, unverify_stock, verify_stock
    from backend.services.activity_log import ActivityLogService

    # Setup
    count_line = {
        "id": "line-1",
        "session_id": "session-1",
        "item_code": "ITEM001",
        "verified": False,
    }

    mock_db.count_lines.find_one = AsyncMock(return_value=count_line)
    mock_db.count_lines.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
    mock_db.count_lines.count_documents = AsyncMock(return_value=1)

    mock_cursor = MagicMock()
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.skip = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(return_value=[count_line])
    mock_db.count_lines.find = MagicMock(return_value=mock_cursor)

    activity_service = ActivityLogService(mock_db)

    with (
        patch("backend.server.activity_log_service", activity_service),
        patch.object(activity_service, "log_activity", new_callable=AsyncMock),
    ):
        # 1. Verify stock
        result = await verify_stock("line-1", mock_supervisor)
        assert result["verified"] is True

        # Verify update was called
        update_call = mock_db.count_lines.update_one.call_args
        update_doc = update_call[1]["update"]
        assert update_doc["$set"]["verified"] is True

        # 2. Get verified items
        result = await get_count_lines("session-1", mock_supervisor, verified=True)
        assert "items" in result
        assert "pagination" in result

        # 3. Unverify stock
        count_line["verified"] = True
        mock_db.count_lines.find_one = AsyncMock(return_value=count_line)
        result = await unverify_stock("line-1", mock_supervisor)
        assert result["verified"] is False


@pytest.mark.asyncio
async def test_activity_logging(mock_db, mock_supervisor):
    """Test activity logging service"""
    from backend.services.activity_log import ActivityLogService

    service = ActivityLogService(mock_db)

    # Mock insert
    mock_db.activity_logs.insert_one = AsyncMock(return_value=MagicMock(inserted_id="log-1"))

    # Log activity
    log_id = await service.log_activity(
        user="supervisor",
        role="supervisor",
        action="verify_stock",
        entity_type="count_line",
        entity_id="line-1",
        status="success",
    )

    assert log_id == "log-1"
    mock_db.activity_logs.insert_one.assert_called_once()

    # Get activities
    mock_db.activity_logs.count_documents = AsyncMock(return_value=1)
    mock_cursor = MagicMock()
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.skip = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(
        return_value=[
            {
                "_id": "log-1",
                "user": "supervisor",
                "action": "verify_stock",
                "timestamp": datetime.utcnow(),
            }
        ]
    )
    mock_db.activity_logs.find = MagicMock(return_value=mock_cursor)

    result = await service.get_activities(user="supervisor")
    assert "activities" in result
    assert "pagination" in result


@pytest.mark.asyncio
async def test_error_logging(mock_db, mock_supervisor):
    """Test error logging service"""
    from backend.services.error_log import ErrorLogService

    service = ErrorLogService(mock_db)

    # Mock insert
    mock_db.error_logs.insert_one = AsyncMock(return_value=MagicMock(inserted_id="error-1"))

    # Log error
    error = ValueError("Test error")
    log_id = await service.log_error(
        error=error, severity="error", endpoint="/test", method="GET", user="supervisor"
    )

    assert log_id == "error-1"
    mock_db.error_logs.insert_one.assert_called_once()

    # Get errors
    mock_db.error_logs.count_documents = AsyncMock(return_value=1)
    mock_cursor = MagicMock()
    mock_cursor.sort = MagicMock(return_value=mock_cursor)
    mock_cursor.skip = MagicMock(return_value=mock_cursor)
    mock_cursor.limit = MagicMock(return_value=mock_cursor)
    mock_cursor.to_list = AsyncMock(
        return_value=[
            {
                "_id": "error-1",
                "error_type": "ValueError",
                "error_message": "Test error",
                "severity": "error",
                "timestamp": datetime.utcnow(),
            }
        ]
    )
    mock_db.error_logs.find = MagicMock(return_value=mock_cursor)

    result = await service.get_errors(severity="error")
    assert "errors" in result
    assert "pagination" in result


@pytest.mark.asyncio
async def test_separation_of_sql_and_mongo(mock_db):
    """Test that SQL Server is read-only and MongoDB handles writes"""
    from backend.services.erp_sync_service import SQLSyncService

    # Mock SQL connector (read-only)
    mock_sql_connector = MagicMock()
    mock_sql_connector.get_all_items = MagicMock(
        return_value=[{"item_code": "ITEM001", "item_name": "Test", "stock_qty": 100}]
    )

    # Mock MongoDB writes
    mock_db.erp_items.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
    # Mock MongoDB read to return a concrete item (avoids MagicMock/coroutine issues)
    mock_db.erp_items.find_one = AsyncMock(
        return_value={"item_code": "ITEM001", "sql_server_qty": 50.0, "stock_qty": 50.0}
    )

    service = SQLSyncService(
        sql_connector=mock_sql_connector,
        mongo_db=mock_db,
        sync_interval=3600,
        enabled=True,
    )

    # Trigger a sync cycle
    await service.sync_items()

    # Verify SQL connector is called for reading
    mock_sql_connector.get_all_items.assert_called_once()

    # Verify MongoDB is used for writing
    mock_db.erp_items.update_one.assert_called()


def test_no_sql_writes_in_codebase():
    """Verify no SQL Server write operations exist in codebase"""

    backend_dir = Path(__file__).parent.parent

    # Files to check
    files_to_check = [
        backend_dir / "server.py",
        backend_dir / "sql_server_connector.py",
        backend_dir / "services" / "erp_sync_service.py",
        backend_dir / "services" / "change_detection_sync.py",
    ]

    write_keywords = ["INSERT", "UPDATE", "DELETE", "CREATE TABLE", "DROP", "ALTER"]

    violations = []
    for file_path in files_to_check:
        if file_path.exists():
            try:
                content = file_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                content = file_path.read_text(encoding="latin-1")
            for keyword in write_keywords:
                # Check for execute statements with write keywords (excluding MongoDB operations)
                # Only check SQL execute patterns, not MongoDB operations
                pattern = rf"(cursor|self\.connection)\.execute\([^)]*{keyword}"
                if re.search(pattern, content, re.IGNORECASE):
                    violations.append(f"{file_path.name}: Found {keyword}")

    assert len(violations) == 0, f"Found SQL write operations: {violations}"
