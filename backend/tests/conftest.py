"""Comprehensive pytest configuration for backend testing suite."""

# ruff: noqa: E402

import asyncio
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock

import pytest

# Ensure backend package root is importable when running tests from project root
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

for path in (str(BACKEND_DIR), str(PROJECT_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

# Test environment setup
os.environ.update(
    {
        "TESTING": "true",
        "MONGO_URL": "mongodb://localhost:27017/stock_count_test",
        "DB_NAME": "stock_count_test",
        "JWT_SECRET": "test-jwt-secret-key-for-testing-only-32chars",
        "JWT_REFRESH_SECRET": "test-jwt-refresh-secret-key-for-testing-only-32chars",
        "JWT_ALGORITHM": "HS256",
        "REDIS_URL": "redis://localhost:6379/15",  # Use database 15 for testing
        # 'SQL_SERVER_HOST': 'localhost',  # Disabled to prevent connection pool hang
        # 'SQL_SERVER_DATABASE': 'stockdb_test',
        "RATE_LIMIT_PER_MINUTE": "1000",  # Higher limits for testing
        "LOG_LEVEL": "DEBUG",
    }
)

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient

from backend.services.cache_service import CacheService

# Import test utilities and mocks
from backend.tests.utils.in_memory_db import InMemoryDatabase, setup_server_with_in_memory_db

# Provide Path symbol for legacy tests that expect it in globals
globals().setdefault("Path", Path)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_db(monkeypatch) -> InMemoryDatabase:
    """Provide an in-memory database for testing."""
    print("DEBUG: test_db fixture starting")
    # This sets up the server with the in-memory DB and seeds initial data
    db = setup_server_with_in_memory_db(monkeypatch)
    print("DEBUG: test_db fixture done")
    return db


@pytest_asyncio.fixture
async def async_client(test_db, monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    """Provide an async client for API testing."""
    from backend.server import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def mongo_client() -> AsyncGenerator[AsyncIOMotorClient, None]:
    """Provide MongoDB test client."""
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    yield client

    # Cleanup test database
    await client.drop_database(os.getenv("DB_NAME"))
    client.close()


@pytest_asyncio.fixture
async def test_cache() -> AsyncGenerator[CacheService, None]:
    """Provide cache service for testing."""
    cache = CacheService(redis_url=os.getenv("REDIS_URL"), default_ttl=60)
    yield cache

    # Clear test cache
    await cache.clear_pattern("*")


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Provide temporary directory for file operations."""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def mock_sql_connection():
    """Provide mocked SQL Server connection."""
    connection = MagicMock()
    cursor = MagicMock()
    connection.cursor.return_value = cursor
    cursor.fetchall.return_value = []
    cursor.fetchone.return_value = None
    return connection


@pytest_asyncio.fixture
async def authenticated_headers(test_db: InMemoryDatabase) -> dict:
    """Provide authentication headers for API testing."""
    from backend.auth.jwt_provider import encode

    # Find the test user seeded by setup_server_with_in_memory_db
    user = await test_db.users.find_one({"username": "staff1"})
    if not user:
        # Fallback if seeding didn't work or changed
        user = {"username": "testuser", "role": "admin"}

    token = encode(
        {"sub": user["username"], "role": user["role"]},
        os.getenv("JWT_SECRET"),
        algorithm=os.getenv("JWT_ALGORITHM"),
    )

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def performance_baseline():
    """Baseline performance metrics for regression testing."""
    return {
        "api_response_time_ms": 200,
        "db_query_time_ms": 50,
        "cache_hit_ratio": 0.8,
        "memory_usage_mb": 100,
        "build_time_seconds": 45,
    }
