"""
Input Sanitization Middleware (2024/2025 Best Practice)
Sanitizes input to prevent XSS and injection attacks
"""

import html
import logging
import re
from typing import Any, Optional

from fastapi import status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Input Sanitization Middleware
    Sanitizes user input to prevent XSS and injection attacks
    """

    # Dangerous patterns to detect
    DANGEROUS_PATTERNS = [
        (r"<script.*?>.*?</script>", "XSS: Script tags"),
        (r"javascript:", "XSS: JavaScript protocol"),
        (r"on\w+\s*=", "XSS: Event handlers"),
        (r"<iframe.*?>.*?</iframe>", "XSS: Iframe tags"),
        (r"<object.*?>.*?</object>", "XSS: Object tags"),
        (r"<embed.*?>.*?</embed>", "XSS: Embed tags"),
        (r"<link.*?>.*?</link>", "XSS: Link tags"),
        (r"<style.*?>.*?</style>", "XSS: Style tags"),
        (r"<base.*?>", "XSS: Base tags"),
        (r"<meta.*?>", "XSS: Meta tags"),
        (r"--", "SQL Injection: Comments"),
        (
            r";\s*(drop|delete|insert|update|select|create|alter|exec|execute)",
            "SQL Injection: Commands",
        ),
        (r"union.*select", "SQL Injection: Union"),
        (r"or\s+1\s*=\s*1", "SQL Injection: Always true"),
        (r"/etc/passwd", "Path Traversal"),
        (r"\.\./", "Path Traversal"),
        (r"\.\.\\", "Path Traversal"),
    ]

    def __init__(
        self,
        app,
        sanitize_json: bool = True,
        sanitize_query: bool = True,
        sanitize_headers: bool = False,  # Usually headers are safe
        log_violations: bool = True,
        block_violations: bool = True,
    ):
        super().__init__(app)
        self.sanitize_json = sanitize_json
        self.sanitize_query = sanitize_query
        self.sanitize_headers = sanitize_headers
        self.log_violations = log_violations
        self.block_violations = block_violations

    async def _sanitize_query_params(
        self, request: Request, request_id: str
    ) -> Optional[JSONResponse]:
        if self.sanitize_query and request.query_params:
            for key, value in request.query_params.items():
                if self._is_dangerous(str(value)):
                    if self.log_violations:
                        logger.warning(
                            f"Potential injection attack detected in query parameter '{key}': {value} "
                            f"[Request-ID: {request_id}]"
                        )
                    if self.block_violations:
                        return JSONResponse(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            content={
                                "error": "Invalid input detected",
                                "message": "Request contains potentially dangerous input",
                                "request_id": request_id,
                            },
                        )
        return None

    async def _sanitize_json_body(
        self, request: Request, request_id: str
    ) -> Optional[JSONResponse]:
        if self.sanitize_json and request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.json()
                if self._contains_dangerous_input(body):
                    if self.log_violations:
                        logger.warning(
                            f"Potential injection attack detected in request body "
                            f"[Request-ID: {request_id}]"
                        )
                    if self.block_violations:
                        return JSONResponse(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            content={
                                "error": "Invalid input detected",
                                "message": "Request body contains potentially dangerous input",
                                "request_id": request_id,
                            },
                        )
            except Exception:
                pass
        return None

    def _sanitize_headers(
        self, request: Request, request_id: str
    ) -> Optional[JSONResponse]:
        if self.sanitize_headers:
            for header_name, header_value in request.headers.items():
                if self._is_dangerous(str(header_value)):
                    if self.log_violations:
                        logger.warning(
                            f"Potential injection attack detected in header '{header_name}': {header_value} "
                            f"[Request-ID: {request_id}]"
                        )
                    if self.block_violations:
                        return JSONResponse(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            content={
                                "error": "Invalid input detected",
                                "message": "Request headers contain potentially dangerous input",
                                "request_id": request_id,
                            },
                        )
        return None

    async def dispatch(self, request: Request, call_next):
        """Process request with input sanitization"""
        request_id = getattr(request.state, "request_id", "unknown")

        # Check query parameters
        response = await self._sanitize_query_params(request, request_id)
        if response:
            return response

        # Check request body (if JSON)
        response = await self._sanitize_json_body(request, request_id)
        if response:
            return response

        # Check headers if enabled
        response = self._sanitize_headers(request, request_id)
        if response:
            return response

        # Process request
        response = await call_next(request)
        return response

    def _is_dangerous(self, value: str) -> bool:
        """Check if value contains dangerous patterns"""
        if not value or not isinstance(value, str):
            return False

        value_lower = value.lower()
        for pattern, _description in self.DANGEROUS_PATTERNS:
            if re.search(pattern, value_lower, re.IGNORECASE | re.DOTALL):
                return True

        return False

    def _contains_dangerous_input(self, data: Any) -> bool:
        """Recursively check if data contains dangerous input"""
        if isinstance(data, str):
            return self._is_dangerous(data)
        elif isinstance(data, dict):
            return any(self._contains_dangerous_input(v) for v in data.values())
        elif isinstance(data, list):
            return any(self._contains_dangerous_input(item) for item in data)

        return False

    @staticmethod
    def sanitize_string(value: str) -> str:
        """Sanitize a string value"""
        # HTML escape
        sanitized = html.escape(value)

        # Remove potentially dangerous characters
        sanitized = re.sub(r"<[^>]+>", "", sanitized)

        return sanitized

    @staticmethod
    def sanitize_dict(data: dict[str, Any]) -> dict[str, Any]:
        """Recursively sanitize dictionary values"""
        sanitized: dict[str, Any] = {}
        for key, value in data.items():
            if isinstance(value, str):
                sanitized[key] = InputSanitizationMiddleware.sanitize_string(value)
            elif isinstance(value, dict):
                sanitized[key] = InputSanitizationMiddleware.sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    (
                        InputSanitizationMiddleware.sanitize_string(item)
                        if isinstance(item, str)
                        else (
                            InputSanitizationMiddleware.sanitize_dict(item)
                            if isinstance(item, dict)
                            else item
                        )
                    )
                    for item in value
                ]
            else:
                sanitized[key] = value

        return sanitized
