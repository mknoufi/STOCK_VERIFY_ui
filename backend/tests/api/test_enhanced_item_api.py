"""
Tests for Enhanced Item API
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.api.enhanced_item_api import (
    _validate_barcode_format,
    advanced_item_search,
    get_item_by_barcode_enhanced,
    get_unique_locations,
    init_enhanced_api,
)
from fastapi import HTTPException


@pytest.fixture(autouse=True)
def setup_mocks():
    mock_db = AsyncMock()
    # Configure aggregate to be synchronous (return cursor immediately)
    mock_db.erp_items.aggregate = MagicMock()

    mock_cache = AsyncMock()
    mock_monitoring = MagicMock()
    init_enhanced_api(mock_db, mock_cache, mock_monitoring)
    return mock_db, mock_cache, mock_monitoring


@pytest.mark.asyncio
async def test_validate_barcode_format():
    # Use valid prefix 51
    assert _validate_barcode_format("510001") == "510001"

    with pytest.raises(HTTPException) as exc:
        _validate_barcode_format(None)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_get_item_by_barcode_enhanced_mongodb(setup_mocks):
    mock_db, mock_cache, _ = setup_mocks

    # Mock MongoDB response
    mock_item = {
        "_id": "item123",
        "item_code": "CODE123",
        "barcode": "510001",
        "item_name": "Test Item"
    }
    mock_db.erp_items.find_one.return_value = mock_item

    # Mock Cache miss
    mock_cache.get_async.return_value = None

    request = MagicMock()
    current_user = {"username": "testuser"}

    response = await get_item_by_barcode_enhanced(
        barcode="510001",
        request=request,
        current_user=current_user,
        force_source=None  # Explicitly pass None to avoid Query object
    )

    assert response["item"]["item_code"] == "CODE123"
    assert response["metadata"]["source"] == "mongodb"

    # Verify cache set was called
    mock_cache.set_async.assert_called_once()


@pytest.mark.asyncio
async def test_get_item_by_barcode_enhanced_cache(setup_mocks):
    mock_db, mock_cache, _ = setup_mocks

    # Mock Cache hit
    cached_item = {
        "item": {
            "item_code": "CODE123",
            "barcode": "510001",
            "item_name": "Test Item"
        }
    }
    mock_cache.get_async.return_value = cached_item

    request = MagicMock()
    current_user = {"username": "testuser"}

    response = await get_item_by_barcode_enhanced(
        barcode="510001",
        request=request,
        current_user=current_user,
        force_source=None  # Explicitly pass None
    )

    assert response["item"]["item_code"] == "CODE123"
    assert response["metadata"]["source"] == "cache"

    # Verify DB was NOT called
    mock_db.erp_items.find_one.assert_not_called()


@pytest.mark.asyncio
async def test_get_item_by_barcode_enhanced_not_found(setup_mocks):
    mock_db, mock_cache, _ = setup_mocks

    mock_db.erp_items.find_one.return_value = None
    mock_cache.get_async.return_value = None

    request = MagicMock()
    current_user = {"username": "testuser"}

    with pytest.raises(HTTPException) as exc:
        await get_item_by_barcode_enhanced(
            barcode="519999",
            request=request,
            current_user=current_user,
            force_source=None  # Explicitly pass None
        )

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_advanced_item_search(setup_mocks):
    mock_db, _, _ = setup_mocks

    # Mock Aggregation response
    mock_results = [
        {
            "_id": "item1",
            "item_name": "Test Item 1",
            "item_code": "C1",
            "barcode": "B1",
            "relevance_score": 10
        },
        {
            "_id": "item2",
            "item_name": "Test Item 2",
            "item_code": "C2",
            "barcode": "B2",
            "relevance_score": 5
        }
    ]

    # Mock cursor
    mock_cursor = AsyncMock()
    mock_cursor.to_list.return_value = mock_results

    # Mock count result (second call to aggregate)
    mock_count_cursor = AsyncMock()
    mock_count_cursor.to_list.return_value = [{"total": 2}]

    # Configure aggregate to return different cursors
    mock_db.erp_items.aggregate.side_effect = [mock_cursor, mock_count_cursor]

    current_user = {"username": "testuser"}

    response = await advanced_item_search(
        query="Test",
        search_fields=["item_name", "item_code", "barcode"],
        limit=20,  # Explicitly pass limit
        offset=0,  # Explicitly pass offset
        current_user=current_user
    )

    assert len(response["items"]) == 2
    assert response["pagination"]["total"] == 2
    assert response["items"][0]["item_name"] == "Test Item 1"


@pytest.mark.asyncio
async def test_get_unique_locations(setup_mocks):
    mock_db, _, _ = setup_mocks

    mock_result = [{
        "floors": ["Floor 1", "Floor 2"],
        "racks": ["Rack A", "Rack B"]
    }]

    mock_cursor = AsyncMock()
    mock_cursor.to_list.return_value = mock_result
    mock_db.erp_items.aggregate.return_value = mock_cursor

    current_user = {"username": "testuser"}

    response = await get_unique_locations(current_user=current_user)

    assert response["floors"] == ["Floor 1", "Floor 2"]
    assert response["racks"] == ["Rack A", "Rack B"]
