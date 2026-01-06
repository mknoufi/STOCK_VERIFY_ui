"""
Tests for Authentication endpoints
"""

import pytest
from fastapi.testclient import TestClient

from backend.tests.utils.in_memory_db import setup_server_with_in_memory_db
from server import app


@pytest.fixture
def fake_environment(monkeypatch):
    """Provide an isolated in-memory database and refresh token service for each test."""
    return setup_server_with_in_memory_db(monkeypatch)


@pytest.fixture
def client(fake_environment):
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Test user data"""
    return {
        "username": "test_user",
        "password": "test123",
        "full_name": "Test User",
        "role": "staff",
    }


class TestLogin:
    """Test login endpoint"""

    def test_login_success(self, client, test_user):
        """Test successful login"""
        # Register user first
        response = client.post("/api/auth/register", json=test_user)

        # Login
        response = client.post(
            "/api/auth/login",
            json={"username": test_user["username"], "password": test_user["password"]},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload.get("success") is True
        data = payload.get("data", {})
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        response = client.post(
            "/api/auth/login", json={"username": "invalid", "password": "invalid"}
        )

        assert response.status_code == 401

    def test_login_missing_fields(self, client):
        """Test login with missing fields"""
        response = client.post("/api/auth/login", json={"username": "test"})

        assert response.status_code == 422


class TestRegister:
    """Test register endpoint"""

    def test_register_success(self, client, test_user):
        """Test successful registration"""
        response = client.post("/api/auth/register", json=test_user)

        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == test_user["username"]

    def test_register_duplicate_username(self, client, test_user):
        """Test registration with duplicate username"""
        # Register first time
        client.post("/api/auth/register", json=test_user)

        # Try to register again
        response = client.post("/api/auth/register", json=test_user)

        assert response.status_code == 400

    def test_register_missing_fields(self, client):
        """Test registration with missing fields"""
        response = client.post("/api/auth/register", json={"username": "test"})

        assert response.status_code == 422
