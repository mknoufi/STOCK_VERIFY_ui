import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from backend.auth.jwt_provider import decode
from backend.config import settings
from backend.core.websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/updates")
async def websocket_endpoint(
    websocket: WebSocket, token: str = Query(...), session_id: str = Query(None)
):
    """WebSocket endpoint for real-time updates.

    Only supervisors can connect. Authentication is done via JWT token in query params.
    """
    # Authenticate before accepting
    payload = None
    try:
        if not settings.JWT_SECRET:
            raise ValueError("JWT_SECRET is not configured")
        payload = decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except Exception as e:
        logger.warning(f"WebSocket auth failed: {str(e)}")

    if not payload:
        # Accept then immediately close with policy violation code
        await websocket.accept()
        await websocket.close(code=1008)
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.accept()
        await websocket.close(code=1008)
        return

    # T076: Restrict WebSocket updates to Supervisors only
    role = payload.get("role", "").lower()
    if role != "supervisor":
        logger.warning(
            f"WebSocket connection rejected for user {user_id}: Role '{role}' is not 'supervisor'"
        )
        await websocket.accept()
        await websocket.close(code=1008)
        return

    # Authentication successful - connect via manager (which calls accept)
    try:
        await manager.connect(websocket, user_id, session_id)

        while True:
            # Keep connection alive and listen for client messages if needed
            await websocket.receive_text()
            # For now, we just echo or ignore. Real logic would go here.
            # await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id, session_id)
        logger.info(f"Client disconnected: {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket, user_id, session_id)
        try:
            await websocket.close(code=1011)  # Internal Error
        except Exception:
            pass
