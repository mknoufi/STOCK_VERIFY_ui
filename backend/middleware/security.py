"""
Security Middleware - Comprehensive security utilities
Includes input sanitization, rate limiting helpers, and filter validation
"""

import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Optional

logger = logging.getLogger(__name__)


# Allowed filter keys for MongoDB queries (prevent injection)
ALLOWED_FILTER_KEYS: set[str] = {
    # Common filters
    "warehouse",
    "status",
    "date_from",
    "date_to",
    "user_id",
    "session_id",
    "item_code",
    "barcode",
    # Item filters
    "category",
    "subcategory",
    "floor",
    "rack",
    "rack_id",
    # Session filters
    "started_at",
    "completed_at",
    "created_at",
    "updated_at",
    # Verification filters
    "verified",
    "verified_qty",
    "damage_qty",
    "counted_qty",
    # Report filters
    "report_type",
    "report_id",
    "export_format",
}


def sanitize_barcode(barcode: str) -> str:
    """
    Sanitize barcode input by removing dangerous characters.
    Allows alphanumeric, hyphens, and underscores only.

    Args:
        barcode: Raw barcode string

    Returns:
        Sanitized barcode string
    """
    if not barcode:
        return ""

    # Remove any characters that aren't alphanumeric, hyphens, or underscores
    sanitized = re.sub(r"[^a-zA-Z0-9\-_]", "", barcode.strip())

    # Log if sanitization removed characters
    if sanitized != barcode.strip():
        logger.warning(f"Barcode sanitized: '{barcode}' -> '{sanitized}'")

    return sanitized


def sanitize_filter_keys(
    filters: dict[str, Any], allowed_keys: Optional[set[str]] = None
) -> dict[str, Any]:
    """
    Validate and sanitize filter keys against an allowlist.
    Prevents MongoDB injection through filter key manipulation.

    Args:
        filters: Dictionary of filter key-value pairs
        allowed_keys: Set of allowed keys (uses ALLOWED_FILTER_KEYS if None)

    Returns:
        Sanitized dictionary with only allowed keys
    """
    if not filters:
        return {}

    allowed = allowed_keys or ALLOWED_FILTER_KEYS
    sanitized = {}
    rejected_keys = []

    for key, value in filters.items():
        # Normalize key (lowercase, strip whitespace)
        normalized_key = key.lower().strip()

        # Check if key is allowed
        if normalized_key in allowed:
            # Sanitize string values
            if isinstance(value, str):
                # Escape regex special characters to prevent regex injection
                sanitized[normalized_key] = (
                    re.escape(value) if _is_regex_value(value) else value
                )
            else:
                sanitized[normalized_key] = value
        else:
            rejected_keys.append(key)

    if rejected_keys:
        logger.warning(f"Rejected filter keys: {rejected_keys}")

    return sanitized


def _is_regex_value(value: str) -> bool:
    """Check if a value appears to be intended as a regex pattern."""
    regex_indicators = [".*", ".+", "^", "$", "\\d", "\\w", "[", "]", "(", ")"]
    return any(indicator in value for indicator in regex_indicators)


def sanitize_string_input(value: str, max_length: int = 1000) -> str:
    """
    Sanitize general string input.
    Removes HTML tags, script content, and limits length.

    Args:
        value: Raw string input
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    if not value:
        return ""

    # Truncate to max length
    truncated = value[:max_length]

    # Remove HTML tags
    sanitized = re.sub(r"<[^>]+>", "", truncated)

    # Remove script content
    sanitized = re.sub(r"javascript:", "", sanitized, flags=re.IGNORECASE)

    # Remove event handlers
    sanitized = re.sub(r"on\w+\s*=", "", sanitized, flags=re.IGNORECASE)

    return sanitized.strip()


class LoginRateLimiter:
    """
    Rate limiter specifically for login attempts.
    Implements stricter limits: 5 attempts per 15 minutes per IP.
    """

    def __init__(self, max_attempts: int = 5, window_seconds: int = 900):
        self.max_attempts = max_attempts
        self.window = timedelta(seconds=window_seconds)
        self.attempts: dict[str, list] = defaultdict(list)

    def is_allowed(self, ip_address: str) -> tuple[bool, dict[str, Any]]:
        """
        Check if login attempt is allowed for this IP.

        Returns:
            Tuple of (allowed, info_dict)
        """
        now = datetime.utcnow()

        # Clean up old attempts
        self.attempts[ip_address] = [
            t for t in self.attempts[ip_address] if now - t < self.window
        ]

        current_attempts = len(self.attempts[ip_address])

        if current_attempts >= self.max_attempts:
            # Calculate when they can try again
            oldest_attempt = min(self.attempts[ip_address])
            reset_at = oldest_attempt + self.window
            retry_after = int((reset_at - now).total_seconds())

            return False, {
                "limit": self.max_attempts,
                "remaining": 0,
                "retry_after": max(retry_after, 1),
                "reset_at": reset_at.isoformat(),
            }

        # Record this attempt
        self.attempts[ip_address].append(now)

        return True, {
            "limit": self.max_attempts,
            "remaining": self.max_attempts - current_attempts - 1,
            "retry_after": 0,
        }

    def reset(self, ip_address: str) -> None:
        """Reset attempts for an IP after successful login."""
        if ip_address in self.attempts:
            del self.attempts[ip_address]


class BatchRateLimiter:
    """
    Rate limiter for batch sync operations.
    Limits: 10 requests per minute per user.
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = timedelta(seconds=window_seconds)
        self.requests: dict[str, list] = defaultdict(list)

    def is_allowed(self, user_id: str) -> tuple[bool, dict[str, Any]]:
        """
        Check if batch request is allowed for this user.
        """
        now = datetime.utcnow()

        # Clean up old requests
        self.requests[user_id] = [
            t for t in self.requests[user_id] if now - t < self.window
        ]

        current_count = len(self.requests[user_id])

        if current_count >= self.max_requests:
            oldest = min(self.requests[user_id])
            reset_at = oldest + self.window
            retry_after = int((reset_at - now).total_seconds())

            return False, {
                "limit": self.max_requests,
                "remaining": 0,
                "retry_after": max(retry_after, 1),
            }

        self.requests[user_id].append(now)

        return True, {
            "limit": self.max_requests,
            "remaining": self.max_requests - current_count - 1,
        }


# Global instances
login_rate_limiter = LoginRateLimiter()
batch_rate_limiter = BatchRateLimiter()


def get_client_ip(request) -> str:
    """
    Extract client IP from request, handling proxies.
    """
    # Check for forwarded header (behind proxy/load balancer)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Take the first IP in the chain
        return forwarded.split(",")[0].strip()

    # Fall back to direct client IP
    return request.client.host if request.client else "unknown"
