"""
Auto Recovery Service
Automatically recovers from errors and provides fallback mechanisms
"""

import asyncio
import logging
import random
import time
import traceback
from collections.abc import Callable
from enum import Enum
from functools import wraps
from typing import Any, Optional

logger = logging.getLogger(__name__)


class RecoveryStrategy(Enum):
    """Recovery strategies for different error types"""

    RETRY = "retry"
    FALLBACK = "fallback"
    CACHE = "cache"
    DEFAULT = "default"
    SKIP = "skip"


def _calculate_backoff(retry_delay: float, retry_count: int) -> float:
    """Calculate exponential backoff with jitter."""
    return (retry_delay * (2 ** (retry_count - 1))) + random.uniform(0, 0.5)


def _build_error_info(
    e: Exception,
    retry_count: int,
    strategy: RecoveryStrategy,
    context: Optional[dict[str, Any]],
) -> dict[str, Any]:
    """Build error info dictionary for history."""
    return {
        "error": str(e),
        "type": type(e).__name__,
        "retry_count": retry_count,
        "strategy": strategy.value,
        "context": context or {},
        "traceback": traceback.format_exc(),
    }


class AutoRecovery:
    """Automatic error recovery system"""

    def __init__(self):
        self.recovery_stats = {
            "total_recoveries": 0,
            "successful_recoveries": 0,
            "failed_recoveries": 0,
            "retry_count": 0,
            "fallback_used": 0,
            "cache_used": 0,
        }
        self.error_history = []
        self.max_history = 100

    def _record_error(
        self,
        e: Exception,
        retry_count: int,
        strategy: RecoveryStrategy,
        context: Optional[dict[str, Any]],
        max_retries: int,
    ) -> None:
        """Record error in history and stats."""
        self.recovery_stats["total_recoveries"] += 1
        error_info = _build_error_info(e, retry_count, strategy, context)
        self.error_history.append(error_info)
        if len(self.error_history) > self.max_history:
            self.error_history.pop(0)
        logger.warning(f"Error occurred (attempt {retry_count}/{max_retries}): {e!s}")

    def _log_success(self, retry_count: int) -> None:
        """Log successful recovery after retries."""
        self.recovery_stats["successful_recoveries"] += 1
        self.recovery_stats["retry_count"] += retry_count
        logger.info(f"Successfully recovered after {retry_count} retries")

    def _handle_fallback(
        self, fallback: Callable, is_async: bool = False
    ) -> tuple[Any, bool, Optional[str]]:
        """Execute sync fallback and return result tuple."""
        try:
            self.recovery_stats["fallback_used"] += 1
            logger.info("Using fallback operation")
            result = fallback()
            self.recovery_stats["successful_recoveries"] += 1
            return result, True, None
        except Exception as e:
            logger.error(f"Fallback also failed: {e!s}")
            self.recovery_stats["failed_recoveries"] += 1
            return None, False, str(e)

    def _handle_default(self, default_value: Any) -> tuple[Any, bool, Optional[str]]:
        """Handle default value strategy."""
        logger.info("Using default value")
        self.recovery_stats["successful_recoveries"] += 1
        return default_value, True, "Used default value"

    def _handle_failure(self, last_error: Optional[Exception]) -> tuple[None, bool, str]:
        """Handle final failure after all attempts exhausted."""
        self.recovery_stats["failed_recoveries"] += 1
        error_msg = f"All recovery attempts failed: {last_error!s}"
        logger.error(error_msg)
        return None, False, error_msg

    def recover(
        self,
        operation: Callable,
        strategy: RecoveryStrategy = RecoveryStrategy.RETRY,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        fallback: Optional[Callable] = None,
        default_value: Any = None,
        context: dict[str, Optional[Any]] = None,
    ) -> tuple[Any, bool, Optional[str]]:
        """
        Attempt to recover from an error

        Returns:
            Tuple of (result, success, error_message)
        """
        last_error = None

        for retry_count in range(1, max_retries + 1):
            try:
                result = operation()
                if retry_count > 1:
                    self._log_success(retry_count - 1)
                return result, True, None
            except Exception as e:
                last_error = e
                self._record_error(e, retry_count, strategy, context, max_retries)
                if retry_count < max_retries:
                    wait_time = _calculate_backoff(retry_delay, retry_count)
                    logger.debug(f"Waiting {wait_time:.2f}s before retry {retry_count + 1}")
                    time.sleep(wait_time)

        # Try fallback strategy
        if strategy == RecoveryStrategy.FALLBACK and fallback:
            return self._handle_fallback(fallback)

        # Try default value strategy
        if strategy == RecoveryStrategy.DEFAULT and default_value is not None:
            return self._handle_default(default_value)

        return self._handle_failure(last_error)

    async def recover_async(
        self,
        operation: Callable,
        strategy: RecoveryStrategy = RecoveryStrategy.RETRY,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        fallback: Optional[Callable] = None,
        default_value: Any = None,
        context: dict[str, Optional[Any]] = None,
    ) -> tuple[Any, bool, Optional[str]]:
        """
        Attempt to recover from an error (Async version)

        Returns:
            Tuple of (result, success, error_message)
        """
        last_error = None

        for retry_count in range(1, max_retries + 1):
            try:
                result = await operation()
                if retry_count > 1:
                    self._log_success(retry_count - 1)
                return result, True, None
            except Exception as e:
                last_error = e
                self._record_error(e, retry_count, strategy, context, max_retries)
                if retry_count < max_retries:
                    wait_time = _calculate_backoff(retry_delay, retry_count)
                    logger.debug(f"Waiting {wait_time:.2f}s before retry {retry_count + 1}")
                    await asyncio.sleep(wait_time)

        # Try fallback strategy
        if strategy == RecoveryStrategy.FALLBACK and fallback:
            return await self._handle_fallback_async(fallback)

        # Try default value strategy
        if strategy == RecoveryStrategy.DEFAULT and default_value is not None:
            return self._handle_default(default_value)

        return self._handle_failure(last_error)

    async def _handle_fallback_async(self, fallback: Callable) -> tuple[Any, bool, Optional[str]]:
        """Execute async fallback and return result tuple."""
        try:
            self.recovery_stats["fallback_used"] += 1
            logger.info("Using fallback operation")
            if asyncio.iscoroutinefunction(fallback):
                result = await fallback()
            else:
                result = fallback()
            self.recovery_stats["successful_recoveries"] += 1
            return result, True, None
        except Exception as e:
            logger.error(f"Fallback also failed: {e!s}")
            self.recovery_stats["failed_recoveries"] += 1
            return None, False, str(e)

    def get_stats(self) -> dict[str, Any]:
        """Get recovery statistics"""
        return {
            **self.recovery_stats,
            "success_rate": (
                self.recovery_stats["successful_recoveries"]
                / max(self.recovery_stats["total_recoveries"], 1)
            )
            * 100,
            "recent_errors": self.error_history[-10:] if self.error_history else [],
        }

    def clear_history(self):
        """Clear error history"""
        self.error_history = []
        logger.info("Error history cleared")


# Global instance
auto_recovery = AutoRecovery()


def with_auto_recovery(
    strategy: RecoveryStrategy = RecoveryStrategy.RETRY,
    max_retries: int = 3,
    retry_delay: float = 1.0,
    fallback: Optional[Callable] = None,
    default_value: Any = None,
):
    """Decorator for automatic error recovery"""

    def decorator(func: Callable):
        import asyncio

        if asyncio.iscoroutinefunction(func):

            @wraps(func)
            async def wrapper(*args, **kwargs):
                async def operation():
                    return await func(*args, **kwargs)

                context = {
                    "function": func.__name__,
                    "args": str(args),
                    "kwargs": str(kwargs),
                }

                result, success, error_msg = await auto_recovery.recover_async(
                    operation=operation,
                    strategy=strategy,
                    max_retries=max_retries,
                    retry_delay=retry_delay,
                    fallback=fallback,
                    default_value=default_value,
                    context=context,
                )

                if not success:
                    from backend.exceptions import StockVerifyException

                    raise StockVerifyException(
                        message=error_msg or "Recovery failed",
                        error_code="RECOVERY_FAILED",
                        details={"function": func.__name__},
                    )

                return result

            return wrapper
        else:

            @wraps(func)
            def wrapper(*args, **kwargs):
                def operation():
                    return func(*args, **kwargs)

                context = {
                    "function": func.__name__,
                    "args": str(args),
                    "kwargs": str(kwargs),
                }

                result, success, error_msg = auto_recovery.recover(
                    operation=operation,
                    strategy=strategy,
                    max_retries=max_retries,
                    retry_delay=retry_delay,
                    fallback=fallback,
                    default_value=default_value,
                    context=context,
                )

                if not success:
                    from backend.exceptions import StockVerifyException

                    raise StockVerifyException(
                        message=error_msg or "Recovery failed",
                        error_code="RECOVERY_FAILED",
                        details={"function": func.__name__},
                    )

                return result

            return wrapper

    return decorator
