import logging
import re
import uuid
from collections.abc import Callable, Coroutine
from functools import wraps
from typing import Any
from typing import Any as AnyType
from typing import TypeVar

from fastapi import HTTPException

from backend.exceptions import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    StockVerifyException,
    ValidationError,
)
from backend.utils.result import Fail, Result

logger = logging.getLogger(__name__)

T = TypeVar("T")
E = TypeVar("E", bound=Exception)
F = TypeVar("F", bound=Callable[..., Coroutine[AnyType, AnyType, AnyType]])


def sanitize_for_logging(user_input: str, max_length: int = 50) -> str:
    """
    Sanitize user input before logging to prevent log injection attacks.

    Args:
        user_input: The user input to sanitize
        max_length: Maximum length to allow (default: 50)

    Returns:
        Sanitized string safe for logging
    """
    if not user_input:
        return ""

    # Convert to string and truncate
    sanitized = str(user_input)[:max_length]

    # Remove newlines, carriage returns, and control characters that could break log format
    sanitized = re.sub(r"[\r\n\x00-\x1f\x7f-\x9f]", "", sanitized)

    # Remove potentially dangerous characters for log parsers
    sanitized = re.sub(r'[<>&"\'`]', "", sanitized)

    return sanitized


def create_safe_error_response(
    status_code: int,
    message: str,
    error_code: str = "INTERNAL_ERROR",
    log_details: str = None,
) -> HTTPException:
    """
    Create a safe error response that doesn't leak sensitive information.

    Args:
        status_code: HTTP status code
        message: Safe user-facing error message
        error_code: Application-specific error code
        log_details: Detailed error for logging only (not sent to client)

    Returns:
        HTTPException with sanitized error information
    """
    if log_details:
        logger.error(f"Internal error ({error_code}): {log_details}")

    return HTTPException(
        status_code=status_code,
        detail={
            "success": False,
            "error": {
                "message": message,
                "code": error_code,
            },
        },
    )


def handle_result(result: Result[T, E], success_status: int = 200) -> dict[str, Any]:
    """Convert a Result type to a proper API response."""
    if result.is_ok:
        return {"success": True, "data": result.unwrap(), "error": None}
    else:
        # Try common error attributes for Result
        error = getattr(result, "err", None) or getattr(result, "_error", None)
        if error is None:
            logger.error("Result has no error attribute - this should not happen")
            error = Exception("Unknown error")

        if isinstance(error, StockVerifyException):
            raise HTTPException(
                status_code=error.status_code,
                detail=error.to_dict(),
            )

        # Fallback for legacy handling or other exceptions
        if isinstance(error, (AuthenticationError, AuthorizationError)):
            status_code = 401 if isinstance(error, AuthenticationError) else 403
            raise HTTPException(
                status_code=status_code,
                detail={
                    "success": False,
                    "error": {
                        "message": str(error),
                        "code": error.__class__.__name__,
                        "details": getattr(error, "details", {}),
                    },
                },
            )
        elif isinstance(error, ValidationError):
            raise HTTPException(
                status_code=422,
                detail={
                    "success": False,
                    "error": {
                        "message": str(error),
                        "code": "VALIDATION_ERROR",
                        "details": getattr(error, "details", {}),
                    },
                },
            )
        elif isinstance(error, NotFoundError):
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": {
                        "message": str(error),
                        "code": "NOT_FOUND",
                        "details": getattr(error, "details", {}),
                    },
                },
            )
        elif isinstance(error, RateLimitError):
            raise HTTPException(
                status_code=429,
                detail={
                    "success": False,
                    "error": {
                        "message": str(error),
                        "code": "RATE_LIMIT_EXCEEDED",
                        "retry_after": getattr(error, "retry_after", None),
                        "details": getattr(error, "details", {}),
                    },
                },
            )
        else:
            # Log unexpected errors
            error_id = str(uuid.uuid4())
            logger.error(
                f"Unexpected error (ID: {error_id}): {str(error)}\n"
                f"Type: {type(error).__name__}\n"
                f"Traceback: {getattr(error, '__traceback__', 'No traceback')}"
            )
            raise HTTPException(
                status_code=500,
                detail={
                    "success": False,
                    "error": {
                        "message": "An unexpected error occurred",
                        "code": "INTERNAL_SERVER_ERROR",
                        "error_id": error_id,
                        "details": {
                            "error_type": type(error).__name__,
                            "error_message": str(error),
                        },
                    },
                },
            )


def result_to_response(success_status: int = 200) -> Callable[[F], F]:
    """
    Decorator to convert Result types to API responses

    Args:
        success_status: HTTP status code for successful responses

    Returns:
        Decorated function that returns API-compatible responses
    """

    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: AnyType, **kwargs: AnyType) -> dict[str, Any]:
            try:
                result = await func(*args, **kwargs)
                if isinstance(result, Result):
                    return handle_result(result, success_status)
                return result
            except HTTPException:
                raise
            except Exception as e:
                # Convert unhandled exceptions to Result and then to API response
                return handle_result(Fail(e), 500)

        return wrapper  # type: ignore

    return decorator
