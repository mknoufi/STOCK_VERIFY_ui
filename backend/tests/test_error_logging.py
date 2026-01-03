"""
Tests for error logging feature
"""

from datetime import datetime

import pytest

from backend.services.error_log import ErrorLogService


@pytest.mark.asyncio
async def test_error_log_service_writes_document(test_db):
    service = ErrorLogService(test_db)  # type: ignore[arg-type]

    error_id = await service.log_error(
        ValueError("boom"),
        endpoint="/api/test",
        method="GET",
        user="tester",
        role="staff",
        ip_address="127.0.0.1",
        user_agent="pytest",
        request_data={"x": "1"},
        context={"feature": "error-log"},
    )

    assert error_id

    doc = await test_db.error_logs.find_one({"_id": error_id})
    assert doc is not None
    assert doc["error_type"] == "ValueError"
    assert doc["error_message"] == "boom"
    assert doc["endpoint"] == "/api/test"
    assert doc["method"] == "GET"
    assert doc["user"] == "tester"
    assert doc["role"] == "staff"
    assert doc["resolved"] is False
    assert isinstance(doc["timestamp"], datetime)


@pytest.mark.asyncio
async def test_log_http_error_stores_severity_and_code(test_db):
    service = ErrorLogService(test_db)  # type: ignore[arg-type]

    error_id = await service.log_http_error(
        status_code=404,
        detail={"message": "Not found", "code": "NOT_FOUND"},
        endpoint="/api/missing",
        method="GET",
        user="tester",
        role="staff",
    )

    doc = await test_db.error_logs.find_one({"_id": error_id})
    assert doc is not None
    assert doc["error_type"] == "HTTP404"
    assert doc["severity"] == "error"
    assert doc["error_code"] == "NOT_FOUND"
    assert doc["endpoint"] == "/api/missing"


@pytest.mark.asyncio
async def test_get_errors_filters_by_severity(test_db):
    service = ErrorLogService(test_db)  # type: ignore[arg-type]

    await service.log_http_error(
        status_code=404,
        detail="Not found",
        endpoint="/api/missing",
        method="GET",
    )
    await service.log_http_error(
        status_code=500,
        detail="Server error",
        endpoint="/api/fail",
        method="POST",
    )

    critical = await service.get_errors(severity="critical", page=1, page_size=10)
    assert len(critical["errors"]) == 1
    assert critical["errors"][0]["error_type"] == "HTTP500"
