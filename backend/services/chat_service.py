import asyncio
import logging
import os
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from backend.auth.dependencies import auth_deps

logger = logging.getLogger(__name__)


class ChatService:
    """Minimal chat service with Mongo persistence and streaming responses.

    This intentionally defaults to an "echo" agent so it works without any LLM
    credentials. You can later swap `_stream_agent_response` with a real LLM.
    """

    def __init__(self):
        self._db = auth_deps.db
        self._provider = os.getenv("CHAT_PROVIDER", "echo").strip().lower()

    async def ensure_conversation(self, conversation_id: str, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        await self._db.chat_conversations.update_one(
            {"_id": conversation_id, "user_id": user_id},
            {
                "$setOnInsert": {
                    "_id": conversation_id,
                    "user_id": user_id,
                    "created_at": now,
                },
                "$set": {"updated_at": now},
            },
            upsert=True,
        )

    async def append_message(
        self,
        *,
        conversation_id: str,
        user_id: str,
        role: str,
        content: str,
        message_id: Optional[str] = None,
        meta: Optional[dict[str, Any]] = None,
    ) -> str:
        now = datetime.now(timezone.utc)
        message_id = message_id or uuid4().hex

        doc: dict[str, Any] = {
            "_id": message_id,
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "created_at": now,
        }
        if meta:
            doc["meta"] = meta

        await self.ensure_conversation(conversation_id, user_id)
        await self._db.chat_messages.insert_one(doc)
        await self._db.chat_conversations.update_one(
            {"_id": conversation_id, "user_id": user_id},
            {"$set": {"updated_at": now}},
        )
        return message_id

    async def stream_assistant_response(
        self,
        *,
        user: dict[str, Any],
        conversation_id: str,
        user_message: str,
        assistant_message_id: str,
    ) -> AsyncIterator[str]:
        """Stream assistant response as text deltas."""
        try:
            async for delta in self._stream_agent_response(
                user=user,
                prompt=user_message,
            ):
                yield delta
        except Exception:
            logger.exception("Chat agent failed")
            raise

    async def _stream_agent_response(
        self, *, user: dict[str, Any], prompt: str
    ) -> AsyncIterator[str]:
        """Default agent: echo the prompt.

        Replace this with a real LLM integration later.
        """
        _ = user

        provider = self._provider
        if provider != "echo":
            logger.warning("Unknown CHAT_PROVIDER=%s; using echo", provider)
        text = f"Echo: {prompt}".strip()

        # Stream small chunks to mimic token streaming.
        chunk_size = 12
        for i in range(0, len(text), chunk_size):
            await asyncio.sleep(0)  # allow cooperative scheduling
            yield text[i : i + chunk_size]
