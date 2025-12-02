"""
Enhanced Error Handler with Auto-Diagnosis
Decorators and utilities for automatic error diagnosis and self-healing
"""

import logging
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, TypeVar

from backend.services.auto_diagnosis import AutoDiagnosisService
from backend.utils.result_types import Result

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Global auto-diagnosis service instance
_auto_diagnosis = None


def get_auto_diagnosis() -> AutoDiagnosisService:
    """Get global auto-diagnosis service instance"""
    global _auto_diagnosis
    if _auto_diagnosis is None:
        _auto_diagnosis = AutoDiagnosisService()
    return _auto_diagnosis


async def _handle_async_error(
    func: Callable,
    args: tuple,
    kwargs: dict,
    e: Exception,
    diagnosis_service: Any,
    auto_fix: bool,
    log_diagnosis: bool,
    raise_on_critical: bool,
) -> Any:
    """Handle error in async context with diagnosis and auto-fix."""
    context = {
        "function": func.__name__,
        "module": func.__module__,
        "args": str(args)[:200],
        "kwargs": str(kwargs)[:200],
    }

    diagnosis = await diagnosis_service.diagnose_error(e, context)

    if log_diagnosis:
        logger.warning(
            f"Auto-diagnosis for {func.__name__}: "
            f"{diagnosis.category.value} - {diagnosis.root_cause} "
            f"[confidence: {diagnosis.confidence:.1%}]"
        )

    if auto_fix and diagnosis.auto_fixable:
        logger.info(f"Attempting auto-fix for {func.__name__}...")
        fix_result = await diagnosis_service.auto_fix_error(diagnosis, context)

        if fix_result.is_success:
            logger.info(f"Auto-fix successful for {func.__name__}")
            try:
                return await func(*args, **kwargs)
            except Exception as retry_error:
                retry_diagnosis = await diagnosis_service.diagnose_error(retry_error, context)
                logger.error(
                    f"Auto-fix retry failed for {func.__name__}: {retry_diagnosis.root_cause}"
                )
        else:
            logger.warning(f"Auto-fix failed for {func.__name__}: {fix_result._error_message}")

    if raise_on_critical and diagnosis.severity.value == "critical":
        logger.error(
            f"Critical error in {func.__name__}: {diagnosis.root_cause}. "
            f"Suggestions: {', '.join(diagnosis.suggestions[:3])}"
        )
        raise e

    return Result.error(e, diagnosis.root_cause)


def _handle_sync_error(
    func: Callable,
    args: tuple,
    kwargs: dict,
    e: Exception,
    diagnosis_service: Any,
    auto_fix: bool,
    log_diagnosis: bool,
    raise_on_critical: bool,
) -> Any:
    """Handle error in sync context with diagnosis and auto-fix."""
    context = {
        "function": func.__name__,
        "module": func.__module__,
        "args": str(args)[:200],
        "kwargs": str(kwargs)[:200],
    }

    import asyncio

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    diagnosis = loop.run_until_complete(diagnosis_service.diagnose_error(e, context))

    if log_diagnosis:
        logger.warning(
            f"Auto-diagnosis for {func.__name__}: "
            f"{diagnosis.category.value} - {diagnosis.root_cause} "
            f"[confidence: {diagnosis.confidence:.1%}]"
        )

    if auto_fix and diagnosis.auto_fixable:
        logger.info(f"Attempting auto-fix for {func.__name__}...")
        fix_result = loop.run_until_complete(diagnosis_service.auto_fix_error(diagnosis, context))

        if fix_result.is_success:
            logger.info(f"Auto-fix successful for {func.__name__}")
            try:
                return func(*args, **kwargs)
            except Exception:
                logger.error(f"Auto-fix retry failed for {func.__name__}")

    if raise_on_critical and diagnosis.severity.value == "critical":
        logger.error(f"Critical error in {func.__name__}: {diagnosis.root_cause}")
        raise e

    return Result.error(e, diagnosis.root_cause)


def with_auto_diagnosis(
    auto_fix: bool = False, log_diagnosis: bool = True, raise_on_critical: bool = True
):
    """
    Decorator for automatic error diagnosis and optional auto-fixing
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        import inspect

        if inspect.iscoroutinefunction(func):

            @wraps(func)
            async def async_wrapper(*args, **kwargs) -> Any:
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    return await _handle_async_error(
                        func,
                        args,
                        kwargs,
                        e,
                        get_auto_diagnosis(),
                        auto_fix,
                        log_diagnosis,
                        raise_on_critical,
                    )

            return async_wrapper
        else:

            @wraps(func)
            def sync_wrapper(*args, **kwargs) -> Any:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    return _handle_sync_error(
                        func,
                        args,
                        kwargs,
                        e,
                        get_auto_diagnosis(),
                        auto_fix,
                        log_diagnosis,
                        raise_on_critical,
                    )

            return sync_wrapper

    return decorator


async def diagnose_and_handle(
    error: Exception, context: Optional[Dict[str, Any]] = None, auto_fix: bool = False
) -> Result[Any, Exception]:
    """
    Diagnose error and optionally attempt auto-fix
    Returns Result type for functional error handling
    """
    diagnosis_service = get_auto_diagnosis()

    # Diagnose error
    diagnosis = await diagnosis_service.diagnose_error(error, context)

    # Log diagnosis
    logger.warning(
        f"Error diagnosed: {diagnosis.category.value} - {diagnosis.root_cause} "
        f"[confidence: {diagnosis.confidence:.1%}]"
    )

    # Attempt auto-fix if enabled
    if auto_fix and diagnosis.auto_fixable:
        logger.info("Attempting auto-fix...")
        fix_result = await diagnosis_service.auto_fix_error(diagnosis, context)

        if fix_result.is_success:
            logger.info("Auto-fix successful")
            return Result.success(fix_result.unwrap())
        else:
            logger.warning(f"Auto-fix failed: {fix_result._error_message}")

    # Return error result with diagnosis
    return Result.error(error, diagnosis.root_cause)


class SelfDiagnosingErrorHandler:
    """
    Self-diagnosing error handler class
    Can be used as context manager or standalone
    """

    def __init__(self, auto_fix: bool = False):
        self.auto_fix = auto_fix
        self.diagnosis_service = get_auto_diagnosis()
        self.errors = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            context = {"context_manager": True}
            diagnosis = await self.diagnosis_service.diagnose_error(exc_val, context)
            self.errors.append({"error": exc_val, "diagnosis": diagnosis.to_dict()})

            # Attempt auto-fix if enabled
            if self.auto_fix and diagnosis.auto_fixable:
                fix_result = await self.diagnosis_service.auto_fix_error(diagnosis, context)
                if fix_result.is_success:
                    return True  # Suppress exception

    async def execute(
        self, coro, context: Optional[Dict[str, Any]] = None
    ) -> Result[Any, Exception]:
        """Execute coroutine with auto-diagnosis"""
        try:
            result = await coro
            return Result.success(result)
        except Exception as e:
            diagnosis = await self.diagnosis_service.diagnose_error(e, context)

            # Attempt auto-fix if enabled
            if self.auto_fix and diagnosis.auto_fixable:
                fix_result = await self.diagnosis_service.auto_fix_error(diagnosis, context)
                if fix_result.is_success:
                    # Retry execution
                    try:
                        result = await coro
                        return Result.success(result)
                    except Exception as retry_error:
                        return Result.error(retry_error, "Auto-fix retry failed")

            return Result.error(e, diagnosis.root_cause)

    def get_diagnoses(self) -> List[Dict[str, Any]]:
        """Get all diagnoses from this handler"""
        return [e["diagnosis"] for e in self.errors]
