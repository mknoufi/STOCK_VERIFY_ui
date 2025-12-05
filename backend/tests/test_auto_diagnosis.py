from unittest.mock import Mock

import pytest

from backend.services.auto_diagnosis import (
    AutoDiagnosisService,
    ErrorCategory,
    ErrorSeverity,
)
from backend.utils.result_types import Result


@pytest.fixture
def auto_diagnosis_service():
    return AutoDiagnosisService()


@pytest.mark.asyncio
async def test_diagnose_database_connection_error(auto_diagnosis_service):
    error = Exception("could not connect to database")
    diagnosis = await auto_diagnosis_service.diagnose_error(error)

    assert diagnosis.category == ErrorCategory.DATABASE
    assert diagnosis.severity == ErrorSeverity.HIGH
    # Note: root_cause might be "Database connection failure" OR "Connection detected" depending on pattern match
    # "could not connect" is in "connection" pattern -> DATABASE.
    # _diagnose_database_error checks if "connection" in error_str. "could not connect" has "connect", not "connection".
    # So it might return generic pattern match cause.
    # Let's check what it returns.
    # If _diagnose_database_error returns empty, it falls back to generic pattern match.
    # Generic pattern match for "connection" pattern returns "Connection detected" (title cased pattern name).
    # Wait, pattern name is "connection", so "Connection detected".
    # Let's assert category and severity primarily.
    assert diagnosis.category == ErrorCategory.DATABASE
    assert len(diagnosis.suggestions) > 0


@pytest.mark.asyncio
async def test_diagnose_network_timeout_error(auto_diagnosis_service):
    error = TimeoutError("network timeout")
    diagnosis = await auto_diagnosis_service.diagnose_error(error)

    assert diagnosis.category == ErrorCategory.NETWORK
    assert diagnosis.severity == ErrorSeverity.MEDIUM
    assert "Network timeout" in diagnosis.root_cause
    # auto_fixable might be False if not in registry or pattern list for network timeout specifically
    # "connection timeout" is in auto_fixable_patterns, "network timeout" is not explicitly there unless mapped
    # Let's check _check_auto_fixable logic
    # It checks "connection timeout" in error_str. "network timeout" is not there.
    # So let's use "connection timeout" but ensure it maps to NETWORK if possible, OR just check what it actually does.
    # Wait, "connection timeout" maps to DATABASE in patterns.
    # Let's use "network error" which maps to NETWORK, but might not be auto-fixable.
    # Let's stick to "connection timeout" and expect DATABASE if that's what the code does, OR change code.
    # But I want to test NETWORK category.
    # "network error" -> NETWORK.
    # Is it auto-fixable? No, unless registered.
    # "TimeoutError:network" is registered in _register_auto_fixes.
    # So if I use TimeoutError and it classifies as NETWORK, it should be auto-fixable.
    # "network timeout" matches "timeout" -> NETWORK (default classification for TimeoutError is NETWORK, MEDIUM).
    # And "network timeout" matches "timeout" in _diagnose_network_error.

    assert diagnosis.auto_fixable is True


@pytest.mark.asyncio
async def test_diagnose_auth_error(auto_diagnosis_service):
    error = Exception("token expired")
    diagnosis = await auto_diagnosis_service.diagnose_error(error)

    assert diagnosis.category == ErrorCategory.AUTHENTICATION
    assert diagnosis.severity == ErrorSeverity.HIGH
    assert "Authentication token expired" in diagnosis.root_cause
    assert diagnosis.auto_fixable is True


@pytest.mark.asyncio
async def test_diagnose_validation_error(auto_diagnosis_service):
    error = ValueError("invalid input")
    diagnosis = await auto_diagnosis_service.diagnose_error(error)

    assert diagnosis.category == ErrorCategory.VALIDATION
    assert diagnosis.severity == ErrorSeverity.LOW
    assert "Input validation failed" in diagnosis.root_cause


@pytest.mark.asyncio
async def test_diagnose_resource_error(auto_diagnosis_service):
    error = MemoryError("out of memory")
    diagnosis = await auto_diagnosis_service.diagnose_error(error)

    assert diagnosis.category == ErrorCategory.RESOURCE
    assert diagnosis.severity == ErrorSeverity.CRITICAL
    assert "Memory exhaustion" in diagnosis.root_cause


@pytest.mark.asyncio
async def test_diagnosis_caching(auto_diagnosis_service):
    error = Exception("cached error")

    # First call
    diagnosis1 = await auto_diagnosis_service.diagnose_error(error)

    # Second call (should be cached)
    diagnosis2 = await auto_diagnosis_service.diagnose_error(error)

    assert diagnosis1 is diagnosis2


@pytest.mark.asyncio
async def test_auto_fix_error_success(auto_diagnosis_service):
    # Mock an auto-fixable error
    error = Exception("token expired")
    diagnosis = await auto_diagnosis_service.diagnose_error(error)

    assert diagnosis.auto_fixable is True

    # Mock the auto-fix function to return success
    diagnosis.auto_fix = Mock(return_value=Result.success("Fixed"))

    result = await auto_diagnosis_service.auto_fix_error(diagnosis)
    assert result.is_success
    assert result.unwrap() == "Fixed"


@pytest.mark.asyncio
async def test_auto_fix_error_not_fixable(auto_diagnosis_service):
    error = ValueError("not fixable")
    diagnosis = await auto_diagnosis_service.diagnose_error(error)

    assert diagnosis.auto_fixable is False

    result = await auto_diagnosis_service.auto_fix_error(diagnosis)
    assert result.is_error
    assert "not auto-fixable" in str(result._error)


@pytest.mark.asyncio
async def test_get_error_statistics(auto_diagnosis_service):
    # Add some errors
    await auto_diagnosis_service.diagnose_error(Exception("could not connect"))
    await auto_diagnosis_service.diagnose_error(ValueError("invalid input"))

    stats = await auto_diagnosis_service.get_error_statistics()

    assert stats["total_errors"] == 2
    assert stats["categories"][ErrorCategory.DATABASE.value] == 1
    assert stats["categories"][ErrorCategory.VALIDATION.value] == 1


@pytest.mark.asyncio
async def test_health_check(auto_diagnosis_service):
    async def healthy_check():
        return "ok"

    async def failing_check():
        raise Exception("check failed")

    auto_diagnosis_service.register_health_check(healthy_check)
    auto_diagnosis_service.register_health_check(failing_check)

    report = await auto_diagnosis_service.health_check()

    assert report["status"] == "degraded"
    assert report["checks"]["healthy_check"] == "ok"
    assert len(report["diagnoses"]) == 1
    assert report["diagnoses"][0]["error_message"] == "check failed"
