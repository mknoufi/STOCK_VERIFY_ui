import pytest
from httpx import AsyncClient

from backend.auth.dependencies import get_current_user as auth_get_current_user
from backend.server import app, get_current_user
from backend.utils.auth_utils import create_access_token

# Test Data
USER_A_ID = "507f1f77bcf86cd799439011"
USER_A_NAME = "user_a"
USER_B_ID = "507f1f77bcf86cd799439022"
USER_B_NAME = "user_b"


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


async def create_test_user(db, user_id, username):
    """Helper to create a test user."""
    user_data = {
        "_id": user_id,
        "username": username,
        "role": "staff",
        "is_active": True,
        "full_name": f"Test User {username}",
    }
    # Clean up existing
    await db.users.delete_many({"username": username})
    await db.users.insert_one(user_data)
    return user_data


@pytest.mark.asyncio
async def test_heartbeat_success(async_client: AsyncClient, test_db):
    """Test heartbeat with valid session."""
    await create_test_user(test_db, USER_A_ID, USER_A_NAME)
    token = create_access_token(data={"sub": USER_A_NAME})
    headers = {"Authorization": f"Bearer {token}"}

    response = await async_client.get("/api/auth/heartbeat", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "alive"
    assert data["data"]["username"] == USER_A_NAME
    assert data["data"]["user_id"] == USER_A_ID
    assert data["data"]["session_valid"] is True
    assert "timestamp" in data["data"]


@pytest.mark.asyncio
async def test_heartbeat_unauthorized(async_client: AsyncClient):
    """Test heartbeat without token."""
    response = await async_client.get("/api/auth/heartbeat")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_session_isolation(async_client: AsyncClient, test_db):
    """
    Test that sessions are isolated between users.
    Verify that requests with different tokens return correct user context.
    """
    # Create two users
    await create_test_user(test_db, USER_A_ID, USER_A_NAME)
    await create_test_user(test_db, USER_B_ID, USER_B_NAME)

    # Create tokens
    token_a = create_access_token(data={"sub": USER_A_NAME})
    token_b = create_access_token(data={"sub": USER_B_NAME})

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Request for User A
    resp_a = await async_client.get("/api/auth/heartbeat", headers=headers_a)
    assert resp_a.status_code == 200
    data_a = resp_a.json()["data"]
    assert data_a["username"] == USER_A_NAME
    assert data_a["user_id"] == USER_A_ID

    # Request for User B
    resp_b = await async_client.get("/api/auth/heartbeat", headers=headers_b)
    assert resp_b.status_code == 200
    data_b = resp_b.json()["data"]
    assert data_b["username"] == USER_B_NAME
    assert data_b["user_id"] == USER_B_ID

    # Verify no cross-talk
    assert data_a["username"] != data_b["username"]
