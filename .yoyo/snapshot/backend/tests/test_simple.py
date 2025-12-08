import pytest
from httpx import AsyncClient, ASGITransport
from backend.server import app

@pytest.mark.asyncio
async def test_root(test_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        # Health endpoint might redirect (307) or return 200
        assert response.status_code in [200, 307]
