import pytest
from httpx import AsyncClient
from backend.api.item_verification_api import init_verification_api

@pytest.mark.asyncio
async def test_verify_item_with_damage_types(async_client: AsyncClient, test_db, authenticated_headers):
    # Ensure verification API is initialized with the test DB
    init_verification_api(test_db)

    # 1. Setup: Create an item
    item_code = "TEST_ITEM_001"
    stock_qty = 10.0
    await test_db.erp_items.insert_one({
        "item_code": item_code,
        "item_name": "Test Item",
        "stock_qty": stock_qty,
        "mrp": 100.0,
        "category": "Test",
        "verified": False
    })

    # 2. Verify item with damage types
    # Scenario: 5 Good, 2 Returnable Damage, 3 Non-Returnable Damage
    # Total Assets = 5 + 2 = 7 (Non-returnable is usually excluded from assets or handled differently, 
    # but based on previous code: variance = (verified_qty + damaged_qty) - system_qty)
    # Variance = (5 + 2) - 10 = -3
    
    payload = {
        "verified": True,
        "verified_qty": 5.0,
        "damaged_qty": 2.0,
        "non_returnable_damaged_qty": 3.0,
        "item_condition": "Damaged",
        "notes": "Test verification"
    }

    response = await async_client.patch(
        f"/api/v2/erp/items/{item_code}/verify",
        json=payload,
        headers=authenticated_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["variance"] == -3.0

    # 3. Verify DB state
    item = await test_db.erp_items.find_one({"item_code": item_code})
    assert item["verified"] is True
    assert item["verified_qty"] == 5.0
    assert item["damaged_qty"] == 2.0
    assert item["non_returnable_damaged_qty"] == 3.0
    assert item["variance"] == -3.0

    # 4. Verify Verification Log
    log = await test_db.verification_logs.find_one({"item_code": item_code})
    assert log is not None
    assert log["verified_qty"] == 5.0
    assert log["damaged_qty"] == 2.0
    assert log["non_returnable_damaged_qty"] == 3.0
    assert log["variance"] == -3.0

@pytest.mark.asyncio
async def test_verify_item_calculation_logic(async_client: AsyncClient, test_db, authenticated_headers):
    # Ensure verification API is initialized with the test DB
    init_verification_api(test_db)

    item_code = "TEST_CALC_001"
    stock_qty = 100.0
    await test_db.erp_items.insert_one({
        "item_code": item_code,
        "item_name": "Calc Test Item",
        "stock_qty": stock_qty,
        "verified": False
    })

    # Scenario: 
    # Verified (Good): 90
    # Returnable Damage: 5
    # Non-Returnable Damage: 2
    # Total Counted for Variance = 90 + 5 = 95
    # Variance = 95 - 100 = -5
    
    payload = {
        "verified": True,
        "verified_qty": 90.0,
        "damaged_qty": 5.0,
        "non_returnable_damaged_qty": 2.0
    }

    response = await async_client.patch(
        f"/api/v2/erp/items/{item_code}/verify",
        json=payload,
        headers=authenticated_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["variance"] == -5.0
