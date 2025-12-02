import pytest
from httpx import AsyncClient
from backend.server import app


@pytest.mark.asyncio
async def test_variance_trend_endpoint(async_client, authenticated_headers):
    response = await async_client.get(
        "/api/variance/trend", headers=authenticated_headers, params={"days": 7}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert isinstance(data["data"], list)
    # Check structure of first item if exists
    if data["data"]:
        assert "date" in data["data"][0]
        assert "count" in data["data"][0]


@pytest.mark.asyncio
async def test_staff_performance_endpoint(async_client, authenticated_headers):
    response = await async_client.get(
        "/api/metrics/staff-performance", headers=authenticated_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert isinstance(data["data"], list)
    # Check structure of first item if exists
    if data["data"]:
        assert "user" in data["data"][0]
        assert "items_scanned" in data["data"][0]
        assert "variances_found" in data["data"][0]
