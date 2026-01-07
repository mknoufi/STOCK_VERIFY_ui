from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import backend.server as server_module
from backend.api.enhanced_item_api import init_enhanced_api
from backend.auth.dependencies import get_current_user_async
from backend.server import app
from backend.tests.utils.in_memory_db import setup_server_with_in_memory_db


@pytest.fixture
def client(monkeypatch):
    db = setup_server_with_in_memory_db(monkeypatch)

    # Initialize enhanced_item_api with the mock db
    # We also need cache_service and monitoring_service
    # setup_server_with_in_memory_db sets server_module.cache_service
    # We can mock monitoring_service

    mock_monitoring = MagicMock()
    init_enhanced_api(db, server_module.cache_service, mock_monitoring)

    return TestClient(app)


def test_search_includes_item_code_and_barcode(client, monkeypatch):
    # Mock the current user to bypass auth
    async def mock_get_current_user():
        return {"username": "testuser", "role": "admin", "id": "123"}

    app.dependency_overrides[get_current_user_async] = mock_get_current_user

    # Mock the aggregate method
    async def mock_to_list_items(*args, **kwargs):
        return [
            {
                "item_code": "TEST1234",
                "item_name": "Test Item",
                "barcode": "123456789",
                "score": 1.0,
                "_id": "fake_id",
            }
        ]

    async def mock_to_list_count(*args, **kwargs):
        return [{"total": 1}]

    mock_cursor_items = MagicMock()
    mock_cursor_items.to_list = mock_to_list_items

    mock_cursor_count = MagicMock()
    mock_cursor_count.to_list = mock_to_list_count

    # We need a way to capture the pipeline
    captured_pipeline = []

    def mock_aggregate_func(pipeline, **kwargs):
        captured_pipeline.append(pipeline)
        # Check if it is a count query
        if any("$count" in stage for stage in pipeline):
            return mock_cursor_count
        return mock_cursor_items

    # Patch the aggregate method on the erp_items collection of the in-memory db
    # server_module.db is the InMemoryDatabase instance set by setup_server_with_in_memory_db
    server_module.db.erp_items.aggregate = mock_aggregate_func

    # Perform the search
    response = client.get("/api/v2/erp/items/search/advanced", params={"query": "TEST1234"})

    # Clean up dependency override
    app.dependency_overrides = {}

    assert response.status_code == 200

    # Verify the pipeline
    assert len(captured_pipeline) > 0
    pipeline = captured_pipeline[0]

    # Find the $match stage
    match_stage = next((stage for stage in pipeline if "$match" in stage), None)
    assert match_stage is not None, "Pipeline should contain a $match stage"

    # Check if $or condition includes item_code and barcode
    # The structure is usually {"$or": [{"field": regex}, ...]}
    match_query = match_stage["$match"]

    # If the query is simple, it might not use $or if only one field was selected (which was the bug)
    # But now it should use $or because we added multiple fields.

    assert "$or" in match_query, "Query should use $or to search multiple fields"

    or_conditions = match_query["$or"]
    fields_searched = set()
    for condition in or_conditions:
        fields_searched.update(condition.keys())

    print(f"Fields searched: {fields_searched}")

    assert "item_code" in fields_searched, "Should search in item_code"
    assert "barcode" in fields_searched, "Should search in barcode"
    assert "item_name" in fields_searched, "Should search in item_name"
