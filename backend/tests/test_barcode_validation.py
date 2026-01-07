from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from backend.api import enhanced_item_api, erp_api
from backend.auth.dependencies import get_current_user, get_current_user_async
from backend.server import app

client = TestClient(app)

# Mock dependencies to avoid 503 and AttributeError
enhanced_item_api.db = MagicMock()
enhanced_item_api.db.erp_items.find_one = AsyncMock(return_value=None)
enhanced_item_api.cache_service = MagicMock()
enhanced_item_api.cache_service.get_item = AsyncMock(return_value=None)
enhanced_item_api.cache_service.get_async = AsyncMock(return_value=None)
enhanced_item_api.cache_service.set_async = AsyncMock()
enhanced_item_api.cache_service.get = AsyncMock(return_value=None)
enhanced_item_api.cache_service.set = AsyncMock()

# enhanced_item_api.monitoring_service left as None to test the safe navigation we just added,
# or we can mock it. Let's mock it to be sure.
enhanced_item_api.monitoring_service = MagicMock()
enhanced_item_api.monitoring_service.track_request = AsyncMock()

erp_api._db = MagicMock()
erp_api._db.erp_items.find_one = AsyncMock(return_value=None)
erp_api._cache_service = MagicMock()
erp_api._cache_service.get_item = AsyncMock(return_value=None)
erp_api._cache_service.get = AsyncMock(return_value=None)
erp_api._cache_service.set = AsyncMock()


# Mock Authentication
async def mock_get_current_user():
    return {"username": "testuser", "role": "admin"}


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = mock_get_current_user
    app.dependency_overrides[get_current_user_async] = mock_get_current_user
    yield
    # Clean up overrides
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_user_async, None)


@pytest.mark.parametrize(
    "barcode",
    [
        "123456",  # Wrong prefix
        "610000",  # Wrong prefix
        "500000",  # Wrong prefix
        "540000",  # Wrong prefix
        "51000",  # Too short (5)
        "5200000",  # Too long (7)
        "ABCDEF",  # Non-numeric
        "51000A",  # Mixed
    ],
)
def test_invalid_barcodes(barcode):
    """Test that invalid barcodes are rejected with 400."""

    # Enhanced API
    response = client.get(f"/api/v2/erp/items/barcode/{barcode}/enhanced")
    if response.status_code != 400:
        print(f"\nEnhanced API Response for {barcode}: {response.status_code} - {response.text}")
    assert (
        response.status_code == 400
    ), f"Invalid barcode {barcode} should be rejected by Enhanced API. Got {response.status_code}"
    # Check for specific error message if possible, but status 400 is the main requirement

    # ERP API
    response = client.get(f"/api/erp/items/barcode/{barcode}")
    if response.status_code != 400:
        print(f"\nERP API Response for {barcode}: {response.status_code} - {response.text}")
    assert (
        response.status_code == 400
    ), f"Invalid barcode {barcode} should be rejected by ERP API. Got {response.status_code}"
