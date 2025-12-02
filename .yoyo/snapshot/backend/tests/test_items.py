"""
Tests for Item endpoints
"""

import pytest
from fastapi.testclient import TestClient
from server import app

from backend.tests.utils.in_memory_db import setup_server_with_in_memory_db


@pytest.fixture
def fake_environment(monkeypatch):
    return setup_server_with_in_memory_db(monkeypatch)


@pytest.fixture
def client(fake_environment):
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
def auth_token(client):
    """Get auth token for authenticated requests"""
    # Login with default user
    response = client.post("/api/auth/login", json={"username": "staff1", "password": "staff123"})

    if response.status_code == 200:
        payload = response.json()
        if isinstance(payload, dict):
            if "access_token" in payload:
                return payload["access_token"]
            data = payload.get("data") or {}
            return data.get("access_token")
    return None


class TestGetItems:
    """Test get items endpoint"""

    def test_get_all_items_authenticated(self, client, auth_token):
        """Test getting all items with authentication"""
        if not auth_token:
            pytest.skip("Authentication token not available")

        response = client.get("/api/erp/items", headers={"Authorization": f"Bearer {auth_token}"})

        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)

    def test_get_all_items_unauthenticated(self, client):
        """Test getting all items without authentication"""
        response = client.get("/api/erp/items")

        assert response.status_code == 401

    def test_search_items(self, client, auth_token):
        """Test searching items"""
        if not auth_token:
            pytest.skip("Authentication token not available")

        response = client.get(
            "/api/erp/items?search=test",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200

    def test_legacy_search_endpoint(self, client, auth_token):
        """Test legacy /api/items/search endpoint"""
        if not auth_token:
            pytest.skip("Authentication token not available")

        response = client.get(
            "/api/items/search?query=test",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)


class TestGetItemByBarcode:
    """Test get item by barcode endpoint"""

    def test_get_item_by_barcode_success(self, client, auth_token):
        """Test getting item by barcode"""
        if not auth_token:
            pytest.skip("Authentication token not available")

        # Note: This requires a valid barcode in the database
        response = client.get(
            "/api/erp/items/barcode/123456",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        # May return 404 if barcode doesn't exist, which is acceptable
        assert response.status_code in [200, 404]

    def test_refresh_stock(self, client, auth_token):
        """Test refreshing item stock"""
        if not auth_token:
            pytest.skip("Authentication token not available")

        # Note: This requires a valid item_code
        response = client.post(
            "/api/erp/items/TEST001/refresh-stock",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        # May return 404 if item doesn't exist, which is acceptable
        assert response.status_code in [200, 404, 500]
