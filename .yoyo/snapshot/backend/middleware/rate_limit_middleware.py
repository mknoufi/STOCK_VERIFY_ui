"""
Rate Limit Middleware - Enforce rate limiting on API endpoints
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable, Optional
from backend.services.rate_limiter import RateLimiter

from jwt import decode as jwt_decode
import os


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce rate limiting"""

    def __init__(
        self,
        app: ASGIApp,
        rate_limiter: RateLimiter,
        enabled: bool = True,
        jwt_secret: Optional[str] = None,
    ):
        super().__init__(app)
        self.rate_limiter = rate_limiter
        self.enabled = enabled
        self.jwt_secret = jwt_secret or os.environ.get(
            "JWT_SECRET", "lavanya-emart-secret-key-2025"
        )

    async def dispatch(self, request: Request, call_next: Callable):
        """Check rate limit before processing request"""
        if not self.enabled:
            return await call_next(request)

        # Skip rate limiting for public endpoints (health, login, register)
        public_paths = ["/api/health", "/api/auth/login", "/api/auth/register"]
        if request.url.path in public_paths:
            return await call_next(request)

        # Extract user ID from token if available
        user_id = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ")[1]
                # Decode JWT to get user ID
                payload = jwt_decode(token, self.jwt_secret, algorithms=["HS256"])
                user_id = payload.get("sub")
            except Exception:
                pass  # Invalid token, use default rate limit

        # Get endpoint
        endpoint = request.url.path

        # Check rate limit
        allowed, info = self.rate_limiter.is_allowed(user_id=user_id, endpoint=endpoint)

        # Extract rate limit info
        limit = info.get("limit", self.rate_limiter.default_rate)
        remaining = info.get("remaining", 0)
        reset_in = info.get("reset_in", 60)

        if not allowed:
            retry_after = info.get("retry_after", 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "success": False,
                    "error": {
                        "message": "Rate limit exceeded. Please try again later.",
                        "code": "RATE_LIMIT_EXCEEDED",
                        "category": "rate_limit",
                        "details": {
                            "limit": limit,
                            "remaining": 0,
                            "reset_in": reset_in,
                            "retry_after": retry_after,
                        },
                    },
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_in),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers to successful responses
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_in)

        return response
