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

    # Check structure (PaginatedResponse)
    # Based on debug output, the structure is nested: {'items': [], 'pagination': {...}}
    assert "items" in data
    if "pagination" in data:
        assert "page" in data["pagination"]
        assert "page_size" in data["pagination"]
        assert "total" in data["pagination"]
    else:
        # Fallback to flat structure if it changes back
        assert "total" in data
        assert "page" in data
        assert "page_size" in data

    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_create_session_endpoint(async_client, authenticated_headers, test_user):
    """Test POST /api/sessions creates a session"""
    payload = {"warehouse": "Test Warehouse", "type": "STANDARD"}

    response = await async_client.post(
        "/api/sessions", json=payload, headers=authenticated_headers
    )
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
    print(f"DEBUG: response data: {data}")

    if "pagination" in data:
        assert data["pagination"]["page"] == 1
        assert data["pagination"]["page_size"] == 5
    else:
        assert data["page"] == 1
        assert data["page_size"] == 5
