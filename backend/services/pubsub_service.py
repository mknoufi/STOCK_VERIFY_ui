"""
Pub/Sub Service - Real-time messaging using Redis
Handles rack updates, session notifications, and global broadcasts
"""

import asyncio
import json
import logging
from collections.abc import Callable
from typing import Any, Optional

from redis.asyncio.client import PubSub

from backend.services.redis_service import RedisService

logger = logging.getLogger(__name__)


def _decode_message_data(data: Any) -> Any:
    """Decode message data from bytes and parse JSON if applicable."""
    if isinstance(data, bytes):
        data = data.decode("utf-8")
    try:
        return json.loads(data)
    except (json.JSONDecodeError, TypeError):
        return data


class PubSubService:
    """
    Redis Pub/Sub service for real-time updates
    Supports multiple channels and message handlers
    """

    def __init__(self, redis_service: RedisService):
        self.redis = redis_service
        self.pubsub: Optional[PubSub] = None
        self.subscribers: dict[str, list] = {}
        self._listen_task: Optional[asyncio.Task[None]] = None
        self._is_listening = False

    async def start(self) -> None:
        """Start pub/sub listener"""
        if self._is_listening:
            logger.warning("Pub/Sub already listening")
            return

        try:
            self.pubsub = self.redis.client.pubsub()
            self._is_listening = True
            self._listen_task = asyncio.create_task(self._listen())
            logger.info("✓ Pub/Sub service started")

        except Exception as e:
            logger.error(f"Failed to start Pub/Sub: {str(e)}")
            raise

    async def stop(self) -> None:
        """Stop pub/sub listener"""
        if not self._is_listening:
            return

        self._is_listening = False

        if self._listen_task:
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass

        if self.pubsub:
            await self.pubsub.close()

        logger.info("Pub/Sub service stopped")

    async def _listen(self) -> None:
        """Internal listener loop"""
        try:
            while self._is_listening:
                try:
                    if self.pubsub is None:
                        break
                    await self._process_next_message()
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in pub/sub listener: {str(e)}")
                    await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Pub/Sub listener crashed: {str(e)}")
        finally:
            self._is_listening = False

    async def _process_next_message(self) -> None:
        """Get and process the next message from pub/sub."""
        if self.pubsub is None:
            return

        # Don't try to get messages if we're not subscribed to anything
        # This avoids the "pubsub connection not set" error in redis-py
        if not self.subscribers:
            await asyncio.sleep(1.0)
            return

        try:
            message = await self.pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
        except Exception as e:
            # If we're not actually subscribed yet, just wait
            if "not set" in str(e).lower():
                await asyncio.sleep(1.0)
                return
            raise

        if message and message["type"] == "message":
            channel = message["channel"]
            data = _decode_message_data(message["data"])
            await self._handle_message(channel, data)

    async def _handle_message(self, channel: str, data: Any) -> None:
        """Handle incoming message"""
        handlers = self.subscribers.get(channel, [])

        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(channel, data)
                else:
                    handler(channel, data)
            except Exception as e:
                logger.error(f"Error in message handler for {channel}: {str(e)}")

    async def subscribe(self, channel: str, handler: Callable) -> None:
        """
        Subscribe to a channel with a handler

        Args:
            channel: Channel name
            handler: Callback function(channel, data)
        """
        if not self.pubsub:
            raise RuntimeError("Pub/Sub not started. Call start() first.")

        # Add handler
        if channel not in self.subscribers:
            self.subscribers[channel] = []
        self.subscribers[channel].append(handler)

        # Subscribe to channel
        await self.pubsub.subscribe(channel)
        logger.info(f"✓ Subscribed to channel: {channel}")

    async def unsubscribe(self, channel: str, handler: Optional[Callable] = None) -> None:
        """
        Unsubscribe from a channel

        Args:
            channel: Channel name
            handler: Specific handler to remove (None = remove all)
        """
        if not self.pubsub:
            return

        if handler:
            # Remove specific handler
            if channel in self.subscribers:
                self.subscribers[channel] = [h for h in self.subscribers[channel] if h != handler]
        else:
            # Remove all handlers
            if channel in self.subscribers:
                del self.subscribers[channel]

        # Unsubscribe from Redis if no more handlers
        if channel not in self.subscribers or not self.subscribers[channel]:
            await self.pubsub.unsubscribe(channel)
            logger.info(f"Unsubscribed from channel: {channel}")

    async def publish(self, channel: str, message: Any, serialize: bool = True) -> int:
        """
        Publish message to channel

        Args:
            channel: Channel name
            message: Message data
            serialize: Auto-serialize to JSON (default: True)

        Returns:
            Number of subscribers that received the message
        """
        if serialize and not isinstance(message, str):
            message = json.dumps(message)

        count = await self.redis.publish(channel, message)
        logger.debug(f"Published to {channel}: {count} subscribers")
        return count

    # Convenience methods for common channels

    async def publish_rack_update(self, rack_id: str, event: str, data: dict) -> int:
        """
        Publish rack update

        Args:
            rack_id: Rack identifier
            event: Event type (claimed, released, paused, resumed, completed)
            data: Event data
        """
        channel = f"rack:updates:{rack_id}"
        message = {"event": event, "rack_id": rack_id, "data": data}
        return await self.publish(channel, message)

    async def publish_session_update(self, session_id: str, event: str, data: dict) -> int:
        """
        Publish session update

        Args:
            session_id: Session identifier
            event: Event type (started, paused, resumed, completed)
            data: Event data
        """
        channel = f"session:updates:{session_id}"
        message = {"event": event, "session_id": session_id, "data": data}
        return await self.publish(channel, message)

    async def publish_global_notification(
        self, notification_type: str, message: str, data: Optional[dict] = None
    ) -> int:
        """
        Publish global notification to all users

        Args:
            notification_type: Type (info, warning, error, success)
            message: Notification message
            data: Additional data
        """
        channel = "global:notifications"
        payload = {
            "type": notification_type,
            "message": message,
            "data": data or {},
        }
        return await self.publish(channel, payload)

    async def subscribe_to_rack_updates(self, rack_id: str, handler: Callable) -> None:
        """Subscribe to rack updates"""
        channel = f"rack:updates:{rack_id}"
        await self.subscribe(channel, handler)

    async def subscribe_to_session_updates(self, session_id: str, handler: Callable) -> None:
        """Subscribe to session updates"""
        channel = f"session:updates:{session_id}"
        await self.subscribe(channel, handler)

    async def subscribe_to_global_notifications(self, handler: Callable) -> None:
        """Subscribe to global notifications"""
        channel = "global:notifications"
        await self.subscribe(channel, handler)


# Global instance
_pubsub_service: Optional[PubSubService] = None


def get_pubsub_service(redis_service):
    """Get or create pub/sub service instance"""
    global _pubsub_service
    if _pubsub_service is None:
        _pubsub_service = PubSubService(redis_service)
    return _pubsub_service
