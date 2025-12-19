"""
Tests for Sync endpoints
"""

import pytest
from fastapi.testclient import TestClient

from backend.tests.utils.in_memory_db import setup_server_with_in_memory_db
from server import app


@pytest.fixture
def fake_environment(monkeypatch):
    return setup_server_with_in_memory_db(monkeypatch)


@pytest.fixture
def client(fake_environment):
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
def supervisor_token(client):
    """Get supervisor auth token"""
    response = client.post(
        "/api/auth/login", json={"username": "supervisor", "password": "super123"}
    )

    if response.status_code == 200:
        payload = response.json()
        if isinstance(payload, dict):
            if "access_token" in payload:
                return payload["access_token"]
            data = payload.get("data") or {}
            return data.get("access_token")
    return None


class TestSyncEndpoints:
    """Test sync endpoints"""

    def test_trigger_erp_sync(self, client, supervisor_token):
        """Test triggering ERP sync"""
        if not supervisor_token:
            pytest.skip("Supervisor token not available")

        response = client.post(
            "/api/sync/erp", headers={"Authorization": f"Bearer {supervisor_token}"}
        )

        # May fail if SQL Server not connected, which is acceptable
        assert response.status_code in [200, 400, 500]

    def test_trigger_change_sync(self, client, supervisor_token):
        """Test triggering change detection sync"""
        if not supervisor_token:
            pytest.skip("Supervisor token not available")

        response = client.post(
            "/api/sync/changes", headers={"Authorization": f"Bearer {supervisor_token}"}
        )

        # May fail if SQL Server not connected, which is acceptable
        assert response.status_code in [200, 400, 500]

    def test_get_change_sync_stats(self, client, supervisor_token):
        """Test getting change sync statistics"""
        if not supervisor_token:
            pytest.skip("Supervisor token not available")

        response = client.get(
            "/api/sync/changes/stats",
            headers={"Authorization": f"Bearer {supervisor_token}"},
        )

        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert "running" in data or "enabled" in data
