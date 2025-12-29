"""
Tests for PIN Authentication endpoints
"""

import pytest
from fastapi.testclient import TestClient
from server import app

from backend.tests.utils.in_memory_db import setup_server_with_in_memory_db


@pytest.fixture
def fake_environment(monkeypatch):
    """Provide an isolated in-memory database and refresh token service for each test."""
    db = setup_server_with_in_memory_db(monkeypatch)

    # Remove the mock get_current_user overrides to verify real token logic
    from backend.auth.dependencies import get_current_user

    app.dependency_overrides.pop(get_current_user, None)

    # Also remove from server module if imported differently
    import backend.server as server_module

    app.dependency_overrides.pop(server_module.get_current_user, None)

    return db


@pytest.fixture
def client(fake_environment):
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Test user data"""
    return {
        "username": "test_pin_user",
        "password": "password123",
        "full_name": "Test Pin User",
        "role": "staff",
    }


@pytest.fixture
def auth_token(client, test_user):
    """Register and login to get auth token"""
    # Register
    client.post("/api/auth/register", json=test_user)

    # Login
    response = client.post(
        "/api/auth/login",
        json={"username": test_user["username"], "password": test_user["password"]},
    )
    return response.json()["data"]["access_token"]


class TestPinAuth:
    """Test PIN authentication endpoints"""

    def test_change_pin_success(self, client, auth_token, test_user):
        """Test successful PIN change"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"current_password": test_user["password"], "new_pin": "8520"}

        # Route fixed: /api/auth/change-pin
        response = client.post("/api/auth/change-pin", json=payload, headers=headers)

        assert response.status_code == 200
        assert response.json()["message"] == "PIN changed successfully"

    def test_change_pin_invalid_format(self, client, auth_token, test_user):
        """Test PIN change with invalid format (too short)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {
            "current_password": test_user["password"],
            "new_pin": "123",  # Too short
        }

        response = client.post("/api/auth/change-pin", json=payload, headers=headers)

        assert response.status_code == 400
        # Check error code structure if relevant, or just status
        assert "PIN must be exactly 4 digits" in response.json()["detail"]["message"]

    def test_change_pin_non_numeric(self, client, auth_token, test_user):
        """Test PIN change with non-numeric PIN"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        payload = {"current_password": test_user["password"], "new_pin": "abcd"}

        response = client.post("/api/auth/change-pin", json=payload, headers=headers)

        assert response.status_code == 400
        assert "PIN must be exactly 4 digits" in response.json()["detail"]["message"]

    def test_login_with_pin_success(self, client, auth_token, test_user):
        """Test successful login with PIN"""
        # First set the PIN
        headers = {"Authorization": f"Bearer {auth_token}"}
        setup_payload = {"current_password": test_user["password"], "new_pin": "8520"}
        client.post("/api/auth/change-pin", json=setup_payload, headers=headers)

        # Now try to login with PIN - username is NOT required in body, strict PIN lookup
        login_payload = {"pin": "8520"}

        # Route fixed: /api/auth/login-pin
        response = client.post("/api/auth/login-pin", json=login_payload)

        assert response.status_code == 200
        # The response structure matches TokenResponse
        data = response.json()["data"]
        assert "access_token" in data
        assert data["user"]["username"] == test_user["username"]

    def test_login_with_invalid_pin(self, client, auth_token, test_user):
        """Test login with incorrect PIN"""
        # First set the PIN
        headers = {"Authorization": f"Bearer {auth_token}"}
        setup_payload = {"current_password": test_user["password"], "new_pin": "8520"}
        client.post("/api/auth/change-pin", json=setup_payload, headers=headers)

        # Try login with wrong PIN
        login_payload = {"pin": "0000"}

        response = client.post("/api/auth/login-pin", json=login_payload)

        assert response.status_code == 401
        assert "Invalid PIN" in response.json()["detail"]["message"]

    def test_login_pin_user_not_found(self, client):
        """Test PIN login for non-existent PIN"""
        login_payload = {"pin": "9999"}  # Presumably not set

        response = client.post("/api/auth/login-pin", json=login_payload)

        assert response.status_code == 401
        assert "Invalid PIN" in response.json()["detail"]["message"]
