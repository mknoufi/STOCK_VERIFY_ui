import os

import pytest
from backend.core.websocket_manager import manager
from backend.server import app
from backend.utils.auth_utils import create_access_token
from fastapi.testclient import TestClient

# Test Data
SUPERVISOR_USER = "supervisor_ws"
STAFF_USER = "staff_ws"

# Use the same secret key that the test fixture uses
TEST_JWT_SECRET = os.getenv("JWT_SECRET", "test-jwt-secret-key-for-testing-only")


@pytest.fixture
def client(test_db):
    """
    Create a TestClient.
    We depend on test_db to ensure the app's DB is patched.
    """
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_manager():
    """Reset WebSocket manager state before and after each test."""
    manager.active_connections = {}
    manager.session_connections = {}
    yield
    manager.active_connections = {}
    manager.session_connections = {}


def test_websocket_connect_success(client):
    """Test successful WebSocket connection for supervisor."""
    token = create_access_token(
        data={"sub": SUPERVISOR_USER, "role": "supervisor"}, secret_key=TEST_JWT_SECRET
    )

    with client.websocket_connect(f"/ws/updates?token={token}") as websocket:
        # Connection is established
        assert SUPERVISOR_USER in manager.active_connections
        assert len(manager.active_connections[SUPERVISOR_USER]) == 1

        # Send a message (endpoint just receives and ignores/echoes logic is commented out)
        websocket.send_text("ping")

    # After context manager exit, connection should be closed and removed
    assert SUPERVISOR_USER not in manager.active_connections


def test_websocket_connect_invalid_token(client):
    """Test connection with invalid token.

    Note: When auth fails, the server accepts then immediately closes the connection.
    Starlette TestClient doesn't raise WebSocketDisconnect for graceful closes,
    so we verify by attempting to receive a message which should fail.
    """
    from starlette.websockets import WebSocketDisconnect

    with client.websocket_connect("/ws/updates?token=invalid_token") as ws:
        # Connection was accepted, but should be immediately closed by server
        # Attempting to receive should raise WebSocketDisconnect
        with pytest.raises(WebSocketDisconnect):
            ws.receive_text()


def test_websocket_connect_wrong_role(client):
    """Test connection with non-supervisor role.

    Note: When auth fails, the server accepts then immediately closes the connection.
    Starlette TestClient doesn't raise WebSocketDisconnect for graceful closes,
    so we verify by attempting to receive a message which should fail.
    """
    from starlette.websockets import WebSocketDisconnect

    token = create_access_token(
        data={"sub": STAFF_USER, "role": "staff"}, secret_key=TEST_JWT_SECRET
    )

    with client.websocket_connect(f"/ws/updates?token={token}") as ws:
        # Connection was accepted, but should be immediately closed by server
        # Attempting to receive should raise WebSocketDisconnect
        with pytest.raises(WebSocketDisconnect):
            ws.receive_text()


def test_websocket_manager_broadcast():
    """Test WebSocketManager broadcast logic (unit test without full client)."""
    import asyncio
    from unittest.mock import AsyncMock

    # Mock websockets
    ws1 = AsyncMock()
    ws2 = AsyncMock()

    # Manually add to manager
    manager.active_connections["user1"] = [ws1]
    manager.session_connections["session1"] = [ws1, ws2]

    # Test broadcast_to_session
    message = {"type": "update", "data": "test"}

    # We need to run the async method
    loop = asyncio.new_event_loop()
    loop.run_until_complete(manager.broadcast_to_session(message, "session1"))
    loop.close()

    # Verify send_json called
    ws1.send_json.assert_called_with(message)
    ws2.send_json.assert_called_with(message)
