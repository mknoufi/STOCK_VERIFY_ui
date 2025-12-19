"""
Request ID Middleware (2024/2025 Best Practice)
Adds unique request ID for tracing and debugging
"""

import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Request ID Middleware
    Adds unique request ID for tracing
    """

    def __init__(self, app, header_name: str = "X-Request-ID"):
        super().__init__(app)
        self.header_name = header_name

    async def dispatch(self, request: Request, call_next):
        """Process request with request ID"""
        # Get request ID from header or generate new one
        request_id = request.headers.get(self.header_name.lower())
        if not request_id:
            request_id = str(uuid.uuid4())

        # Store in request state for access in handlers
        request.state.request_id = request_id

        # Log request with ID (only for non-health endpoints to reduce noise)
        if not request.url.path.startswith("/health"):
            logger.debug(f"Request: {request.method} {request.url.path} [Request-ID: {request_id}]")

        # Process request
        response = await call_next(request)

        # Add request ID to response header
        response.headers[self.header_name] = request_id

        return response
