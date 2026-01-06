from unittest.mock import AsyncMock

import pytest
from backend.api.item_verification_api import (
    ItemUpdateRequest,
    VerificationRequest,
    build_item_filter_query,
    init_verification_api,
    update_item_master,
    verify_item,
)
from fastapi import HTTPException


@pytest.fixture(autouse=True)
def setup_mocks():
    mock_db = AsyncMock()
    mock_cache = AsyncMock()
    init_verification_api(mock_db, mock_cache)
    return mock_db, mock_cache


@pytest.mark.asyncio
async def test_update_item_master_success(setup_mocks):
    mock_db, mock_cache = setup_mocks

    item_code = "CODE123"
    existing_item = {"item_code": item_code, "barcode": "510001", "mrp": 100.0}
    mock_db.erp_items.find_one.return_value = existing_item

    request = ItemUpdateRequest(mrp=150.0, sales_price=120.0, category="New Cat")
    current_user = {"username": "testuser"}

    response = await update_item_master(item_code, request, current_user)

    assert response["success"] is True

    # Verify DB update
    mock_db.erp_items.update_one.assert_called_once()
    call_args = mock_db.erp_items.update_one.call_args
    assert call_args[0][0] == {"item_code": item_code}
    update_doc = call_args[0][1]["$set"]
    assert update_doc["mrp"] == 150.0
    assert update_doc["sales_price"] == 120.0
    assert update_doc["category"] == "New Cat"
    assert update_doc["last_updated_by"] == "testuser"

    # Verify cache invalidation
    assert mock_cache.delete_async.call_count >= 1

    # Verify audit log
    mock_db.audit_logs.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_update_item_master_not_found(setup_mocks):
    mock_db, _ = setup_mocks
    mock_db.erp_items.find_one.return_value = None

    request = ItemUpdateRequest(mrp=150.0)
    current_user = {"username": "testuser"}

    with pytest.raises(HTTPException) as exc:
        await update_item_master("NONEXISTENT", request, current_user)

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_verify_item_success(setup_mocks):
    mock_db, mock_cache = setup_mocks

    item_code = "CODE123"
    existing_item = {
        "item_code": item_code,
        "stock_qty": 10.0,
        "floor": "Old Floor",
        "barcode": "510001",
    }
    # First find_one returns existing item, second find_one returns updated item
    updated_item = existing_item.copy()
    updated_item["_id"] = "mock_id"
    mock_db.erp_items.find_one.side_effect = [existing_item, updated_item]

    request = VerificationRequest(
        verified=True,
        verified_qty=8.0,
        damaged_qty=1.0,
        floor="New Floor",
        notes="Test notes",
    )
    current_user = {"username": "testuser"}

    response = await verify_item(item_code, request, current_user)

    assert response["success"] is True
    assert response["variance"] == -1.0  # 8 + 1 - 10 = -1

    # Verify DB update
    mock_db.erp_items.update_one.assert_called_once()
    call_args = mock_db.erp_items.update_one.call_args
    assert call_args[0][0] == {"item_code": item_code}
    update_doc = call_args[0][1]["$set"]
    assert update_doc["verified"] is True
    assert update_doc["verified_qty"] == 8.0
    assert update_doc["variance"] == -1.0
    assert update_doc["verified_floor"] == "New Floor"

    # Verify cache invalidation
    assert mock_cache.delete_async.call_count >= 1

    # Verify logs
    mock_db.verification_logs.insert_one.assert_called_once()
    mock_db.item_variances.insert_one.assert_called_once()  # Variance is not 0


def test_build_item_filter_query():
    # Test basic filters
    query = build_item_filter_query(category="Cat1", verified=True, search="Test")

    assert query["category"] == {"$regex": "Cat1", "$options": "i"}
    assert query["verified"] is True
    assert "$or" in query
    assert len(query["$or"]) == 3

    # Test empty filters
    query = build_item_filter_query()
    assert query == {}
