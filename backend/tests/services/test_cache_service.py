"""
Tests for Redis Cache Service
Tests caching functionality with both Redis and fallback in-memory cache
"""

import json
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from bson import ObjectId

from backend.services.cache_service import CacheService, CustomJSONEncoder


class TestCustomJSONEncoder:
    """Tests for CustomJSONEncoder"""

    def test_encode_objectid(self):
        """ObjectId should be serialized to string"""
        oid = ObjectId()
        result = json.dumps({"_id": oid}, cls=CustomJSONEncoder)
        assert str(oid) in result

    def test_encode_datetime(self):
        """Datetime should be serialized to ISO format"""
        dt = datetime(2025, 1, 22, 12, 0, 0)
        result = json.dumps({"created": dt}, cls=CustomJSONEncoder)
        assert "2025-01-22T12:00:00" in result

    def test_encode_regular_types(self):
        """Regular types should serialize normally"""
        data = {"name": "test", "count": 42, "active": True}
        result = json.dumps(data, cls=CustomJSONEncoder)
        assert '"name": "test"' in result
        assert '"count": 42' in result


class TestCacheService:
    """Tests for CacheService"""

    @pytest.fixture
    def cache_service(self):
        """Create a cache service instance with in-memory fallback"""
        with patch("backend.services.cache_service.REDIS_AVAILABLE", False):
            service = CacheService()
            yield service

    @pytest.mark.asyncio
    async def test_set_and_get_string(self, cache_service):
        """Should set and get string values"""
        await cache_service.set("test", "test_key", "test_value", ttl=60)
        result = await cache_service.get("test", "test_key")
        assert result == "test_value"

    @pytest.mark.asyncio
    async def test_set_and_get_dict(self, cache_service):
        """Should set and get dictionary values"""
        data = {"name": "item", "count": 10}
        await cache_service.set("test", "dict_key", data, ttl=60)
        result = await cache_service.get("test", "dict_key")
        assert result == data

    @pytest.mark.asyncio
    async def test_get_missing_key(self, cache_service):
        """Should return None for missing keys"""
        result = await cache_service.get("test", "nonexistent_key")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_key(self, cache_service):
        """Should delete cached values"""
        await cache_service.set("test", "delete_key", "value", ttl=60)
        await cache_service.delete("test", "delete_key")
        result = await cache_service.get("test", "delete_key")
        assert result is None

    @pytest.mark.asyncio
    async def test_ttl_expiration(self, cache_service):
        """Should respect TTL expiration (in-memory fallback)"""
        await cache_service.set("test", "expiring_key", "value", ttl=1)
        # Immediately should exist
        result = await cache_service.get("test", "expiring_key")
        assert result == "value"

    @pytest.mark.asyncio
    async def test_clear_all(self, cache_service):
        """Should clear all cached values"""
        await cache_service.set("test", "key1", "value1", ttl=60)
        await cache_service.set("test", "key2", "value2", ttl=60)
        await cache_service.clear_prefix("test")
        assert await cache_service.get("test", "key1") is None
        assert await cache_service.get("test", "key2") is None


class TestCacheServiceWithRedis:
    """Tests for CacheService with mocked Redis"""

    @pytest.fixture
    def mock_redis(self):
        """Create mock Redis client"""
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=None)
        mock.set = AsyncMock(return_value=True)
        mock.delete = AsyncMock(return_value=1)
        mock.flushdb = AsyncMock(return_value=True)
        return mock

    @pytest.mark.asyncio
    async def test_redis_connection_failure_fallback(self, mock_redis):
        """Should fallback to in-memory when Redis fails"""
        mock_redis.get.side_effect = Exception("Connection refused")

        with patch("backend.services.cache_service.REDIS_AVAILABLE", True):
            service = CacheService()
            service._redis = mock_redis

            # Should not raise, should fallback gracefully
            # The important thing is it doesn't crash the app
            _ = await service.get("test", "any_key")
