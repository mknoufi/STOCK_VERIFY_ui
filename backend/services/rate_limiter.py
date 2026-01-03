"""
Rate Limiter Service - Prevent API abuse and handle concurrent requests
Implements token bucket algorithm for rate limiting
"""

import logging
import threading
import time
from collections import defaultdict
from typing import Any, Optional

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Thread-safe rate limiter using token bucket algorithm
    Supports per-user and per-endpoint rate limiting
    """

    def __init__(
        self,
        default_rate: int = 100,  # requests per minute
        default_burst: int = 20,  # burst allowance
        per_user: bool = True,
        per_endpoint: bool = False,
    ):
        self.default_rate = default_rate
        self.default_burst = default_burst
        self.per_user = per_user
        self.per_endpoint = per_endpoint

        # Token buckets: key -> (tokens, last_refill)
        self._buckets: dict[str, tuple] = {}
        self._lock = threading.Lock()

        # Request tracking for analytics
        self._request_counts: dict[str, int] = defaultdict(int)
        self._window_start = time.time()
        self._window_size = 60  # 1 minute window

    def _get_bucket_key(self, user_id: Optional[str], endpoint: Optional[str]) -> str:
        """Generate bucket key based on configuration"""
        parts = []

        if self.per_user and user_id:
            parts.append(f"user:{user_id}")

        if self.per_endpoint and endpoint:
            parts.append(f"endpoint:{endpoint}")

        if not parts:
            return "default"

        return "|".join(parts)

    def _refill_tokens(self, bucket_key: str, rate: int, burst: int) -> float:
        """Refill tokens in bucket"""
        now = time.time()

        if bucket_key not in self._buckets:
            # Initialize bucket
            self._buckets[bucket_key] = (burst, now)
            return burst

        tokens, last_refill = self._buckets[bucket_key]

        # Calculate time elapsed
        elapsed = now - last_refill

        # Refill tokens (rate per minute = rate/60 per second)
        tokens_to_add = (rate / 60.0) * elapsed
        new_tokens = min(burst, tokens + tokens_to_add)

        # Update bucket
        self._buckets[bucket_key] = (new_tokens, now)

        return new_tokens

    def _cleanup_old_buckets(self):
        """Remove buckets not used in last hour"""
        now = time.time()
        cutoff = now - 3600  # 1 hour

        to_remove = []
        for key, (_, last_refill) in self._buckets.items():
            if last_refill < cutoff:
                to_remove.append(key)

        for key in to_remove:
            del self._buckets[key]

    def is_allowed(
        self,
        user_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        rate: Optional[int] = None,
        burst: Optional[int] = None,
    ) -> tuple[bool, dict[str, Any]]:
        """
        Check if request is allowed
        Returns: (is_allowed, info_dict)
        info_dict includes: allowed, remaining, limit, reset_in, retry_after (if denied)
        """
        with self._lock:
            bucket_key = self._get_bucket_key(user_id, endpoint)

            # Use custom rate/burst or defaults
            rate_limit = rate or self.default_rate
            burst_limit = burst or self.default_burst

            # Refill tokens
            tokens = self._refill_tokens(bucket_key, rate_limit, burst_limit)

            # Check if request is allowed
            if tokens >= 1.0:
                # Consume one token
                new_tokens = tokens - 1.0
                self._buckets[bucket_key] = (new_tokens, time.time())

                # Track request
                self._request_counts[bucket_key] += 1

                # Periodic cleanup
                if time.time() - self._window_start > self._window_size:
                    self._cleanup_old_buckets()
                    self._request_counts.clear()
                    self._window_start = time.time()

                return True, {
                    "allowed": True,
                    "remaining": int(new_tokens),
                    "limit": rate_limit,
                    "reset_in": int((60.0 / rate_limit) * (burst_limit - new_tokens)),
                }
            else:
                # Request denied - calculate retry_after
                retry_after_seconds = int(max(1, (1.0 - tokens) * (60.0 / rate_limit)))

                return False, {
                    "allowed": False,
                    "remaining": 0,
                    "limit": rate_limit,
                    "reset_in": int((60.0 / rate_limit) * (burst_limit - tokens)),
                    "retry_after": retry_after_seconds,
                }

    def get_stats(self) -> dict[str, Any]:
        """Get rate limiter statistics"""
        with self._lock:
            return {
                "active_buckets": len(self._buckets),
                "total_requests": sum(self._request_counts.values()),
                "request_counts": dict(self._request_counts),
                "window_start": self._window_start,
            }


class ConcurrentRequestHandler:
    """
    Handle concurrent requests with queue management
    Prevents overload during high traffic
    """

    def __init__(self, max_concurrent: int = 50, queue_size: int = 100):
        self.max_concurrent = max_concurrent
        self.queue_size = queue_size
        self._semaphore = threading.Semaphore(max_concurrent)
        self._queue: list = []
        self._active = 0
        self._lock = threading.Lock()

    def acquire(self, timeout: float = 5.0) -> bool:
        """Acquire slot for request"""
        if self._semaphore.acquire(timeout=timeout):
            with self._lock:
                self._active += 1
            return True
        return False

    def release(self):
        """Release slot after request"""
        with self._lock:
            self._active = max(0, self._active - 1)
        self._semaphore.release()

    def get_stats(self) -> dict[str, Any]:
        """Get handler statistics"""
        with self._lock:
            return {
                "max_concurrent": self.max_concurrent,
                "active": self._active,
                "available": self.max_concurrent - self._active,
                "utilization": (
                    (self._active / self.max_concurrent) * 100 if self.max_concurrent > 0 else 0
                ),
            }
