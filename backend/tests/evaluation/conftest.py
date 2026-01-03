"""
Evaluation Test Configuration
============================

Pytest configuration for evaluation tests.
"""

import asyncio
import os
import sys
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
import pytest_asyncio

# Ensure backend is importable
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
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
        "JWT_SECRET": "test-jwt-secret-key-for-testing-only",
        "JWT_ALGORITHM": "HS256",
        "RATE_LIMIT_PER_MINUTE": "1000",
        "LOG_LEVEL": "WARNING",  # Reduce noise during tests
    }
)

from httpx import ASGITransport, AsyncClient  # noqa: E402

# Import app and test utilities
try:
    from backend.server import app
    from backend.tests.utils.in_memory_db import InMemoryDatabase, setup_server_with_in_memory_db
except ImportError:
    # Fallback for when tests are run in isolation
    app = None
    InMemoryDatabase = None
    setup_server_with_in_memory_db = None


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_db(monkeypatch):
    """Provide in-memory database for testing."""
    if setup_server_with_in_memory_db is None:
        pytest.skip("In-memory DB not available")
    return setup_server_with_in_memory_db(monkeypatch)


@pytest_asyncio.fixture
async def async_client(test_db, monkeypatch) -> AsyncGenerator[AsyncClient, None]:
    """Provide async HTTP client for testing."""
    if app is None:
        pytest.skip("FastAPI app not available")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


# Custom pytest markers
def pytest_configure(config):
    """Configure custom markers for evaluation tests."""
    config.addinivalue_line(
        "markers",
        "performance: marks tests as performance evaluation (deselect with '-m \"not performance\"')",
    )
    config.addinivalue_line("markers", "business_logic: marks tests as business logic evaluation")
    config.addinivalue_line("markers", "data_quality: marks tests as data quality evaluation")
    config.addinivalue_line("markers", "workflow: marks tests as workflow evaluation")
    config.addinivalue_line("markers", "security: marks tests as security evaluation")
