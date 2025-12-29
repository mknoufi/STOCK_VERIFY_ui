import logging

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        # active_connections: { user_id: [WebSocket, ...] }
        self.active_connections: dict[str, list[WebSocket]] = {}
        # session_connections: { session_id: [WebSocket, ...] }
        self.session_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, session_id: str = None):
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

        if session_id:
            if session_id not in self.session_connections:
                self.session_connections[session_id] = []
            self.session_connections[session_id].append(websocket)

        logger.info(f"WebSocket connected: user={user_id}, session={session_id}")

    def disconnect(self, websocket: WebSocket, user_id: str, session_id: str = None):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

        if session_id and session_id in self.session_connections:
            if websocket in self.session_connections[session_id]:
                self.session_connections[session_id].remove(websocket)
            if not self.session_connections[session_id]:
                del self.session_connections[session_id]

        logger.info(f"WebSocket disconnected: user={user_id}, session={session_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

    async def broadcast_to_session(self, message: dict, session_id: str):
        if session_id in self.session_connections:
            for connection in self.session_connections[session_id]:
                await connection.send_json(message)

    async def broadcast_all(self, message: dict):
        for user_connections in self.active_connections.values():
            for connection in user_connections:
                await connection.send_json(message)


manager = WebSocketManager()
