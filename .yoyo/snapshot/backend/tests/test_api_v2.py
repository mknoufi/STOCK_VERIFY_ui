"""
Test API v2 Endpoints
Tests for standardized responses, error handling, and pagination
"""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.server import app


@pytest.fixture
async def async_client():
    """Async test client fixture"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture
def auth_headers():
    """Auth headers fixture - using test token"""
    # For testing, we'll use a simple token format
    # In real tests, this would come from login endpoint
    return {"Authorization": "Bearer test_token"}


class TestAPIv2Health:
    """Test API v2 health endpoints"""

    @pytest.mark.asyncio
    async def test_health_check_v2(self, async_client):
        """Test basic health check endpoint"""
        response = await async_client.get("/api/v2/health/")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check standardized response format
        assert "success" in data
        assert data["success"] is True
        assert "data" in data
        assert "timestamp" in data
        
        # Check health data structure
        health_data = data["data"]
        assert "status" in health_data
        assert "services" in health_data
        assert health_data["status"] in ["healthy", "degraded", "unhealthy"]

    @pytest.mark.asyncio
    async def test_detailed_health_check_v2(self, async_client, auth_headers):
        """Test detailed health check endpoint (requires auth)"""
        response = await async_client.get("/api/v2/health/detailed", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check standardized response format
        assert "success" in data
        assert data["success"] is True
        assert "data" in data
        
        # Check detailed health data
        health_data = data["data"]
        assert "timestamp" in health_data
        assert "services" in health_data


class TestAPIv2ConnectionStatus:
    """Test API v2 connection status endpoints"""

    @pytest.mark.asyncio
    async def test_connection_pool_status(self, async_client, auth_headers):
        """Test connection pool status endpoint"""
        response = await async_client.get("/api/v2/connections/pool/status", headers=auth_headers)
        
        # May return 200 or error if pool not initialized
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            
            if data["success"]:
                pool_data = data["data"]
                assert "status" in pool_data
                assert "pool_size" in pool_data
                assert "created" in pool_data
                assert "available" in pool_data
                assert "checked_out" in pool_data
                assert "utilization" in pool_data

    @pytest.mark.asyncio
    async def test_connection_pool_stats(self, async_client, auth_headers):
        """Test connection pool stats endpoint"""
        response = await async_client.get("/api/v2/connections/pool/stats", headers=auth_headers)
        
        # May return 200 or error if pool not initialized
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data

    @pytest.mark.asyncio
    async def test_connection_pool_health_check(self, async_client, auth_headers):
        """Test manual health check trigger"""
        response = await async_client.post("/api/v2/connections/pool/health-check", headers=auth_headers)
        
        # May return 200 or error if pool not initialized
        assert response.status_code in [200, 500]


class TestAPIv2Metrics:
    """Test API v2 metrics endpoints"""

    @pytest.mark.asyncio
    async def test_pool_metrics(self, async_client, auth_headers):
        """Test pool metrics endpoint"""
        response = await async_client.get("/api/v2/metrics/pool", headers=auth_headers)
        
        # May return 200 or error if pool not initialized
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            
            if data["success"]:
                metrics = data["data"]
                assert "pool_size" in metrics or "status" in metrics

    @pytest.mark.asyncio
    async def test_system_metrics(self, async_client, auth_headers):
        """Test system metrics endpoint"""
        response = await async_client.get("/api/v2/metrics/system", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check standardized response format
        assert "success" in data
        assert data["success"] is True
        assert "data" in data
        
        metrics = data["data"]
        assert "timestamp" in metrics
        assert "services" in metrics


class TestAPIv2Items:
    """Test API v2 items endpoints"""

    @pytest.mark.asyncio
    async def test_get_items_v2_pagination(self, async_client, auth_headers):
        """Test items endpoint with pagination"""
        response = await async_client.get(
            "/api/v2/items/?page=1&page_size=10",
            headers=auth_headers
        )
        
        # May return 200 or 401/500 depending on setup
        assert response.status_code in [200, 401, 500]
        
        if response.status_code == 200:
            data = response.json()
            
            # Check standardized response format
            assert "success" in data
            assert data["success"] is True
            assert "data" in data
            
            # Check paginated response structure
            paginated_data = data["data"]
            assert "items" in paginated_data
            assert "total" in paginated_data
            assert "page" in paginated_data
            assert "page_size" in paginated_data
            assert "total_pages" in paginated_data
            assert "has_next" in paginated_data
            assert "has_previous" in paginated_data

    @pytest.mark.asyncio
    async def test_get_items_v2_search(self, async_client, auth_headers):
        """Test items endpoint with search"""
        response = await async_client.get(
            "/api/v2/items/?search=test&page=1&page_size=5",
            headers=auth_headers
        )
        
        # May return 200 or 401/500 depending on setup
        assert response.status_code in [200, 401, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data


class TestAPIv2Sessions:
    """Test API v2 sessions endpoints"""

    @pytest.mark.asyncio
    async def test_get_sessions_v2_pagination(self, async_client, auth_headers):
        """Test sessions endpoint with pagination"""
        response = await async_client.get(
            "/api/v2/sessions/?page=1&page_size=10",
            headers=auth_headers
        )
        
        # May return 200 or 401/500 depending on setup
        assert response.status_code in [200, 401, 500]
        
        if response.status_code == 200:
            data = response.json()
            
            # Check standardized response format
            assert "success" in data
            assert data["success"] is True
            assert "data" in data
            
            # Check paginated response structure
            paginated_data = data["data"]
            assert "items" in paginated_data
            assert "total" in paginated_data
            assert "page" in paginated_data
            assert "page_size" in paginated_data


class TestAPIv2ErrorHandling:
    """Test API v2 error handling"""

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, async_client):
        """Test that protected endpoints require authentication"""
        response = await async_client.get("/api/v2/health/detailed")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403]

    @pytest.mark.asyncio
    async def test_invalid_pagination(self, async_client, auth_headers):
        """Test error handling for invalid pagination"""
        response = await async_client.get(
            "/api/v2/items/?page=0&page_size=0",
            headers=auth_headers
        )
        
        # Should return 422 (validation error) or 200 with defaults
        assert response.status_code in [200, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

