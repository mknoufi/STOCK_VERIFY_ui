"""
Unit tests for WebSocket Connection Manager
"""

from unittest.mock import AsyncMock

import pytest
from fastapi import WebSocket

from backend.services.websocket_service import ConnectionManager


@pytest.fixture
def manager():
    return ConnectionManager()


@pytest.fixture
def mock_websocket():
    ws = AsyncMock(spec=WebSocket)
    return ws


@pytest.mark.asyncio
async def test_connect(manager, mock_websocket):
    user_id = "user1"
    role = "staff"

    await manager.connect(mock_websocket, user_id, role)

    assert user_id in manager.active_connections
    assert mock_websocket in manager.active_connections[user_id]
    assert manager.user_roles[user_id] == role
    mock_websocket.accept.assert_called_once()


@pytest.mark.asyncio
async def test_disconnect(manager, mock_websocket):
    user_id = "user1"
    role = "staff"
    await manager.connect(mock_websocket, user_id, role)

    manager.disconnect(mock_websocket, user_id)

    assert user_id not in manager.active_connections
    assert user_id not in manager.user_roles


@pytest.mark.asyncio
async def test_send_personal_message(manager, mock_websocket):
    user_id = "user1"
    await manager.connect(mock_websocket, user_id, "staff")

    message = {"type": "test", "data": "hello"}
    await manager.send_personal_message(message, user_id)

    mock_websocket.send_json.assert_called_with(message)


@pytest.mark.asyncio
async def test_broadcast(manager):
    ws1 = AsyncMock(spec=WebSocket)
    ws2 = AsyncMock(spec=WebSocket)

    await manager.connect(ws1, "user1", "staff")
    await manager.connect(ws2, "user2", "supervisor")

    message = {"type": "broadcast", "data": "all"}
    await manager.broadcast(message)

    ws1.send_json.assert_called_with(message)
    ws2.send_json.assert_called_with(message)


@pytest.mark.asyncio
async def test_broadcast_to_role(manager):
    ws_staff = AsyncMock(spec=WebSocket)
    ws_supervisor = AsyncMock(spec=WebSocket)

    await manager.connect(ws_staff, "user1", "staff")
    await manager.connect(ws_supervisor, "user2", "supervisor")

    message = {"type": "role_msg", "data": "supervisors only"}
    await manager.broadcast_to_role(message, "supervisor")

    ws_supervisor.send_json.assert_called_with(message)
    ws_staff.send_json.assert_not_called()
