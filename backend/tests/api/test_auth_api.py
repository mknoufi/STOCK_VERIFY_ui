import os
from datetime import datetime

import pytest
from backend.auth.dependencies import get_current_user as auth_get_current_user
from backend.server import app, get_current_user
from backend.utils.auth_utils import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from httpx import AsyncClient

# Test Data
TEST_USERNAME = "testuser_auth"
TEST_PASSWORD = "old_password_123"
TEST_PIN = "1234"
NEW_PIN = "8291"
NEW_PASSWORD = "new_password_456"


@pytest.fixture(autouse=True)
def restore_auth_dependency(test_db):
    """
    Remove the mock get_current_user dependency override set by setup_server_with_in_memory_db.
    This allows the real get_current_user to run, which we need for testing auth endpoints.
    """
    overrides = app.dependency_overrides

    # Remove overrides if they exist
    if get_current_user in overrides:
        del overrides[get_current_user]
    if auth_get_current_user in overrides:
        del overrides[auth_get_current_user]

    yield

    # We don't strictly need to restore it because test_db fixture runs for each test
    # and calls setup_server_with_in_memory_db which re-applies it.
    # But if scope changes, we might need to be careful.


@pytest.fixture
async def auth_headers(test_db):
    # Create a test user
    hashed_password = get_password_hash(TEST_PASSWORD)
    hashed_pin = get_password_hash(TEST_PIN)

    user_data = {
        "username": TEST_USERNAME,
        "hashed_password": hashed_password,
        "pin_hash": hashed_pin,
        "hashed_pin": hashed_pin,  # Backward compatibility
        "full_name": "Test Auth User",
        "role": "staff",
        "is_active": True,
        "created_at": datetime.utcnow(),
    }

    # Insert user if not exists
    existing_user = await test_db.users.find_one({"username": TEST_USERNAME})
    if existing_user:
        existing_user["_id"]
    else:
        await test_db.users.insert_one(user_data)

    # Generate token
    # MUST use the same secret key as the app is configured with in conftest.py
    secret_key = os.getenv("JWT_SECRET", "test-jwt-secret-key-for-testing-only")

    token = create_access_token(
        data={"sub": TEST_USERNAME, "role": "staff"},
        secret_key=secret_key,
        algorithm="HS256",
    )

    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_change_pin_success(async_client: AsyncClient, auth_headers, test_db):
    payload = {"current_pin": TEST_PIN, "new_pin": NEW_PIN}

    response = await async_client.post(
        "/api/auth/change-pin", json=payload, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "PIN changed successfully"

    # Verify in DB
    user = await test_db.users.find_one({"username": TEST_USERNAME})
    assert verify_password(NEW_PIN, user["pin_hash"])


@pytest.mark.asyncio
async def test_change_pin_wrong_current(async_client: AsyncClient, auth_headers):
    payload = {
        "current_pin": "0000",  # Wrong PIN
        "new_pin": NEW_PIN,
    }

    response = await async_client.post(
        "/api/auth/change-pin", json=payload, headers=auth_headers
    )

    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["error_code"] == "WRONG_CURRENT_PIN"


@pytest.mark.asyncio
async def test_change_pin_invalid_new(async_client: AsyncClient, auth_headers):
    payload = {
        "current_pin": TEST_PIN,
        "new_pin": "1234",  # Sequential/Weak PIN might be rejected by validator
    }

    response = await async_client.post(
        "/api/auth/change-pin", json=payload, headers=auth_headers
    )

    # Depending on validator config, 1234 might be rejected.
    # Let's assume the validator rejects simple sequences.
    # If it passes, we might need to adjust the test expectation or the input.
    # But 1234 is definitely weak.

    assert response.status_code == 400
    data = response.json()
    # The error code depends on the validator, likely WEAK_PIN or similar
    assert "error_code" in data["detail"]


@pytest.mark.asyncio
async def test_change_password_success(
    async_client: AsyncClient, auth_headers, test_db
):
    payload = {"current_password": TEST_PASSWORD, "new_password": NEW_PASSWORD}

    response = await async_client.post(
        "/api/auth/change-password", json=payload, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Password changed successfully"

    # Verify in DB
    user = await test_db.users.find_one({"username": TEST_USERNAME})
    assert verify_password(NEW_PASSWORD, user["hashed_password"])


@pytest.mark.asyncio
async def test_change_password_wrong_current(async_client: AsyncClient, auth_headers):
    payload = {"current_password": "wrong_password", "new_password": NEW_PASSWORD}

    response = await async_client.post(
        "/api/auth/change-password", json=payload, headers=auth_headers
    )

    assert response.status_code == 400
    data = response.json()
    assert data["detail"]["error_code"] == "WRONG_CURRENT_PASSWORD"
