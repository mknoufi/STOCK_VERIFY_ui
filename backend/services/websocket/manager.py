import json
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from fastapi import WebSocket


@dataclass
class WebSocketConnection:
    websocket: WebSocket
    user_id: str
    role: str
    connected_at: datetime
    last_ping: datetime
    device_id: Optional[str] = None


class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocketConnection] = []

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        role: str,
        device_id: Optional[str] = None,
    ):
        await websocket.accept()
        connection = WebSocketConnection(
            websocket=websocket,
            user_id=user_id,
            role=role,
            connected_at=datetime.utcnow(),
            last_ping=datetime.utcnow(),
            device_id=device_id,
        )
        self.active_connections.append(connection)

    def disconnect(self, websocket: WebSocket):
        self.active_connections = [
            c for c in self.active_connections if c.websocket != websocket
        ]

    async def broadcast(self, message: dict, target_roles: Optional[list[str]] = None):
        json_message = json.dumps(message, default=str)
        to_remove = []
        for connection in self.active_connections:
            if target_roles and connection.role not in target_roles:
                continue
            try:
                await connection.websocket.send_text(json_message)
            except Exception:
                to_remove.append(connection.websocket)

        for ws in to_remove:
            self.disconnect(ws)


manager = WebSocketManager()
