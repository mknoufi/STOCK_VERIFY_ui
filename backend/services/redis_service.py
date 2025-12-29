"""
Redis Service - Connection management and utilities
Provides connection pooling, health checks, and utility methods
"""

import asyncio
import logging
from typing import Optional, Union

from redis.asyncio import Redis
from redis.asyncio.connection import ConnectionPool

from backend.config import settings

logger = logging.getLogger(__name__)


class RedisService:
    """
    Redis service with connection pooling and health monitoring
    """

    def __init__(
        self,
        host: str = None,
        port: int = None,
        db: int = 0,
        password: Optional[str] = None,
        max_connections: int = 50,
        decode_responses: bool = True,
    ):
        self.host = host or getattr(settings, "REDIS_HOST", "localhost")
        self.port = port or getattr(settings, "REDIS_PORT", 6379)
        self.db = db
        self.password = password or getattr(settings, "REDIS_PASSWORD", None)
        self.max_connections = max_connections
        self.decode_responses = decode_responses

        self._pool: Optional[ConnectionPool] = None
        self._client: Optional[Redis] = None
        self._is_connected = False

    async def connect(self) -> None:
        """Initialize Redis connection pool"""
        try:
            self._pool = ConnectionPool(
                host=self.host,
                port=self.port,
                db=self.db,
                password=self.password,
                max_connections=self.max_connections,
                decode_responses=self.decode_responses,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )

            self._client = Redis(connection_pool=self._pool)

            # Test connection
            await self._client.ping()  # type: ignore
            self._is_connected = True

            logger.info(
                f"✓ Redis connected: {self.host}:{self.port} (db={self.db}, "
                f"pool_size={self.max_connections})"
            )

        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            self._is_connected = False
            raise

    async def disconnect(self) -> None:
        """Close Redis connection pool"""
        if self._client:
            await self._client.aclose()
            self._is_connected = False
            logger.info("Redis disconnected")

    async def health_check(self) -> dict:
        """Check Redis health and return stats"""
        try:
            if not self._client:
                return {"status": "disconnected", "error": "Client not initialized"}

            # Ping test
            start = asyncio.get_event_loop().time()
            await self._client.ping()  # type: ignore
            latency = (asyncio.get_event_loop().time() - start) * 1000

            # Get info
            info = await self._client.info()

            return {
                "status": "healthy",
                "connected": self._is_connected,
                "latency_ms": round(latency, 2),
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "uptime_seconds": info.get("uptime_in_seconds"),
                "version": info.get("redis_version"),
            }

        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return {"status": "unhealthy", "error": str(e)}

    @property
    def client(self) -> Redis:
        """Get Redis client instance"""
        if not self._client:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        return self._client

    @property
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        return self._is_connected

    # Utility methods

    async def get(self, key: str) -> Optional[str]:
        """Get value by key"""
        return await self.client.get(key)

    async def set(
        self,
        key: str,
        value: Union[str, int, float],
        ex: Optional[int] = None,
        px: Optional[int] = None,
        nx: bool = False,
        xx: bool = False,
    ) -> bool:
        """
        Set key-value with optional expiration

        Args:
            key: Key name
            value: Value to set
            ex: Expiration in seconds
            px: Expiration in milliseconds
            nx: Only set if key doesn't exist (SETNX)
            xx: Only set if key exists
        """
        return await self.client.set(key, value, ex=ex, px=px, nx=nx, xx=xx)  # type: ignore

    async def delete(self, *keys: str) -> int:
        """Delete one or more keys"""
        return await self.client.delete(*keys)

    async def exists(self, *keys: str) -> int:
        """Check if keys exist"""
        return await self.client.exists(*keys)

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on key"""
        return await self.client.expire(key, seconds)

    async def ttl(self, key: str) -> int:
        """Get time to live for key"""
        return await self.client.ttl(key)

    async def incr(self, key: str) -> int:
        """Increment key value"""
        return await self.client.incr(key)

    async def decr(self, key: str) -> int:
        """Decrement key value"""
        return await self.client.decr(key)

    async def hget(self, name: str, key: str) -> Optional[str]:
        """Get hash field value"""
        return await self.client.hget(name, key)  # type: ignore

    async def hset(self, name: str, key: str, value: Union[str, int, float]) -> int:
        """Set hash field value"""
        return await self.client.hset(name, key, value)  # type: ignore

    async def hgetall(self, name: str) -> dict:
        """Get all hash fields"""
        return await self.client.hgetall(name)  # type: ignore

    async def hdel(self, name: str, *keys: str) -> int:
        """Delete hash fields"""
        return await self.client.hdel(name, *keys)  # type: ignore

    async def sadd(self, name: str, *values: str) -> int:
        """Add members to set"""
        return await self.client.sadd(name, *values)  # type: ignore

    async def smembers(self, name: str) -> "set[str]":
        """Get all set members"""
        return await self.client.smembers(name)  # type: ignore

    async def srem(self, name: str, *values: str) -> int:
        """Remove members from set"""
        return await self.client.srem(name, *values)  # type: ignore

    async def zadd(self, name: str, mapping: dict, nx: bool = False) -> int:
        """Add members to sorted set"""
        return await self.client.zadd(name, mapping, nx=nx)  # type: ignore

    async def zrange(
        self, name: str, start: int, end: int, withscores: bool = False
    ) -> list:
        """Get sorted set range"""
        return await self.client.zrange(name, start, end, withscores=withscores)  # type: ignore

    async def publish(self, channel: str, message: str) -> int:
        """Publish message to channel"""
        return await self.client.publish(channel, message)  # type: ignore

    async def pipeline(self):
        """Create pipeline for batch operations"""
        return self.client.pipeline()


# Global instance
redis_service = RedisService()


async def get_redis():
    """Dependency injection for Redis service"""
    if not redis_service.is_connected:
        await redis_service.connect()
    return redis_service


async def init_redis() -> RedisService:
    """Initialize Redis service on startup"""
    await redis_service.connect()
    return redis_service


async def close_redis() -> None:
    """Close Redis connection on shutdown"""
    await redis_service.disconnect()
