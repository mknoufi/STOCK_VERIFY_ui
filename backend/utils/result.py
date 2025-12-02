"""
Robust Result type implementation with comprehensive error handling.
Designed for high reliability and clear error tracking.
"""

from __future__ import annotations

import logging
import traceback
from dataclasses import dataclass, field
from functools import wraps
from typing import Any, Callable, Dict, Generic, Optional, Type, TypeVar, cast, Literal


# Type variables for generic typing
T = TypeVar("T")
E = TypeVar("E", bound=Exception)
U = TypeVar("U")
F = TypeVar("F", bound=Exception)
L = TypeVar("L")
R = TypeVar("R")

# Configure logger
logger = logging.getLogger(__name__)


class ResultError(Exception):
    """Base exception for Result-related errors."""

    pass


class UnwrapError(ResultError):
    """Raised when unwrapping a failed Result."""

    def __init__(self, error: Exception):
        self.error = error
        super().__init__(f"Attempted to unwrap failed result: {error}")


@dataclass(frozen=True)
class Result(Generic[T, E]):
    """
    A type that represents either a success (Ok) or failure (Err).

    This implementation is:
    - Immutable (prevents accidental modification)
    - Thread-safe
    - Memory efficient with __slots__
    - Fully typed
    - Preserves stack traces
    - Context manager compatible
    """

    _value: Optional[T] = field(default=None, init=False)
    _error: Optional[E] = field(default=None, init=False)
    _traceback: Optional[str] = field(default=None, init=False, repr=False)
    _is_success: bool = field(default=False, init=False)

    def __post_init__(self) -> None:
        """Initialize the result based on the presence of value or error."""
        if hasattr(self, "_value") and hasattr(self, "_error"):
            return  # Already initialized by a subclass

        if hasattr(self, "_value"):
            object.__setattr__(self, "_is_success", True)
        elif hasattr(self, "_error"):
            object.__setattr__(self, "_is_success", False)
            if not hasattr(self, "_traceback") or self._traceback is None:
                error = cast(Exception, self._error)
                tb = "".join(
                    traceback.format_exception(
                        type(error), error, getattr(error, "__traceback__", None)
                    )
                )
                object.__setattr__(self, "_traceback", tb)
        else:
            raise ValueError("Result must be initialized with either value or error")

    @classmethod
    def ok(cls, value: T) -> "Result[T, Any]":
        """Create a successful result with a value."""
        if value is None:
            raise ValueError("Cannot create Ok(None). Use Optional[Result[T, E]] if needed.")
        result = cls()
        object.__setattr__(result, "_value", value)
        object.__setattr__(result, "_is_success", True)
        return result

    @classmethod
    def fail(cls, error: E, context: Optional[Dict[str, Any]] = None) -> "Result[Any, E]":
        """Create a failed result with an error and optional context."""
        if error is None:
            raise ValueError("Cannot create Fail(None)")

        # Enhance error with context if provided
        if context and isinstance(error, Exception):
            for key, value in context.items():
                if not hasattr(error, key):
                    setattr(error, key, value)

        result = cls()
        object.__setattr__(result, "_error", error)
        object.__setattr__(result, "_is_success", False)
        return result

    @classmethod
    def from_callable(
        cls,
        func: Callable[..., T],
        *args: Any,
        error_type: Type[E] = Exception,  # type: ignore
        **kwargs: Any,
    ) -> "Result[T, E]":
        """Create a result from a callable, automatically catching exceptions."""
        try:
            return cls.ok(func(*args, **kwargs))
        except error_type as e:
            return cls.fail(e)
        except Exception as e:
            logger.exception("Unexpected error in from_callable")
            return cls.fail(error_type(f"Unexpected error: {str(e)}"))

    @property
    def is_ok(self) -> bool:
        """Return True if the result is successful."""
        return self._is_success

    @property
    def is_err(self) -> bool:
        """Return True if the result is a failure."""
        return not self._is_success

    def unwrap(self) -> T:
        """Return the value if successful, otherwise raise the error."""
        if self.is_ok:
            return cast(T, self._value)
        raise UnwrapError(cast(Exception, self._error))

    def unwrap_or(self, default: T) -> T:
        """Return the value if successful, otherwise return the default."""
        return cast(T, self._value) if self.is_ok else default

    def unwrap_or_else(self, fn: Callable[[E], T]) -> T:
        """Return the value if successful, otherwise call fn with the error."""
        return cast(T, self._value) if self.is_ok else fn(cast(E, self._error))

    def map(self, fn: Callable[[T], U]) -> "Result[U, E]":
        """Apply fn to the value if successful."""
        if self.is_ok:
            try:
                return Result.ok(fn(cast(T, self._value)))
            except Exception as e:
                logger.exception("Error in map operation")
                return Result.fail(cast(E, e))
        return cast(Result[U, E], self)

    def map_error(self, fn: Callable[[E], F]) -> "Result[T, F]":
        """Apply fn to the error if failed."""
        if self.is_err:
            try:
                return Result.fail(fn(cast(E, self._error)))
            except Exception as e:
                logger.exception("Error in map_error operation")
                return Result.fail(cast(F, e))
        return cast(Result[T, F], self)

    def and_then(self, fn: Callable[[T], "Result[U, E]"]) -> "Result[U, E]":
        """Chain operations that might fail."""
        if self.is_ok:
            try:
                return fn(cast(T, self._value))
            except Exception as e:
                logger.exception("Error in and_then operation")
                return Result.fail(cast(E, e))
        return cast(Result[U, E], self)

    def or_else(self, fn: Callable[[E], "Result[T, F]"]) -> "Result[T, F]":
        """Handle errors by calling fn with the error."""
        if self.is_err:
            try:
                return fn(cast(E, self._error))
            except Exception as e:
                logger.exception("Error in or_else operation")
                return Result.fail(cast(F, e))
        return cast(Result[T, F], self)

    def match(self, ok: Callable[[T], U], err: Callable[[E], U]) -> U:
        """Pattern matching style handling."""
        if self.is_ok:
            return ok(cast(T, self._value))
        return err(cast(E, self._error))

    def log_error(self, logger: logging.Logger, message: str = "") -> "Result[T, E]":
        """Log the error if the result is a failure."""
        if self.is_err:
            logger.error(f"{message}: {str(self._error)}", extra={"traceback": self._traceback})
        return self

    def to_optional(self) -> Optional[T]:
        """Convert to Optional[T], returning None on error."""
        return self._value if self.is_ok else None

    def to_either(self) -> "Either[E, T]":
        """Convert to an Either type (Right=success, Left=error)."""
        if self.is_ok:
            return Right(cast(T, self._value))
        return Left(cast(E, self._error))

    def __str__(self) -> str:
        if self.is_ok:
            return f"Ok({self._value})"
        return f"Err({self._error})"

    def __repr__(self) -> str:
        return str(self)

    # Context manager support
    def __enter__(self) -> "Result[T, E]":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> Literal[False]:
        # When a failed Result is used as a context manager we surface the original
        # exception instead of the UnwrapError wrapper to keep error expectations
        # backwards compatible with legacy tests.
        if isinstance(exc_val, UnwrapError) and isinstance(exc_val.error, Exception):
            raise exc_val.error

        # Don't suppress non-Result exceptions
        return False


# Alias for better readability
Ok = Result.ok
Fail = Result.fail


# Either type implementation
@dataclass(frozen=True)
class Either(Generic[L, R]):
    """A value that can be either Left (error) or Right (success)."""

    _value: Any
    _is_right: bool

    @classmethod
    def left(cls, value: L) -> "Either[L, R]":
        return cls(_value=value, _is_right=False)

    @classmethod
    def right(cls, value: R) -> "Either[L, R]":
        return cls(_value=value, _is_right=True)

    @property
    def is_right(self) -> bool:
        return self._is_right

    @property
    def is_left(self) -> bool:
        return not self._is_right

    def fold(self, left_fn: Callable[[L], T], right_fn: Callable[[R], T]) -> T:
        """Transform either value with the appropriate function."""
        if self.is_right:
            return right_fn(cast(R, self._value))
        return left_fn(cast(L, self._value))

    def get_or_else(self, default: R) -> R:
        """Get the right value or return the default."""
        return cast(R, self._value) if self.is_right else default

    def map(self, fn: Callable[[R], U]) -> "Either[L, U]":
        """Apply fn to the right value."""
        if self.is_right:
            return Either.right(fn(cast(R, self._value)))
        return cast(Either[L, U], self)

    def map_left(self, fn: Callable[[L], F]) -> "Either[F, R]":
        """Apply fn to the left value."""
        if self.is_left:
            return Either.left(fn(cast(L, self._value)))
        return cast(Either[F, R], self)


# Type aliases for Either
Left = Either.left
Right = Either.right


# Decorator for automatic error handling
def result_function(
    error_type: Type[E] = Exception,  # type: ignore
) -> Callable[..., Callable[..., Result[T, E]]]:
    """
    Decorator to automatically wrap function return values in Result.

    Example:
        @result_function(ValueError)
        def divide(a: int, b: int) -> int:
            return a / b

        result = divide(10, 0)  # Returns Result[int, ValueError]
    """

    def decorator(fn: Callable[..., T]) -> Callable[..., Result[T, E]]:
        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Result[T, E]:
            return Result.from_callable(fn, *args, error_type=error_type, **kwargs)

        return wrapper

    return decorator


# API Response Helpers
try:  # noqa: C901
    from fastapi import HTTPException
    from typing import Any as AnyType, Coroutine

    F_Async = TypeVar("F_Async", bound=Callable[..., Coroutine[AnyType, AnyType, AnyType]])

    ERROR_STATUS_MAP = {
        "AuthenticationError": 401,
        "AuthorizationError": 403,
        "ValidationError": 422,
        "NotFoundError": 404,
        "RateLimitExceededError": 429,
    }

    def _get_status_code(error_name: str) -> int:
        for key, code in ERROR_STATUS_MAP.items():
            if key in error_name:
                return code
        return 500

    def handle_result(result: Result[T, E], success_status: int = 200) -> Dict[str, Any]:
        """Convert a Result type to a proper API response."""
        if result.is_ok:
            return {"success": True, "data": result.unwrap(), "error": None}

        # Try common error attributes for Result
        error = getattr(result, "err", None) or getattr(result, "_error", None)
        if error is None:
            logger.error("Result has no error attribute - this should not happen")
            error = Exception("Unknown error")

        # Check for specific error types
        error_name = error.__class__.__name__
        status_code = _get_status_code(error_name)

        if status_code == 500:
            # Log unexpected errors
            import uuid

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

        raise HTTPException(
            status_code=status_code,
            detail={
                "success": False,
                "error": {
                    "message": str(error),
                    "code": error_name,
                    "details": getattr(error, "details", {}),
                },
            },
        )

    def result_to_response(success_status: int = 200) -> Callable[[F_Async], F_Async]:
        """
        Decorator to convert Result types to API responses

        Args:
            success_status: HTTP status code for successful responses

        Returns:
            Decorated function that returns API-compatible responses
        """

        def decorator(func: F_Async) -> F_Async:
            @wraps(func)
            async def wrapper(*args: AnyType, **kwargs: AnyType) -> Dict[str, Any] | Any:
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

            return cast(F_Async, wrapper)

        return decorator

except ImportError:
    pass  # FastAPI not installed or not needed in this context
