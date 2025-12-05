from unittest.mock import AsyncMock, patch

import pytest

from backend.services.auto_diagnosis import DiagnosisResult, ErrorCategory, ErrorSeverity
from backend.utils.error_handler_with_diagnosis import (
    SelfDiagnosingErrorHandler,
    diagnose_and_handle,
    with_auto_diagnosis,
)
from backend.utils.result_types import Result


@pytest.fixture
def mock_diagnosis_service():
    with patch("backend.utils.error_handler_with_diagnosis.get_auto_diagnosis") as mock_get:
        service = AsyncMock()
        mock_get.return_value = service
        yield service


@pytest.mark.asyncio
async def test_with_auto_diagnosis_async_success(mock_diagnosis_service):
    @with_auto_diagnosis()
    async def success_func():
        return "success"

    result = await success_func()
    assert result == "success"
    mock_diagnosis_service.diagnose_error.assert_not_called()


@pytest.mark.asyncio
async def test_with_auto_diagnosis_async_error(mock_diagnosis_service):
    error = ValueError("test error")

    # Setup mock diagnosis
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.VALIDATION,
        severity=ErrorSeverity.LOW,
        root_cause="Validation failed",
        suggestions=[],
        auto_fixable=False,
    )
    mock_diagnosis_service.diagnose_error.return_value = diagnosis

    @with_auto_diagnosis(raise_on_critical=False)
    async def failing_func():
        raise error

    result = await failing_func()

    assert result.is_error
    assert "Validation failed" in str(result._error_message)
    mock_diagnosis_service.diagnose_error.assert_called_once()


@pytest.mark.asyncio
async def test_with_auto_diagnosis_auto_fix_success(mock_diagnosis_service):
    error = Exception("fixable error")

    # Setup mock diagnosis
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.NETWORK,
        severity=ErrorSeverity.MEDIUM,
        root_cause="Network glitch",
        suggestions=[],
        auto_fixable=True,
    )
    mock_diagnosis_service.diagnose_error.return_value = diagnosis
    mock_diagnosis_service.auto_fix_error.return_value = Result.success("fixed")

    # Mock function that fails first time then succeeds (simulated by auto-fix retry logic)
    # Actually, the decorator retries the function call.
    # So we need the function to succeed on second call?
    # Or does the decorator return the result of auto-fix?
    # The decorator code:
    # if fix_result.is_success:
    #     return await func(*args, **kwargs)

    call_count = 0

    @with_auto_diagnosis(auto_fix=True)
    async def fixable_func():
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise error
        return "success_after_fix"

    result = await fixable_func()

    assert result == "success_after_fix"
    assert call_count == 2
    mock_diagnosis_service.auto_fix_error.assert_called_once()


@pytest.mark.asyncio
async def test_diagnose_and_handle(mock_diagnosis_service):
    error = ValueError("test error")
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.VALIDATION,
        severity=ErrorSeverity.LOW,
        root_cause="Validation failed",
        suggestions=[],
        auto_fixable=False,
    )
    mock_diagnosis_service.diagnose_error.return_value = diagnosis

    result = await diagnose_and_handle(error)

    assert result.is_error
    assert "Validation failed" in str(result._error_message)


@pytest.mark.asyncio
async def test_self_diagnosing_error_handler_context_manager(mock_diagnosis_service):
    error = ValueError("test error")
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.VALIDATION,
        severity=ErrorSeverity.LOW,
        root_cause="Validation failed",
        suggestions=[],
        auto_fixable=False,
    )
    mock_diagnosis_service.diagnose_error.return_value = diagnosis

    with pytest.raises(ValueError):
        async with SelfDiagnosingErrorHandler() as handler:
            raise error

    assert len(handler.errors) == 1
    assert handler.errors[0]["error"] == error


@pytest.mark.asyncio
async def test_self_diagnosing_error_handler_execute(mock_diagnosis_service):
    async def success_coro():
        return "success"

    handler = SelfDiagnosingErrorHandler()
    result = await handler.execute(success_coro())

    assert result.is_success
    assert result.unwrap() == "success"


@pytest.mark.asyncio
async def test_self_diagnosing_error_handler_execute_error(mock_diagnosis_service):
    error = ValueError("test error")
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.VALIDATION,
        severity=ErrorSeverity.LOW,
        root_cause="Validation failed",
        suggestions=[],
        auto_fixable=False,
    )
    mock_diagnosis_service.diagnose_error.return_value = diagnosis

    async def failing_coro():
        raise error

    handler = SelfDiagnosingErrorHandler()
    result = await handler.execute(failing_coro())

    assert result.is_error
    assert "Validation failed" in str(result._error_message)


def test_with_auto_diagnosis_sync_success(mock_diagnosis_service):
    @with_auto_diagnosis()
    def success_func():
        return "success"

    result = success_func()
    assert result == "success"
    mock_diagnosis_service.diagnose_error.assert_not_called()


def test_with_auto_diagnosis_sync_error(mock_diagnosis_service):
    error = ValueError("test error")
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.VALIDATION,
        severity=ErrorSeverity.LOW,
        root_cause="Validation failed",
        suggestions=[],
        auto_fixable=False,
    )
    # We need to mock the loop.run_until_complete since sync wrapper uses it
    with patch("asyncio.get_event_loop") as mock_loop:
        mock_loop.return_value.run_until_complete.return_value = diagnosis

        @with_auto_diagnosis(raise_on_critical=False)
        def failing_func():
            raise error

        result = failing_func()

        assert result.is_error
        assert "Validation failed" in str(result._error_message)


@pytest.mark.asyncio
async def test_with_auto_diagnosis_critical_error(mock_diagnosis_service):
    error = ValueError("critical error")
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.RESOURCE,
        severity=ErrorSeverity.CRITICAL,
        root_cause="Critical failure",
        suggestions=[],
        auto_fixable=False,
    )
    mock_diagnosis_service.diagnose_error.return_value = diagnosis

    @with_auto_diagnosis(raise_on_critical=True)
    async def critical_func():
        raise error

    with pytest.raises(ValueError):
        await critical_func()


@pytest.mark.asyncio
async def test_diagnose_and_handle_auto_fix(mock_diagnosis_service):
    error = ValueError("fixable error")
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.NETWORK,
        severity=ErrorSeverity.MEDIUM,
        root_cause="Network glitch",
        suggestions=[],
        auto_fixable=True,
    )
    mock_diagnosis_service.diagnose_error.return_value = diagnosis
    mock_diagnosis_service.auto_fix_error.return_value = Result.success("fixed")

    result = await diagnose_and_handle(error, auto_fix=True)

    assert result.is_success
    assert result.unwrap() == "fixed"


@pytest.mark.asyncio
async def test_self_diagnosing_error_handler_context_manager_auto_fix(mock_diagnosis_service):
    error = ValueError("fixable error")
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.NETWORK,
        severity=ErrorSeverity.MEDIUM,
        root_cause="Network glitch",
        suggestions=[],
        auto_fixable=True,
    )
    mock_diagnosis_service.diagnose_error.return_value = diagnosis
    mock_diagnosis_service.auto_fix_error.return_value = Result.success("fixed")

    async with SelfDiagnosingErrorHandler(auto_fix=True) as handler:
        raise error

    # Exception should be suppressed
    assert len(handler.errors) == 1


@pytest.mark.asyncio
async def test_get_diagnoses(mock_diagnosis_service):
    error = ValueError("test error")
    diagnosis = DiagnosisResult(
        error=error,
        category=ErrorCategory.VALIDATION,
        severity=ErrorSeverity.LOW,
        root_cause="Validation failed",
        suggestions=[],
        auto_fixable=False,
    )
    mock_diagnosis_service.diagnose_error.return_value = diagnosis

    handler = SelfDiagnosingErrorHandler()
    with pytest.raises(ValueError):
        async with handler:
            raise error

    diagnoses = handler.get_diagnoses()
    assert len(diagnoses) == 1
    assert diagnoses[0]["root_cause"] == "Validation failed"
