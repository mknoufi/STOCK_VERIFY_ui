import json
import logging
from typing import Any, Optional

import redis.asyncio as redis

from backend.config import settings

logger = logging.getLogger(__name__)


class RedisCacheService:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        if settings.REDIS_URL:
            self.redis = redis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
        else:
            logger.warning("REDIS_URL not set. Caching disabled.")

    async def get(self, key: str) -> Optional[Any]:
        if not self.redis:
            return None
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.error(f"Redis get error: {e}")
        return None

    async def set(self, key: str, value: Any, expire: int = 3600):
        if not self.redis:
            return
        try:
            await self.redis.set(key, json.dumps(value, default=str), ex=expire)
        except Exception as e:
            logger.error(f"Redis set error: {e}")

    async def delete(self, key: str):
        if not self.redis:
            return
        try:
            await self.redis.delete(key)
        except Exception as e:
            logger.error(f"Redis delete error: {e}")

    async def clear_prefix(self, prefix: str):
        if not self.redis:
            return
        try:
            keys = await self.redis.keys(f"{prefix}*")
            if keys:
                await self.redis.delete(*keys)
        except Exception as e:
            logger.error(f"Redis clear_prefix error: {e}")

    async def close(self):
        if self.redis:
            await self.redis.close()


cache_service = RedisCacheService()
