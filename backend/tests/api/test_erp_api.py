from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.api.erp_api import (
    _normalize_barcode_input,
    get_all_items,
    get_item_by_barcode,
    init_erp_api,
    refresh_item_stock,
    search_items_compatibility,
)
from fastapi import HTTPException


@pytest.fixture(autouse=True)
def setup_mocks():
    mock_db = AsyncMock()
    # Fix: find() is synchronous and returns a cursor, so it shouldn't be an AsyncMock
    mock_db.erp_items.find = MagicMock()
    mock_cache = AsyncMock()
    init_erp_api(mock_db, mock_cache)
    return mock_db, mock_cache


@pytest.mark.asyncio
async def test_normalize_barcode_input():
    # Valid cases
    assert _normalize_barcode_input("510001") == "510001"
    assert _normalize_barcode_input("520001") == "520001"
    assert _normalize_barcode_input("530001") == "530001"

    # Invalid cases
    with pytest.raises(HTTPException) as exc:
        _normalize_barcode_input("123456")
    assert exc.value.status_code == 400
    assert "Invalid barcode prefix" in exc.value.detail["message"]

    with pytest.raises(HTTPException) as exc:
        _normalize_barcode_input("51001")  # Too short
    assert exc.value.status_code == 400
    assert "must be exactly 6 digits" in exc.value.detail["message"]

    with pytest.raises(HTTPException) as exc:
        # Fix: Pass allow_alphanumeric=False to enforce numeric check
        _normalize_barcode_input("ABCDEF", allow_alphanumeric=False)  # Not numeric
    assert exc.value.status_code == 400
    assert "must be numeric" in exc.value.detail["message"]


@pytest.mark.asyncio
async def test_get_item_by_barcode_cache_hit(setup_mocks):
    mock_db, mock_cache = setup_mocks

    cached_item = {
        "item_code": "CODE123",
        "barcode": "510001",
        "item_name": "Test Item",
        "stock_qty": 10.0,
        "selling_price": 100.0,
    }
    mock_cache.get.return_value = cached_item

    current_user = {"username": "testuser"}

    response = await get_item_by_barcode(barcode="510001", current_user=current_user)

    assert response.item_code == "CODE123"
    # Fix: find_one is async, so we check the async mock
    mock_db.erp_items.find_one.assert_not_called()


@pytest.mark.asyncio
async def test_get_item_by_barcode_db_hit(setup_mocks):
    mock_db, mock_cache = setup_mocks

    mock_cache.get.return_value = None

    db_item = {
        "item_code": "CODE123",
        "barcode": "510001",
        "item_name": "Test Item",
        "stock_qty": 10.0,
        "selling_price": 100.0,
    }
    mock_db.erp_items.find_one.return_value = db_item

    current_user = {"username": "testuser"}

    response = await get_item_by_barcode(barcode="510001", current_user=current_user)

    assert response.item_code == "CODE123"
    mock_cache.set.assert_called_once()


@pytest.mark.asyncio
async def test_get_item_by_barcode_not_found(setup_mocks):
    mock_db, mock_cache = setup_mocks

    mock_cache.get.return_value = None
    mock_db.erp_items.find_one.return_value = None

    current_user = {"username": "testuser"}

    with pytest.raises(HTTPException) as exc:
        await get_item_by_barcode(barcode="510001", current_user=current_user)

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_refresh_item_stock(setup_mocks):
    mock_db, _ = setup_mocks

    db_item = {
        "item_code": "CODE123",
        "barcode": "510001",
        "item_name": "Test Item",
        "stock_qty": 10.0,
        "selling_price": 100.0,
    }
    mock_db.erp_items.find_one.return_value = db_item

    request = MagicMock()
    current_user = {"username": "testuser"}

    response = await refresh_item_stock(
        request=request, item_code="CODE123", current_user=current_user
    )

    assert response["success"] is True
    assert response["item"].item_code == "CODE123"


@pytest.mark.asyncio
async def test_get_all_items_search(setup_mocks):
    mock_db, _ = setup_mocks

    mock_items = [
        {
            "item_code": "CODE1",
            "barcode": "510001",
            "item_name": "Test Item 1",
            "stock_qty": 10.0,
            "selling_price": 100.0,
        }
    ]

    # Fix: Mock cursor chaining correctly
    mock_cursor = MagicMock()
    mock_cursor.skip.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=mock_items)

    mock_db.erp_items.find.return_value = mock_cursor
    mock_db.erp_items.count_documents.return_value = 1

    current_user = {"username": "testuser"}

    response = await get_all_items(search="Test", current_user=current_user, page=1, page_size=10)

    assert len(response["items"]) == 1
    assert response["items"][0].item_code == "CODE1"
    assert response["pagination"]["total"] == 1


@pytest.mark.asyncio
async def test_search_items_compatibility(setup_mocks):
    mock_db, _ = setup_mocks

    mock_items = [
        {
            "item_code": "CODE1",
            "barcode": "510001",
            "item_name": "Test Item 1",
            "stock_qty": 10.0,
            "selling_price": 100.0,
        }
    ]

    # Fix: Mock cursor chaining correctly
    mock_cursor = MagicMock()
    mock_cursor.skip.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=mock_items)

    mock_db.erp_items.find.return_value = mock_cursor
    mock_db.erp_items.count_documents.return_value = 1

    current_user = {"username": "testuser"}

    # Fix: Pass explicit page and page_size to avoid Query object issues
    response = await search_items_compatibility(
        query="Test", current_user=current_user, page=1, page_size=50
    )

    assert len(response["items"]) == 1
    assert response["items"][0].item_code == "CODE1"
