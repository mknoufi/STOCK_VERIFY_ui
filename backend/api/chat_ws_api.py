import json
import logging
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from backend.auth.dependencies import JWTValidator, UserRepository
from backend.services.chat_service import ChatService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _authenticate_ws_user(token: str) -> Optional[dict[str, Any]]:
    try:
        payload = JWTValidator.decode_token(token)
    except Exception:
        return None

    username = payload.get("sub")
    if not username:
        return None

    user = await UserRepository.get_user_by_username(username)
    return user


@router.websocket("/ws")
async def chat_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    conversation_id: Optional[str] = Query(None),
):
    """Authenticated WebSocket chat with streaming responses.

    Client connects with:
    `ws(s)://<host>/api/chat/ws?token=<jwt>&conversation_id=<optional>`

    Message protocol:
    - Client: {"type":"user_message","content":"..."}
    - Server: {"type":"text_delta","message_id":"...","content":"..."}
    """

    requested_conversation_id = conversation_id

    user = await _authenticate_ws_user(token)
    if not user:
        await websocket.accept()
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "error": "unauthorized",
                    "detail": "Invalid or missing token",
                    "conversation_id": requested_conversation_id,
                    "message_id": None,
                }
            )
        except Exception:
            pass
        await websocket.close(code=1008)
        return

    await websocket.accept()

    user_id = str(user.get("_id") or user.get("username") or "")
    if not user_id:
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "error": "unauthorized",
                    "detail": "User not found",
                    "conversation_id": requested_conversation_id,
                    "message_id": None,
                }
            )
        except Exception:
            pass
        await websocket.close(code=1008)
        return

    conversation_id = conversation_id or uuid4().hex

    service = ChatService()

    current_message_id: Optional[str] = None

    await websocket.send_json(
        {
            "type": "connected",
            "conversation_id": conversation_id,
            "user": {
                "username": user.get("username"),
                "role": user.get("role"),
            },
        }
    )

    try:
        while True:
            raw = await websocket.receive_text()

            content: Optional[str] = None
            try:
                msg = json.loads(raw)
                if isinstance(msg, dict) and msg.get("type") == "user_message":
                    content = msg.get("content")
                elif isinstance(msg, dict) and isinstance(msg.get("content"), str):
                    content = msg.get("content")
            except Exception:
                # Treat as plain text.
                content = raw

            if not content or not isinstance(content, str):
                await websocket.send_json(
                    {
                        "type": "error",
                        "error": "invalid_message",
                        "detail": "Expected a user_message with string content",
                        "conversation_id": conversation_id,
                        "message_id": None,
                    }
                )
                continue

            user_message_id = uuid4().hex
            await service.append_message(
                conversation_id=conversation_id,
                user_id=user_id,
                role="user",
                content=content,
                message_id=user_message_id,
            )

            assistant_message_id = uuid4().hex
            current_message_id = assistant_message_id
            await websocket.send_json(
                {
                    "type": "assistant_start",
                    "conversation_id": conversation_id,
                    "message_id": assistant_message_id,
                }
            )

            full = ""
            async for delta in service.stream_assistant_response(
                user=user,
                conversation_id=conversation_id,
                user_message=content,
                assistant_message_id=assistant_message_id,
            ):
                full += delta
                await websocket.send_json(
                    {
                        "type": "text_delta",
                        "conversation_id": conversation_id,
                        "message_id": assistant_message_id,
                        "content": delta,
                    }
                )

            await service.append_message(
                conversation_id=conversation_id,
                user_id=user_id,
                role="assistant",
                content=full,
                message_id=assistant_message_id,
            )

            await websocket.send_json(
                {
                    "type": "assistant_end",
                    "conversation_id": conversation_id,
                    "message_id": assistant_message_id,
                }
            )

    except WebSocketDisconnect:
        logger.info("Chat websocket disconnected", extra={"user_id": user_id})
    except Exception as e:
        logger.exception("Chat websocket error")
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "error": "server_error",
                    "detail": str(e),
                    "conversation_id": conversation_id,
                    "message_id": current_message_id,
                }
            )
        except Exception:
            pass
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
