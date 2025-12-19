import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_paths(async_client: AsyncClient):
    # Try /auth/login
    response = await async_client.post(
        "/auth/login", json={"username": "test", "password": "password"}
    )
    print(f"\n/auth/login status: {response.status_code}")

    # Try /api/auth/login
    response = await async_client.post(
        "/api/auth/login", json={"username": "test", "password": "password"}
    )
    print(f"\n/api/auth/login status: {response.status_code}")

    # Try /api/v1/auth/login (just in case)
    response = await async_client.post(
        "/api/v1/auth/login", json={"username": "test", "password": "password"}
    )
    print(f"\n/api/v1/auth/login status: {response.status_code}")
