import logging
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from backend.auth.jwt_provider import decode
from backend.config import settings
from backend.core.websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()


def _parse_subprotocols(header_value: Optional[str]) -> list[str]:
    if not header_value:
        return []
    return [p.strip() for p in header_value.split(",") if p.strip()]


def _extract_jwt_from_websocket(
    websocket: WebSocket, token_query: Optional[str]
) -> tuple[Optional[str], Optional[str]]:
    """Extract JWT token from Authorization header, subprotocol, or legacy query param.

    Returns:
        (token, accept_subprotocol) where accept_subprotocol should be echoed back
        in websocket.accept(subprotocol=...) if applicable.
    """
    auth_header = websocket.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip(), None

    subprotocols = _parse_subprotocols(websocket.headers.get("sec-websocket-protocol"))
    if len(subprotocols) >= 2 and subprotocols[0].lower() in {"jwt", "bearer"}:
        return subprotocols[1], subprotocols[0].lower()

    # Some clients may send a single subprotocol; accept it if it looks like a JWT.
    if len(subprotocols) == 1 and subprotocols[0].count(".") == 2:
        return subprotocols[0], None

    # Legacy support (avoid in production; URLs may be logged by intermediaries)
    if token_query:
        return token_query, None

    return None, None


@router.websocket("/ws/updates")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    session_id: Optional[str] = Query(None),
):
    """WebSocket endpoint for real-time updates.

    Only supervisors can connect.
    Authentication supports:
    - Authorization: Bearer <token>
    - Sec-WebSocket-Protocol: jwt,<token> (preferred for browsers/clients without headers)
    - Legacy query param ?token=... (discouraged)
    """
    jwt_token, accept_subprotocol = _extract_jwt_from_websocket(websocket, token)

    if not jwt_token:
        await websocket.accept()
        await websocket.close(code=1008)
        return

    # Authenticate before accepting
    payload = None
    try:
        payload = decode(jwt_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
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
        await manager.connect(
            websocket,
            user_id,
            session_id,
            subprotocol=accept_subprotocol,
        )

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
