import pytest
from backend.auth.dependencies import get_current_user as auth_get_current_user
from backend.server import app, get_current_user
from backend.utils.auth_utils import create_access_token
from httpx import AsyncClient

# Test Data
TEST_USERNAME = "testuser_settings"
TEST_USER_ID = "507f1f77bcf86cd799439011"  # Mock ObjectId


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


@pytest.fixture
async def auth_headers(test_db):
    """Create a valid auth token for a test user."""
    # Create a test user in the DB
    user_data = {
        "_id": TEST_USER_ID,
        "username": TEST_USERNAME,
        "role": "staff",
        "is_active": True,
        "full_name": "Test User Settings",
    }
    # Clean up any existing user/settings from previous tests
    await test_db.users.delete_many({"username": TEST_USERNAME})
    await test_db.user_settings.delete_many({"user_id": TEST_USER_ID})

    await test_db.users.insert_one(user_data)

    token = create_access_token(data={"sub": TEST_USERNAME})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_settings_defaults(async_client: AsyncClient, auth_headers):
    """Test getting settings when none exist (should return defaults)."""
    response = await async_client.get("/api/user/settings", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["theme"] == "light"  # Default
    assert data["data"]["font_size"] == "medium"  # Default


@pytest.mark.asyncio
async def test_update_settings(async_client: AsyncClient, auth_headers, test_db):
    """Test updating user settings."""
    payload = {"theme": "dark", "font_size": "large", "primary_color": "#000000"}

    response = await async_client.patch(
        "/api/user/settings", json=payload, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["data"]["theme"] == "dark"
    assert data["data"]["font_size"] == "large"

    # Verify in DB
    settings = await test_db.user_settings.find_one({"user_id": TEST_USER_ID})
    assert settings is not None
    assert settings["theme"] == "dark"


@pytest.mark.asyncio
async def test_get_settings_existing(async_client: AsyncClient, auth_headers, test_db):
    """Test getting settings that already exist."""
    # Pre-seed settings
    await test_db.user_settings.insert_one(
        {"user_id": TEST_USER_ID, "theme": "ocean", "haptic_enabled": False}
    )

    response = await async_client.get("/api/user/settings", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["theme"] == "ocean"
    assert data["data"]["haptic_enabled"] is False
    assert (
        data["data"]["font_size"] == "medium"
    )  # Should still have default for missing field


@pytest.mark.asyncio
async def test_unauthorized_access(async_client: AsyncClient):
    """Test access without token."""
    response = await async_client.get("/api/user/settings")
    assert response.status_code == 401
