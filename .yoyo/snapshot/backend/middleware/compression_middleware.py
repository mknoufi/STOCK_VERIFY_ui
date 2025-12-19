"""
Modern Response Compression Middleware (2024/2025 Best Practice)
High-performance compression for API responses
"""

import gzip
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import logging

logger = logging.getLogger(__name__)


class CompressionMiddleware(BaseHTTPMiddleware):
    """
    Automatic response compression for faster API responses
    Reduces bandwidth usage and improves client performance
    """

    def __init__(
        self,
        app,
        minimum_size: int = 1024,  # Compress responses > 1KB
        compressible_types: list = None,
    ):
        super().__init__(app)
        self.minimum_size = minimum_size
        self.compressible_types = compressible_types or [
            "application/json",
            "application/javascript",
            "text/html",
            "text/css",
            "text/plain",
            "text/xml",
            "application/xml",
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with compression"""
        response = await call_next(request)

        # Check if compression is appropriate
        if not self._should_compress(request, response):
            return response

        # Get response body
        if hasattr(response, "body"):
            body = response.body
        else:
            return response  # Can't compress streaming responses

        # Check minimum size
        if len(body) < self.minimum_size:
            return response

        # Compress body
        try:
            compressed_body = gzip.compress(body, compresslevel=6)

            # Only compress if it actually reduces size
            if len(compressed_body) >= len(body):
                return response

            # Create compressed response
            # Convert headers to dict properly
            response_headers = {}
            for key, value in response.headers.items():
                response_headers[key] = value

            compressed_response = Response(
                content=compressed_body,
                status_code=response.status_code,
                headers=response_headers,
                media_type=response.media_type,
            )
            compressed_response.headers["Content-Encoding"] = "gzip"
            compressed_response.headers["Content-Length"] = str(len(compressed_body))
            compressed_response.headers["Vary"] = "Accept-Encoding"

            return compressed_response

        except Exception as e:
            logger.warning(f"Compression failed: {str(e)}")
            return response

    def _should_compress(self, request: Request, response: Response) -> bool:
        """Check if response should be compressed"""
        # Check Accept-Encoding header
        accept_encoding = request.headers.get("Accept-Encoding", "")
        if "gzip" not in accept_encoding:
            return False

        # Check if already compressed
        if response.headers.get("Content-Encoding"):
            return False

        # Check content type
        content_type = response.headers.get("Content-Type", "")
        if not any(ct in content_type for ct in self.compressible_types):
            return False

        # Check status code (don't compress errors)
        if response.status_code >= 400:
            return False

        return True
