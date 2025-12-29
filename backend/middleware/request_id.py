"""
Request ID / Correlation ID Middleware (2024/2025 Best Practice)
Adds unique request ID for distributed tracing and debugging.

Follows ASGI Correlation ID pattern from awesome-fastapi best practices:
- Generates/propagates X-Request-ID and X-Correlation-ID headers
- Stores IDs in contextvars for async access anywhere in request
- Integrates with logging for automatic correlation in log messages
"""

import contextvars
import logging
import uuid
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

# Context variables for correlation IDs (async-safe, accessible anywhere)
request_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "request_id", default=None
)
correlation_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "correlation_id", default=None
)


def get_request_id() -> Optional[str]:
    """Get current request ID from context (accessible from any async code)"""
    return request_id_ctx.get()


def get_correlation_id() -> Optional[str]:
    """Get current correlation ID from context (accessible from any async code)"""
    return correlation_id_ctx.get()


class CorrelationIDFilter(logging.Filter):
    """
    Logging filter that adds request_id and correlation_id to log records.
    Usage: Add to logger handlers for automatic correlation in logs.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get() or "-"
        record.correlation_id = correlation_id_ctx.get() or "-"
        return True


logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Request ID / Correlation ID Middleware

    Features:
    - X-Request-ID: Unique per-request identifier (generated if not provided)
    - X-Correlation-ID: Traces requests across services (propagated from upstream)
    - Context variables for async access throughout the request lifecycle
    - Response headers for client-side correlation
    """

    def __init__(
        self,
        app,
        request_id_header: str = "X-Request-ID",
        correlation_id_header: str = "X-Correlation-ID",
    ):
        super().__init__(app)
        self.request_id_header = request_id_header
        self.correlation_id_header = correlation_id_header

    async def dispatch(self, request: Request, call_next):
        """Process request with request and correlation IDs"""
        # Get or generate request ID
        request_id = request.headers.get(self.request_id_header.lower())
        if not request_id:
            request_id = str(uuid.uuid4())

        # Get correlation ID from header (for distributed tracing) or use request ID
        correlation_id = request.headers.get(self.correlation_id_header.lower())
        if not correlation_id:
            correlation_id = request_id

        # Store in context variables (async-safe, accessible from anywhere)
        request_id_token = request_id_ctx.set(request_id)
        correlation_id_token = correlation_id_ctx.set(correlation_id)

        try:
            # Store in request state for backward compatibility
            request.state.request_id = request_id
            request.state.correlation_id = correlation_id

            # Log request with IDs (only for non-health endpoints to reduce noise)
            if not request.url.path.startswith("/health"):
                logger.debug(
                    f"Request: {request.method} {request.url.path} "
                    f"[request_id={request_id}, correlation_id={correlation_id}]"
                )

            # Process request
            response = await call_next(request)

            # Add IDs to response headers
            response.headers[self.request_id_header] = request_id
            response.headers[self.correlation_id_header] = correlation_id

            return response
        finally:
            # Reset context variables
            request_id_ctx.reset(request_id_token)
            correlation_id_ctx.reset(correlation_id_token)
