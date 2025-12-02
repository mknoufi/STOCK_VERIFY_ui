"""
Request Size Limit Middleware
Prevents DOS attacks via large request payloads
"""

import logging

from fastapi import status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to limit request payload size
    Prevents denial-of-service attacks via large requests
    """

    def __init__(
        self,
        app,
        max_size: int = 10 * 1024 * 1024,  # 10 MB default
        exempt_paths: list = None,
    ):
        super().__init__(app)
        self.max_size = max_size
        self.exempt_paths = exempt_paths or ["/health"]
        logger.info(f"Request size limit: {max_size / (1024 * 1024):.1f} MB")

    async def dispatch(self, request: Request, call_next):
        # Skip size check for exempt paths (like health checks)
        if any(request.url.path.startswith(path) for path in self.exempt_paths):
            return await call_next(request)

        # Check Content-Length header
        content_length = request.headers.get("content-length")

        if content_length:
            try:
                content_length = int(content_length)
            except ValueError:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={
                        "detail": "Invalid Content-Length header",
                        "error": "INVALID_CONTENT_LENGTH",
                    },
                )

            if content_length > self.max_size:
                logger.warning(
                    f"Request too large: {content_length} bytes (max: {self.max_size}) "
                    f"from {request.client.host if request.client else 'unknown'}"
                )
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "detail": f"Request payload too large. Maximum size: {self.max_size} bytes",
                        "max_size_mb": round(self.max_size / (1024 * 1024), 2),
                        "received_size_mb": round(content_length / (1024 * 1024), 2),
                        "error": "REQUEST_TOO_LARGE",
                    },
                )

        return await call_next(request)
