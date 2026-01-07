import pytest


@pytest.fixture
def test_user():
    return {"username": "staff1", "role": "staff"}


@pytest.mark.asyncio
async def test_get_sessions_endpoint(async_client, authenticated_headers, test_user):
    """Test GET /api/sessions returns list of sessions"""
    # Create a session first (if not exists)
    # But we can just check if it returns 200 and correct structure

    response = await async_client.get("/api/sessions", headers=authenticated_headers)
    assert response.status_code == 200
    data = response.json()

    # Check structure: items list + nested pagination object
    assert "items" in data
    assert isinstance(data["items"], list)
    assert "pagination" in data

    pagination = data["pagination"]
    assert "page" in pagination
    assert "page_size" in pagination
    assert "total" in pagination
    assert "total_pages" in pagination
    assert "has_next" in pagination
    assert "has_prev" in pagination


@pytest.mark.asyncio
async def test_create_session_endpoint(async_client, authenticated_headers, test_user):
    """Test POST /api/sessions creates a session"""
    payload = {"warehouse": "Test Warehouse", "type": "STANDARD"}

    response = await async_client.post("/api/sessions", json=payload, headers=authenticated_headers)
    assert response.status_code == 200
    data = response.json()

    assert data["warehouse"] == "Test Warehouse"
    assert data["staff_user"] == test_user["username"]
    assert "id" in data
    assert data["status"] == "OPEN"


@pytest.mark.asyncio
async def test_get_sessions_pagination(async_client, authenticated_headers):
    """Test pagination parameters"""
    response = await async_client.get(
        "/api/sessions?page=1&page_size=5", headers=authenticated_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "pagination" in data
    pagination = data["pagination"]
    assert pagination["page"] == 1
    assert pagination["page_size"] == 5
