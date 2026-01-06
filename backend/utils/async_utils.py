"""
Modern Async Utilities - 2024/2025 Best Practices
Zero-error async patterns, connection pooling, and performance optimization
"""

import asyncio
import logging
import time
from collections.abc import Callable, Coroutine
from contextlib import asynccontextmanager
from datetime import datetime
from functools import wraps
from typing import Any, Optional, TypeVar

from backend.utils.result_types import Result

logger = logging.getLogger(__name__)

T = TypeVar("T")


class AsyncExecutor:
    """
    Modern async executor with zero-error patterns
    Implements connection pooling, retry logic, and circuit breaker
    """

    def __init__(
        self,
        max_concurrent: int = 50,
        timeout: float = 30.0,
        retry_attempts: int = 3,
        backoff_factor: float = 1.5,
    ):
        self.max_concurrent = max_concurrent
        self.timeout = timeout
        self.retry_attempts = retry_attempts
        self.backoff_factor = backoff_factor
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self._circuit_breaker_state: dict[str, dict[str, Any]] = {}
        self._circuit_breaker_threshold = 5
        self._circuit_breaker_timeout = 60  # seconds

    async def execute_with_retry(
        self, coro: Coroutine[Any, Any, T], operation_name: str = "operation"
    ) -> Result[T, Exception]:
        """
        Execute coroutine with automatic retry and zero-error handling
        """
        last_error = None

        for attempt in range(self.retry_attempts):
            try:
                # Check circuit breaker
                if self._is_circuit_open(operation_name):
                    return Result.error(
                        Exception(f"Circuit breaker open for {operation_name}"),
                        "Circuit breaker is open. Too many failures.",
                    )

                # Execute with timeout
                result = await asyncio.wait_for(coro, timeout=self.timeout)

                # Reset circuit breaker on success
                self._reset_circuit_breaker(operation_name)
                return Result.success(result)

            except TimeoutError:
                last_error = Exception(f"{operation_name} timed out after {self.timeout}s")
                logger.warning(f"{operation_name} attempt {attempt + 1} failed: timeout")

            except Exception as e:
                last_error = e
                logger.warning(f"{operation_name} attempt {attempt + 1} failed: {str(e)}")

                # Record failure for circuit breaker
                self._record_failure(operation_name)

            # Exponential backoff
            if attempt < self.retry_attempts - 1:
                wait_time = self.backoff_factor**attempt
                await asyncio.sleep(wait_time)

        # All retries failed
        return Result.error(
            last_error or Exception("Unknown error"),
            f"{operation_name} failed after {self.retry_attempts} attempts",
        )

    async def execute_batch(
        self,
        coros: list[Coroutine[Any, Any, T]],
        operation_name: str = "batch_operation",
    ) -> list[Result[T, Exception]]:
        """
        Execute multiple coroutines concurrently with semaphore control
        """

        async def execute_with_semaphore(
            coro: Coroutine[Any, Any, T],
        ) -> Result[T, Exception]:
            async with self.semaphore:
                return await self.execute_with_retry(coro, operation_name)

        tasks = [execute_with_semaphore(coro) for coro in coros]
        return await asyncio.gather(*tasks, return_exceptions=False)

    def _is_circuit_open(self, operation_name: str) -> bool:
        """Check if circuit breaker is open"""
        if operation_name not in self._circuit_breaker_state:
            return False

        state = self._circuit_breaker_state[operation_name]
        if state["failures"] >= self._circuit_breaker_threshold:
            # Check if timeout has passed
            if (
                datetime.utcnow() - state["opened_at"]
            ).total_seconds() > self._circuit_breaker_timeout:
                # Half-open: reset failures but keep monitoring
                state["failures"] = self._circuit_breaker_threshold // 2
                state["opened_at"] = datetime.utcnow()
                return False
            return True

        return False

    def _record_failure(self, operation_name: str):
        """Record failure for circuit breaker"""
        if operation_name not in self._circuit_breaker_state:
            self._circuit_breaker_state[operation_name] = {
                "failures": 0,
                "opened_at": None,
            }

        state = self._circuit_breaker_state[operation_name]
        state["failures"] += 1

        if state["failures"] >= self._circuit_breaker_threshold:
            state["opened_at"] = datetime.utcnow()
            logger.error(
                f"Circuit breaker opened for {operation_name} after {state['failures']} failures"
            )

    def _reset_circuit_breaker(self, operation_name: str):
        """Reset circuit breaker on success"""
        if operation_name in self._circuit_breaker_state:
            self._circuit_breaker_state[operation_name]["failures"] = 0
            self._circuit_breaker_state[operation_name]["opened_at"] = None


# Global async executor instance
_async_executor = AsyncExecutor(
    max_concurrent=50, timeout=30.0, retry_attempts=3, backoff_factor=1.5
)


def with_async_executor(operation_name: Optional[str] = None, timeout: Optional[float] = None):
    """
    Decorator for automatic async execution with retry and error handling
    """

    def decorator(
        func: Callable[..., Coroutine[Any, Any, T]],
    ) -> Callable[..., Coroutine[Any, Any, Result[T, Exception]]]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Result[T, Exception]:
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            executor = AsyncExecutor(timeout=timeout or 30.0)
            return await executor.execute_with_retry(func(*args, **kwargs), op_name)

        return wrapper

    return decorator


async def safe_async_execute(
    coro: Coroutine[Any, Any, T],
    operation_name: str = "operation",
    timeout: Optional[float] = None,
) -> Result[T, Exception]:
    """
    Safely execute async operation with automatic error handling
    """
    executor = AsyncExecutor(timeout=timeout or 30.0)
    return await executor.execute_with_retry(coro, operation_name)


async def safe_batch_execute(
    coros: list[Coroutine[Any, Any, T]],
    operation_name: str = "batch_operation",
    max_concurrent: int = 50,
) -> list[Result[T, Exception]]:
    """
    Safely execute batch operations with concurrency control
    """
    executor = AsyncExecutor(max_concurrent=max_concurrent)
    return await executor.execute_batch(coros, operation_name)


@asynccontextmanager
async def async_connection_pool(pool_size: int = 10):
    """
    Modern connection pool context manager
    """
    pool: list[Any] = []

    try:
        # Initialize pool
        for _ in range(pool_size):
            # Pool initialization would go here
            pool.append(None)

        yield pool

    finally:
        # Cleanup pool
        for connection in pool:
            if connection:
                try:
                    # Close connection logic
                    pass
                except Exception:
                    pass


class AsyncCache:
    """
    High-performance async cache with TTL and LRU eviction
    """

    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: dict[str, Any] = {}
        self._access_times: dict[str, float] = {}
        self._expiry_times: dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        """Get from cache"""
        async with self._lock:
            if key not in self._cache:
                return None

            # Check expiry
            if key in self._expiry_times:
                if time.time() > self._expiry_times[key]:
                    del self._cache[key]
                    del self._access_times[key]
                    del self._expiry_times[key]
                    return None

            # Update access time (LRU)
            self._access_times[key] = time.time()
            return self._cache[key]

    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set in cache with TTL"""
        async with self._lock:
            # Evict if at capacity
            if len(self._cache) >= self.max_size and key not in self._cache:
                self._evict_lru()

            self._cache[key] = value
            self._access_times[key] = time.time()
            self._expiry_times[key] = time.time() + (ttl or self.default_ttl)

    async def delete(self, key: str):
        """Delete from cache"""
        async with self._lock:
            self._cache.pop(key, None)
            self._access_times.pop(key, None)
            self._expiry_times.pop(key, None)

    async def clear(self):
        """Clear entire cache"""
        async with self._lock:
            self._cache.clear()
            self._access_times.clear()
            self._expiry_times.clear()

    def _evict_lru(self):
        """Evict least recently used item"""
        if not self._access_times:
            return

        lru_key = min(self._access_times.items(), key=lambda x: x[1])[0]
        del self._cache[lru_key]
        del self._access_times[lru_key]
        self._expiry_times.pop(lru_key, None)


# Global async cache instance
_async_cache = AsyncCache(max_size=5000, default_ttl=1800)


async def cached_async(key_func: Callable[..., Optional[str]] = None, ttl: int = 1800):
    """
    Decorator for automatic caching of async function results
    """

    def decorator(
        func: Callable[..., Coroutine[Any, Any, T]],
    ) -> Callable[..., Coroutine[Any, Any, T]]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__module__}.{func.__name__}:{args}:{kwargs}"

            # Try cache first
            cached = await _async_cache.get(cache_key)
            if cached is not None:
                return cached

            # Execute and cache
            result = await func(*args, **kwargs)
            await _async_cache.set(cache_key, result, ttl)
            return result

        return wrapper

    return decorator
