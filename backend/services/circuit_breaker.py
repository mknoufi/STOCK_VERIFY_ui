"""
Circuit Breaker Pattern for Enterprise Resilience
Prevents cascading failures and provides graceful degradation
"""

import asyncio
import logging
import time
from collections.abc import Callable
from datetime import datetime
from enum import Enum
from typing import Any, Optional, TypeVar

from pydantic import BaseModel

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(str, Enum):
    """Circuit breaker states"""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreakerConfig(BaseModel):
    """Circuit breaker configuration"""

    failure_threshold: int = 5  # Failures before opening
    success_threshold: int = 3  # Successes to close from half-open
    timeout_seconds: float = 30.0  # Time before trying half-open
    half_open_max_calls: int = 3  # Max concurrent calls in half-open


class CircuitBreaker:
    """
    Circuit Breaker pattern implementation

    Prevents cascading failures by:
    - Opening circuit after failure threshold
    - Rejecting requests while open
    - Testing with limited requests in half-open
    - Closing after success threshold
    """

    def __init__(
        self,
        name: str,
        config: CircuitBreakerConfig = None,
        on_state_change: Callable[[str, str], None] = None,
    ):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.on_state_change = on_state_change

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._half_open_calls = 0
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        """Get current circuit state"""
        return self._state

    @property
    def is_available(self) -> bool:
        """Check if circuit is available for requests"""
        if self._state == CircuitState.CLOSED:
            return True
        if self._state == CircuitState.OPEN:
            # Check if timeout has passed
            if self._last_failure_time:
                elapsed = time.time() - self._last_failure_time
                if elapsed >= self.config.timeout_seconds:
                    return True  # Will transition to half-open
            return False
        if self._state == CircuitState.HALF_OPEN:
            return self._half_open_calls < self.config.half_open_max_calls
        return False

    def _transition_to(self, new_state: CircuitState):
        """Transition to a new state"""
        if self._state != new_state:
            old_state = self._state
            self._state = new_state

            logger.info(
                f"Circuit breaker '{self.name}': {old_state.value} -> {new_state.value}"
            )

            if self.on_state_change:
                try:
                    self.on_state_change(old_state.value, new_state.value)
                except Exception as e:
                    logger.error(f"State change callback error: {e}")

    async def record_success(self):
        """Record a successful call"""
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                self._half_open_calls = max(0, self._half_open_calls - 1)

                if self._success_count >= self.config.success_threshold:
                    self._transition_to(CircuitState.CLOSED)
                    self._reset_counts()
            elif self._state == CircuitState.CLOSED:
                # Reset failure count on success
                self._failure_count = 0

    async def record_failure(self):
        """Record a failed call"""
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()

            if self._state == CircuitState.HALF_OPEN:
                # Single failure in half-open returns to open
                self._transition_to(CircuitState.OPEN)
                self._reset_counts()
            elif self._state == CircuitState.CLOSED:
                if self._failure_count >= self.config.failure_threshold:
                    self._transition_to(CircuitState.OPEN)

    async def acquire(self) -> bool:
        """
        Acquire permission to make a call

        Returns:
            True if call is permitted, False if circuit is open
        """
        async with self._lock:
            if self._state == CircuitState.CLOSED:
                return True

            if self._state == CircuitState.OPEN:
                # Check timeout
                if self._last_failure_time:
                    elapsed = time.time() - self._last_failure_time
                    if elapsed >= self.config.timeout_seconds:
                        self._transition_to(CircuitState.HALF_OPEN)
                        self._reset_counts()
                        self._half_open_calls += 1
                        return True
                return False

            if self._state == CircuitState.HALF_OPEN:
                if self._half_open_calls < self.config.half_open_max_calls:
                    self._half_open_calls += 1
                    return True
                return False

            return False

    def _reset_counts(self):
        """Reset all counters"""
        self._failure_count = 0
        self._success_count = 0
        self._half_open_calls = 0

    def get_status(self) -> dict[str, Any]:
        """Get circuit breaker status"""
        return {
            "name": self.name,
            "state": self._state.value,
            "failure_count": self._failure_count,
            "success_count": self._success_count,
            "last_failure": (
                datetime.fromtimestamp(self._last_failure_time).isoformat()
                if self._last_failure_time
                else None
            ),
            "config": self.config.model_dump(),
        }


class CircuitBreakerRegistry:
    """Registry for managing multiple circuit breakers"""

    def __init__(self):
        self._breakers: dict[str, CircuitBreaker] = {}
        self._lock = asyncio.Lock()

    async def get_or_create(
        self, name: str, config: CircuitBreakerConfig = None
    ) -> CircuitBreaker:
        """Get existing or create new circuit breaker"""
        async with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker(name, config)
            return self._breakers[name]

    def get(self, name: str) -> Optional[CircuitBreaker]:
        """Get circuit breaker by name"""
        return self._breakers.get(name)

    def get_all_status(self) -> dict[str, dict[str, Any]]:
        """Get status of all circuit breakers"""
        return {name: breaker.get_status() for name, breaker in self._breakers.items()}


# Decorator for circuit breaker protection
def with_circuit_breaker(breaker: CircuitBreaker, fallback: Optional[Callable] = None):
    """
    Decorator to protect a function with circuit breaker

    Args:
        breaker: Circuit breaker instance
        fallback: Optional fallback function when circuit is open
    """

    def decorator(func):
        async def wrapper(*args, **kwargs):
            if not await breaker.acquire():
                if fallback:
                    return (
                        await fallback(*args, **kwargs)
                        if asyncio.iscoroutinefunction(fallback)
                        else fallback(*args, **kwargs)
                    )
                raise CircuitOpenError(f"Circuit breaker '{breaker.name}' is open")

            try:
                result = (
                    await func(*args, **kwargs)
                    if asyncio.iscoroutinefunction(func)
                    else func(*args, **kwargs)
                )
                await breaker.record_success()
                return result
            except Exception:
                await breaker.record_failure()
                raise

        return wrapper

    return decorator


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open"""

    pass


# Global registry instance
circuit_breaker_registry = CircuitBreakerRegistry()


async def get_circuit_breaker(
    name: str, config: Optional[CircuitBreakerConfig] = None
) -> CircuitBreaker:
    """
    Get or create a circuit breaker from the global registry

    Args:
        name: Circuit breaker name
        config: Optional configuration (uses default if not provided)

    Returns:
        CircuitBreaker instance
    """
    return await circuit_breaker_registry.get_or_create(
        name, config or CircuitBreakerConfig()
    )
