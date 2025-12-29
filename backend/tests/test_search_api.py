from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.auth.dependencies import get_current_user_async
from backend.server import app
from backend.services.search_service import SearchResponse, SearchResult


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_user():
    return {"username": "testuser", "role": "admin", "id": "123"}


def test_search_optimized_api(client, mock_user):
    # Mock auth
    app.dependency_overrides[get_current_user_async] = lambda: mock_user

    # Mock search service
    mock_result = SearchResponse(
        items=[
            SearchResult(
                id="1",
                item_name="Test Item",
                item_code="CODE1",
                barcode="123456",
                stock_qty=10.0,
                mrp=100.0,
                category="Cat",
                subcategory="Sub",
                warehouse="Wh",
                uom_name="Pcs",
                relevance_score=1000.0,
                match_type="exact_barcode",
            )
        ],
        total=1,
        page=1,
        page_size=20,
        has_more=False,
        query="123456",
    )

    mock_service = MagicMock()
    mock_service.search = AsyncMock(return_value=mock_result)

    with patch("backend.api.search_api.get_search_service", return_value=mock_service):
        response = client.get("/api/items/search/optimized", params={"q": "123456"})

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["total"] == 1
        assert data["data"]["items"][0]["item_name"] == "Test Item"
        assert data["data"]["items"][0]["match_type"] == "exact_barcode"

    # Clean up
    app.dependency_overrides = {}


def test_search_api_missing_query(client, mock_user):
    app.dependency_overrides[get_current_user_async] = lambda: mock_user
    response = client.get("/api/items/search/optimized")
    assert response.status_code == 422  # Validation error
    app.dependency_overrides = {}
