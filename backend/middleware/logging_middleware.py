"""
Session Context Logging Middleware
Adds user and session context to all log messages for protected endpoints
"""

import logging
import time
from contextvars import ContextVar
from typing import Any, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)

# Context variables for session info (thread-safe)
current_user_id: ContextVar[Optional[str]] = ContextVar("current_user_id", default=None)
current_username: ContextVar[Optional[str]] = ContextVar(
    "current_username", default=None
)
current_session_id: ContextVar[Optional[str]] = ContextVar(
    "current_session_id", default=None
)
current_request_id: ContextVar[Optional[str]] = ContextVar(
    "current_request_id", default=None
)


class SessionContextFilter(logging.Filter):
    """
    Logging filter that adds session context to log records
    Use this filter on your handlers to include user/session info
    """

    def filter(self, record: logging.LogRecord) -> bool:
        """Add context vars to the log record"""
        record.user_id = current_user_id.get() or "-"
        record.username = current_username.get() or "-"
        record.session_id = current_session_id.get() or "-"
        record.request_id = current_request_id.get() or "-"
        return True


class SessionContextLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts user and session context from JWT tokens
    and makes it available for logging throughout the request lifecycle
    """

    def __init__(
        self,
        app,
        exclude_paths: Optional[list[str]] = None,
        log_request_body: bool = False,
    ):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/health",
            "/api/health",
            "/api/docs",
            "/api/openapi.json",
            "/api/redoc",
        ]
        self.log_request_body = log_request_body

    async def dispatch(self, request: Request, call_next):
        """Process request with session context logging"""
        start_time = time.time()

        # Skip excluded paths
        path = request.url.path
        if any(path.startswith(excluded) for excluded in self.exclude_paths):
            return await call_next(request)

        # Extract request ID if available
        request_id = getattr(request.state, "request_id", None)
        if request_id:
            current_request_id.set(request_id)

        # Try to extract user info from JWT token
        user_info = await self._extract_user_context(request)
        if user_info:
            current_user_id.set(user_info.get("user_id"))
            current_username.set(user_info.get("username"))
            if user_info.get("session_id"):
                current_session_id.set(user_info.get("session_id"))

        # Log request start with context
        self._log_request_start(request, user_info)

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000

        # Log request completion
        self._log_request_complete(request, response, duration_ms, user_info)

        # Clear context vars after request
        self._clear_context()

        return response

    async def _extract_user_context(self, request: Request) -> Optional[dict[str, Any]]:
        """Extract user context from JWT token without full validation"""
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return None

        try:
            token = auth_header.split(" ")[1]
            # Decode JWT payload without verification (just for logging context)
            # We use base64 decode to avoid import issues with jwt
            import base64
            import json

            # JWT format: header.payload.signature
            parts = token.split(".")
            if len(parts) != 3:
                return None

            # Decode payload (add padding if needed)
            payload_b64 = parts[1]
            padding = 4 - len(payload_b64) % 4
            if padding != 4:
                payload_b64 += "=" * padding

            payload_bytes = base64.urlsafe_b64decode(payload_b64)
            payload = json.loads(payload_bytes.decode("utf-8"))

            return {
                "user_id": payload.get("user_id"),
                "username": payload.get("sub"),
                "role": payload.get("role"),
                "session_id": payload.get("session_id"),
            }
        except Exception:
            # If we can't decode, just continue without context
            return None

    def _log_request_start(
        self, request: Request, user_info: Optional[dict[str, Any]]
    ) -> None:
        """Log request start with context"""
        method = request.method
        path = request.url.path
        query = str(request.url.query) if request.url.query else ""

        user_context = ""
        if user_info and user_info.get("username"):
            user_context = f" [user={user_info['username']}"
            if user_info.get("role"):
                user_context += f", role={user_info['role']}"
            user_context += "]"

        request_id = current_request_id.get()
        req_id_str = f" [req={request_id[:8]}]" if request_id else ""

        logger.info(
            f"→ {method} {path}{'?' + query if query else ''}{user_context}{req_id_str}"
        )

    def _log_request_complete(
        self,
        request: Request,
        response,
        duration_ms: float,
        user_info: Optional[dict[str, Any]],
    ) -> None:
        """Log request completion with duration"""
        method = request.method
        path = request.url.path
        status = response.status_code

        # Determine log level based on status code
        if status >= 500:
            log_fn = logger.error
        elif status >= 400:
            log_fn = logger.warning
        else:
            log_fn = logger.info

        user_context = ""
        if user_info and user_info.get("username"):
            user_context = f" [user={user_info['username']}]"

        request_id = current_request_id.get()
        req_id_str = f" [req={request_id[:8]}]" if request_id else ""

        log_fn(
            f"← {method} {path} → {status} ({duration_ms:.2f}ms){user_context}{req_id_str}"
        )

    def _clear_context(self) -> None:
        """Clear all context variables after request"""
        current_user_id.set(None)
        current_username.set(None)
        current_session_id.set(None)
        current_request_id.set(None)


def setup_session_context_logging(
    logger_instance: Optional[logging.Logger] = None,
) -> SessionContextFilter:
    """
    Setup session context filter on a logger
    Returns the filter for use with multiple loggers

    Usage:
        filter = setup_session_context_logging()
        logging.getLogger("backend").addFilter(filter)
    """
    context_filter = SessionContextFilter()

    if logger_instance:
        for handler in logger_instance.handlers:
            handler.addFilter(context_filter)

    return context_filter


# Convenience function to get current context as dict
def get_current_context() -> dict[str, Optional[str]]:
    """Get current session context as a dictionary"""
    return {
        "user_id": current_user_id.get(),
        "username": current_username.get(),
        "session_id": current_session_id.get(),
        "request_id": current_request_id.get(),
    }
