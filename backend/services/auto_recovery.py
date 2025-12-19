"""
Auto Recovery Service
Automatically recovers from errors and provides fallback mechanisms
"""

import logging
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
        retry_count = 0

        while retry_count < max_retries:
            try:
                result = operation()
                if retry_count > 0:
                    self.recovery_stats["successful_recoveries"] += 1
                    self.recovery_stats["retry_count"] += retry_count
                    logger.info(f"Successfully recovered after {retry_count} retries")
                return result, True, None
            except Exception as e:
                last_error = e
                retry_count += 1
                self.recovery_stats["total_recoveries"] += 1

                error_info = {
                    "error": str(e),
                    "type": type(e).__name__,
                    "retry_count": retry_count,
                    "strategy": strategy.value,
                    "context": context or {},
                    "traceback": traceback.format_exc(),
                }
                self.error_history.append(error_info)
                if len(self.error_history) > self.max_history:
                    self.error_history.pop(0)

                logger.warning(
                    f"Error occurred (attempt {retry_count}/{max_retries}): {str(e)}"
                )

                # Wait before retry with exponential backoff
                if retry_count < max_retries:
                    # Use exponential backoff with jitter
                    import random

                    wait_time = (
                        retry_delay * (2 ** (retry_count - 1))
                    ) + random.uniform(0, 0.5)
                    logger.debug(
                        f"Waiting {wait_time:.2f}s before retry {retry_count + 1}"
                    )
                    # Note: For sync context we use time.sleep, but callers should prefer async version
                    time.sleep(wait_time)

        # All retries failed, try fallback
        if strategy == RecoveryStrategy.FALLBACK and fallback:
            try:
                self.recovery_stats["fallback_used"] += 1
                logger.info("Using fallback operation")
                result = fallback()
                self.recovery_stats["successful_recoveries"] += 1
                return result, True, None
            except Exception as e:
                logger.error(f"Fallback also failed: {str(e)}")
                self.recovery_stats["failed_recoveries"] += 1
                return None, False, str(e)

        # Return default value
        if strategy == RecoveryStrategy.DEFAULT and default_value is not None:
            logger.info("Using default value")
            self.recovery_stats["successful_recoveries"] += 1
            return default_value, True, "Used default value"

        # All recovery attempts failed
        self.recovery_stats["failed_recoveries"] += 1
        error_msg = f"All recovery attempts failed: {str(last_error)}"
        logger.error(error_msg)
        return None, False, error_msg

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
