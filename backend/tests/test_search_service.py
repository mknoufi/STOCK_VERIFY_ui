from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.services.search_service import SearchService


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.erp_items = MagicMock()
    return db


@pytest.fixture
def search_service(mock_db):
    return SearchService(db=mock_db)


@pytest.mark.asyncio
async def test_search_too_short_query(search_service):
    response = await search_service.search(query="a")
    assert response.total == 0
    assert len(response.items) == 0
    assert response.query == "a"


@pytest.mark.asyncio
async def test_search_exact_barcode_match(search_service, mock_db):
    # Mock data
    mock_items = [
        {
            "_id": "1",
            "item_name": "Test Item",
            "barcode": "123456",
            "item_code": "CODE1",
            "stock_qty": 10.0,
        }
    ]

    # Mock cursor
    mock_cursor = MagicMock()
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=mock_items)
    mock_db.erp_items.find.return_value = mock_cursor

    response = await search_service.search(query="123456")

    assert response.total == 1
    assert response.items[0].relevance_score >= 1000
    assert response.items[0].match_type == "exact_barcode"


@pytest.mark.asyncio
async def test_search_pagination(search_service, mock_db):
    # Mock 25 items
    mock_items = [
        {
            "_id": str(i),
            "item_name": f"Item {i}",
            "barcode": f"BC{i}",
            "item_code": f"C{i}",
            "stock_qty": 1.0,
        }
        for i in range(25)
    ]

    # Mock cursor
    mock_cursor = MagicMock()
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=mock_items)
    mock_db.erp_items.find.return_value = mock_cursor

    # Page 1
    response = await search_service.search(query="Item", page=1, page_size=10)
    assert len(response.items) == 10
    assert response.total == 25
    assert response.has_more is True

    # Page 3
    response = await search_service.search(query="Item", page=3, page_size=10)
    assert len(response.items) == 5
    assert response.has_more is False


@pytest.mark.asyncio
async def test_search_scoring_logic(search_service, mock_db):
    # Mock items with different match types
    mock_items = [
        {"_id": "1", "item_name": "Apple", "barcode": "111111", "item_code": "A1"},
        {"_id": "2", "item_name": "Banana", "barcode": "222222", "item_code": "B1"},
        {"_id": "3", "item_name": "Appricot", "barcode": "333333", "item_code": "A2"},
    ]

    # Mock cursor
    mock_cursor = MagicMock()
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=mock_items)
    mock_db.erp_items.find.return_value = mock_cursor

    # Search for "App"
    response = await search_service.search(query="App")

    # "Apple" and "Appricot" should be higher than "Banana"
    # Actually "Banana" shouldn't even be there if it doesn't match "App"
    # But our mock returns all 3. The scoring logic should handle it.

    scored_ids = [item.id for item in response.items]
    assert "1" in scored_ids
    assert "3" in scored_ids
    # "Banana" might have a very low fuzzy score or 0
