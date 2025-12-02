import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_check_available_routes(async_client: AsyncClient, test_db):
    """Check what routes are available"""
    
    # Try different item endpoints
    endpoints_to_test = [
        "/api/items/",
        "/api/erp/items/",
        "/items/",
        "/erp/items/",
    ]
    
    for endpoint in endpoints_to_test:
        response = await async_client.get(endpoint)
        print(f"\n{endpoint}: {response.status_code}")
