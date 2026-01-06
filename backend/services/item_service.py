import asyncio
import logging
from typing import Any, Optional

from backend.services.cache.redis_service import RedisCacheService
from backend.sql_server_connector import SQLServerConnector

logger = logging.getLogger(__name__)


class EnhancedItemService:
    def __init__(self, sql_connector: SQLServerConnector, cache_service: RedisCacheService):
        self.sql_connector = sql_connector
        self.cache_service = cache_service
        self.CACHE_TTL = 3600  # 1 hour

    async def get_item_by_barcode(self, barcode: str) -> Optional[dict[str, Any]]:
        cache_key = f"item:barcode:{barcode}"

        # Try cache first
        cached_item = await self.cache_service.get(cache_key)
        if cached_item:
            logger.info(f"Cache hit for barcode: {barcode}")
            return cached_item

        # Fetch from SQL Server
        # Run synchronous SQL call in a separate thread to avoid blocking the event loop
        try:
            loop = asyncio.get_event_loop()
            item = await loop.run_in_executor(None, self.sql_connector.get_item_by_barcode, barcode)

            if item:
                await self.cache_service.set(cache_key, item, self.CACHE_TTL)
                return item

            return None
        except Exception as e:
            logger.error(f"Error fetching item by barcode {barcode}: {e}")
            raise

    async def get_item_by_code(self, item_code: str) -> Optional[dict[str, Any]]:
        cache_key = f"item:code:{item_code}"

        # Try cache first
        cached_item = await self.cache_service.get(cache_key)
        if cached_item:
            logger.info(f"Cache hit for item code: {item_code}")
            return cached_item

        # Fetch from SQL Server
        try:
            loop = asyncio.get_event_loop()
            item = await loop.run_in_executor(None, self.sql_connector.get_item_by_code, item_code)

            if item:
                await self.cache_service.set(cache_key, item, self.CACHE_TTL)
                return item

            return None
        except Exception as e:
            logger.error(f"Error fetching item by code {item_code}: {e}")
            raise

    async def invalidate_cache(
        self, barcode: Optional[str] = None, item_code: Optional[str] = None
    ):
        if barcode:
            await self.cache_service.delete(f"item:barcode:{barcode}")
        if item_code:
            await self.cache_service.delete(f"item:code:{item_code}")
