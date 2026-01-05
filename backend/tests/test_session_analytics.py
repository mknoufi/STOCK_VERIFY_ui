import pytest


@pytest.mark.asyncio
async def test_get_session_analytics(async_client, authenticated_headers):
    """Test GET /api/sessions/analytics returns correct structure"""

    # Call the endpoint
    response = await async_client.get("/api/sessions/analytics", headers=authenticated_headers)

    # Check status code
    assert response.status_code == 200

    # Check response structure
    data = response.json()
    assert "active_sessions" in data
    assert "completed_today" in data
    assert "total_items_verified_today" in data
    assert "average_session_duration_minutes" in data
    assert "total_items" in data
    assert "total_sessions" in data
    assert "avg_variance" in data
    assert "sessions_by_date" in data

    # Check types
    assert isinstance(data["active_sessions"], int)
    assert isinstance(data["completed_today"], int)
    assert isinstance(data["total_items_verified_today"], int)
    assert isinstance(data["average_session_duration_minutes"], (int, float))
    assert isinstance(data["total_items"], int)
    assert isinstance(data["total_sessions"], int)
    assert isinstance(data["avg_variance"], (int, float))
    assert isinstance(data["sessions_by_date"], dict)
