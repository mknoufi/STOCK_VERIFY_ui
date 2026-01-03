import pytest
from fastapi import status
from httpx import AsyncClient

from backend.server import app
from backend.auth.dependencies import get_current_user


# Mock admin user
async def mock_get_current_admin():
    return {
        "_id": "admin_id",
        "username": "admin",
        "role": "admin",
        "full_name": "Administrator",
        "is_active": True,
        "permissions": [],
    }


# Mock staff user
async def mock_get_current_staff():
    return {
        "_id": "staff_id",
        "username": "staff1",
        "role": "staff",
        "full_name": "Staff Member",
        "is_active": True,
        "permissions": [],
    }


@pytest.mark.asyncio
async def test_list_users_admin(async_client: AsyncClient):
    """Test listing users as admin"""
    app.dependency_overrides[get_current_user] = mock_get_current_admin

    response = await async_client.get("/api/users")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "users" in data
    assert "total" in data
    assert len(data["users"]) >= 3  # staff1, supervisor, admin seeded


@pytest.mark.asyncio
async def test_list_users_staff_forbidden(async_client: AsyncClient):
    """Test listing users as staff is forbidden"""
    app.dependency_overrides[get_current_user] = mock_get_current_staff

    response = await async_client.get("/api/users")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_create_user(async_client: AsyncClient):
    """Test creating a new user"""
    app.dependency_overrides[get_current_user] = mock_get_current_admin

    new_user = {
        "username": "newuser",
        "password": "password123",
        "full_name": "New User",
        "role": "staff",
        "email": "new@example.com",
    }

    response = await async_client.post("/api/users", json=new_user)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "new@example.com"

    # Verify user exists in list
    list_response = await async_client.get("/api/users?search=newuser")
    assert list_response.status_code == status.HTTP_200_OK
    list_data = list_response.json()
    assert any(u["username"] == "newuser" for u in list_data["users"])


@pytest.mark.asyncio
async def test_create_duplicate_user(async_client: AsyncClient):
    """Test creating a duplicate user fails"""
    app.dependency_overrides[get_current_user] = mock_get_current_admin

    # Try to create 'staff1' which already exists
    new_user = {
        "username": "staff1",
        "password": "password123",
        "full_name": "Duplicate Staff",
        "role": "staff",
    }

    response = await async_client.post("/api/users", json=new_user)
    assert response.status_code == status.HTTP_409_CONFLICT


@pytest.mark.asyncio
async def test_update_user(async_client: AsyncClient):
    """Test updating a user"""
    app.dependency_overrides[get_current_user] = mock_get_current_admin

    # First get a user to update (staff1)
    list_response = await async_client.get("/api/users?search=staff1")
    user_id = list_response.json()["users"][0]["id"]

    update_data = {"full_name": "Updated Staff Name", "role": "supervisor"}

    response = await async_client.put(f"/api/users/{user_id}", json=update_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Updated Staff Name"
    assert data["role"] == "supervisor"


@pytest.mark.asyncio
async def test_delete_user(async_client: AsyncClient):
    """Test deleting a user"""
    app.dependency_overrides[get_current_user] = mock_get_current_admin

    # Create a user to delete
    new_user = {
        "username": "todelete",
        "password": "password123",
        "full_name": "To Delete",
        "role": "staff",
    }
    create_response = await async_client.post("/api/users", json=new_user)
    user_id = create_response.json()["id"]

    # Delete the user
    delete_response = await async_client.delete(f"/api/users/{user_id}")
    assert delete_response.status_code == status.HTTP_204_NO_CONTENT

    # Verify user is gone
    get_response = await async_client.get(f"/api/users/{user_id}")
    assert get_response.status_code == status.HTTP_404_NOT_FOUND
