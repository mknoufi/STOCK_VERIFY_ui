"""
Unit tests for WebSocket Manager (Core)
"""

from unittest.mock import AsyncMock

import pytest
from fastapi import WebSocket

from backend.core.websocket_manager import WebSocketManager


@pytest.fixture
def manager():
    return WebSocketManager()


@pytest.fixture
def mock_websocket():
    ws = AsyncMock(spec=WebSocket)
    return ws


@pytest.mark.asyncio
async def test_connect(manager, mock_websocket):
    user_id = "user1"
    session_id = "session1"

    await manager.connect(mock_websocket, user_id, session_id)

    assert user_id in manager.active_connections
    assert mock_websocket in manager.active_connections[user_id]
    assert session_id in manager.session_connections
    assert mock_websocket in manager.session_connections[session_id]
    mock_websocket.accept.assert_called_once()


@pytest.mark.asyncio
async def test_disconnect(manager, mock_websocket):
    user_id = "user1"
    session_id = "session1"
    await manager.connect(mock_websocket, user_id, session_id)

    manager.disconnect(mock_websocket, user_id, session_id)

    assert user_id not in manager.active_connections
    assert session_id not in manager.session_connections


@pytest.mark.asyncio
async def test_send_personal_message(manager, mock_websocket):
    user_id = "user1"
    await manager.connect(mock_websocket, user_id)

    message = {"type": "test", "data": "hello"}
    await manager.send_personal_message(message, user_id)

    mock_websocket.send_json.assert_called_with(message)


@pytest.mark.asyncio
async def test_broadcast_to_session(manager):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)
    session_id = "session1"

    await manager.connect(ws1, "user1", session_id)
    await manager.connect(ws2, "user2", session_id)

    message = {"type": "update", "data": "new_count"}
    await manager.broadcast_to_session(message, session_id)

    ws1.send_json.assert_called_with(message)
    ws2.send_json.assert_called_with(message)
