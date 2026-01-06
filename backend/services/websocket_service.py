"""
WebSocket Connection Manager Service
Handles real-time connections and broadcasting for stock updates.
"""

import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time updates.
    Supports broadcasting to all users or specific roles (e.g., supervisors).
    """

    def __init__(self) -> None:
        # Store active connections: user_id -> list[WebSocket]
        # A user might be connected from multiple devices/tabs
        self.active_connections: dict[str, list[WebSocket]] = {}
        # Store role mapping: user_id -> role
        self.user_roles: dict[str, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str, role: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        self.user_roles[user_id] = role
        logger.info(f"WebSocket connected: User {user_id} ({role})")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                if user_id in self.user_roles:
                    del self.user_roles[user_id]
        logger.info(f"WebSocket disconnected: User {user_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to a specific user."""
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending personal message to {user_id}: {e}")

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected users."""
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {user_id}: {e}")

    async def broadcast_to_role(self, message: dict, role: str):
        """Broadcast a message to all users with a specific role."""
        for user_id, user_role in self.user_roles.items():
            if user_role == role:
                await self.send_personal_message(message, user_id)


# Global instance
manager = ConnectionManager()
