"""
Performance Middleware - Track request performance and add caching headers
"""

import logging
import time
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

try:
    from services.monitoring_service import MonitoringService
except ImportError:
    # Fallback if services not in path
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).parent.parent))
    from services.monitoring_service import MonitoringService

logger = logging.getLogger(__name__)


class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to track request performance"""

    def __init__(self, app: ASGIApp, monitoring: MonitoringService):
        super().__init__(app)
        self.monitoring = monitoring

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and track performance"""
        start_time = time.time()

        # Get endpoint path
        endpoint = request.url.path

        try:
            # Process request
            response = await call_next(request)

            # Calculate duration
            duration = time.time() - start_time

            # Track request
            self.monitoring.track_request(
                endpoint=endpoint,
                method=request.method,
                status_code=response.status_code,
                duration=duration,
            )

            # Add performance headers
            response.headers["X-Response-Time"] = f"{duration:.3f}s"
            response.headers["X-Request-ID"] = request.headers.get(
                "X-Request-ID", "unknown"
            )

            return response

        except Exception as e:
            duration = time.time() - start_time

            # Track error
            self.monitoring.track_error(
                endpoint=endpoint,
                error=e,
                context={
                    "method": request.method,
                    "duration": duration,
                },
            )

            raise


class CacheMiddleware(BaseHTTPMiddleware):
    """Middleware to add cache headers for GET requests"""

    def __init__(
        self,
        app: ASGIApp,
        default_cache_max_age: int = 300,  # 5 minutes
    ):
        super().__init__(app)
        self.default_cache_max_age = default_cache_max_age

        # Endpoints that should not be cached
        self.no_cache_paths = {
            "/api/auth/me",
            "/api/sessions",
            "/api/count-lines",
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add cache headers to response"""
        response = await call_next(request)

        # Only cache successful GET requests
        if (
            request.method == "GET"
            and response.status_code == 200
            and request.url.path not in self.no_cache_paths
        ):
            # Add cache headers
            response.headers["Cache-Control"] = (
                f"public, max-age={self.default_cache_max_age}"
            )
            response.headers["ETag"] = f'"{hash(request.url.path)}"'

        return response
