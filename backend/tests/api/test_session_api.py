import pytest
from unittest.mock import MagicMock, AsyncMock
from fastapi import HTTPException
from backend.api.session_api import (
    init_session_api,
    create_session,
    get_sessions,
    SessionCreate,
)


@pytest.fixture(autouse=True)
def setup_mocks():
    mock_db = AsyncMock()
    # Fix: find() should return a cursor synchronously, not a coroutine
    mock_db.sessions.find = MagicMock()

    mock_activity_log_service = AsyncMock()
    init_session_api(mock_db, mock_activity_log_service)
    return mock_db, mock_activity_log_service


@pytest.mark.asyncio
async def test_create_session_success(setup_mocks):
    mock_db, mock_activity_log_service = setup_mocks

    request = MagicMock()
    request.client.host = "127.0.0.1"
    request.headers.get.return_value = "test-agent"

    session_data = SessionCreate(warehouse="Test Warehouse", type="STANDARD")
    current_user = {"username": "testuser", "full_name": "Test User", "role": "staff"}

    session = await create_session(request, session_data, current_user)

    assert session.warehouse == "Test Warehouse"
    assert session.staff_user == "testuser"
    assert session.staff_name == "Test User"
    assert session.type == "STANDARD"

    mock_db.sessions.insert_one.assert_called_once()
    mock_activity_log_service.log_activity.assert_called_once()


@pytest.mark.asyncio
async def test_create_session_invalid_warehouse(setup_mocks):
    mock_db, _ = setup_mocks
    request = MagicMock()
    current_user = {"username": "testuser", "full_name": "Test User", "role": "staff"}

    # Empty warehouse
    with pytest.raises(HTTPException) as exc:
        await create_session(request, SessionCreate(warehouse=""), current_user)
    assert exc.value.status_code == 400

    # Too short
    with pytest.raises(HTTPException) as exc:
        await create_session(request, SessionCreate(warehouse="A"), current_user)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_get_sessions_supervisor(setup_mocks):
    mock_db, _ = setup_mocks

    current_user = {"username": "admin", "role": "supervisor"}

    mock_db.sessions.count_documents.return_value = 10

    # Setup cursor chain
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.skip.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor

    # Mock data with required fields
    mock_sessions = [
        {
            "id": "1",
            "warehouse": "W1",
            "staff_user": "u1",
            "staff_name": "n1",
            "type": "STANDARD",
            "status": "ACTIVE",
            "created_at": "2023-01-01T00:00:00",
        },
        {
            "id": "2",
            "warehouse": "W2",
            "staff_user": "u2",
            "staff_name": "n2",
            "type": "STANDARD",
            "status": "ACTIVE",
            "created_at": "2023-01-01T00:00:00",
        },
    ]
    mock_cursor.to_list = AsyncMock(return_value=mock_sessions)

    mock_db.sessions.find.return_value = mock_cursor

    response = await get_sessions(current_user, page=1, page_size=10)

    assert response["total"] == 10
    assert len(response["items"]) == 2
    assert response["page"] == 1
    assert response["page_size"] == 10

    # Verify query: empty filter for supervisor
    mock_db.sessions.count_documents.assert_called_with({})
    mock_db.sessions.find.assert_called()


@pytest.mark.asyncio
async def test_get_sessions_staff(setup_mocks):
    mock_db, _ = setup_mocks

    current_user = {"username": "staff1", "role": "staff"}

    mock_db.sessions.count_documents.return_value = 5

    # Setup cursor chain
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.skip.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor

    # Mock data with required fields
    mock_sessions = [
        {
            "id": "1",
            "warehouse": "W1",
            "staff_user": "staff1",
            "staff_name": "Staff One",
            "type": "STANDARD",
            "status": "ACTIVE",
            "created_at": "2023-01-01T00:00:00",
        }
    ]
    mock_cursor.to_list = AsyncMock(return_value=mock_sessions)

    mock_db.sessions.find.return_value = mock_cursor

    response = await get_sessions(current_user, page=1, page_size=10)

    assert response["total"] == 5
    assert len(response["items"]) == 1

    # Verify query: filter by username for staff
    mock_db.sessions.count_documents.assert_called_with({"staff_user": "staff1"})
    mock_db.sessions.find.assert_called()
    call_args = mock_db.sessions.find.call_args
    assert call_args[0][0] == {"staff_user": "staff1"}


@pytest.mark.asyncio
async def test_bulk_close_sessions_success(setup_mocks):
    mock_db, mock_activity_log_service = setup_mocks

    current_user = {"username": "admin", "role": "supervisor"}
    session_ids = ["1", "2"]

    mock_db.sessions.update_one.return_value.modified_count = 1

    # Need to import router to test this directly or use the function if it's exported
    # The function is bulk_close_sessions
    from backend.api.session_api import bulk_close_sessions

    response = await bulk_close_sessions(session_ids, current_user)

    assert response["success"] is True
    assert response["updated_count"] == 2
    assert response["total"] == 2
    assert len(response["errors"]) == 0

    assert mock_db.sessions.update_one.call_count == 2
    assert mock_activity_log_service.log_activity.call_count == 2


@pytest.mark.asyncio
async def test_bulk_close_sessions_forbidden(setup_mocks):
    mock_db, _ = setup_mocks

    current_user = {"username": "staff1", "role": "staff"}
    session_ids = ["1"]

    from backend.api.session_api import bulk_close_sessions

    with pytest.raises(HTTPException) as exc:
        await bulk_close_sessions(session_ids, current_user)
    assert exc.value.status_code == 403
