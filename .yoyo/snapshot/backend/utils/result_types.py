"""
Modern Result Type for Zero-Error Error Handling (2024/2025 Best Practice)
Type-safe error handling without exceptions where possible
"""

from typing import Generic, TypeVar, Optional, Callable, Any
from dataclasses import dataclass
from enum import Enum

T = TypeVar("T")
E = TypeVar("E", bound=Exception)


class ResultType(Enum):
    """Result type indicator"""

    SUCCESS = "success"
    ERROR = "error"


@dataclass(frozen=True)
class Result(Generic[T, E]):
    """
    Modern Result type for functional error handling
    Eliminates need for try-except in many cases
    """

    _type: ResultType
    _value: Optional[T] = None
    _error: Optional[E] = None
    _error_message: Optional[str] = None

    @staticmethod
    def success(value: T) -> "Result[T, E]":
        """Create successful result"""
        return Result(_type=ResultType.SUCCESS, _value=value)

    @staticmethod
    def error(error: E, message: Optional[str] = None) -> "Result[T, E]":
        """Create error result"""
        return Result(_type=ResultType.ERROR, _error=error, _error_message=message or str(error))

    @property
    def is_success(self) -> bool:
        """Check if result is successful"""
        return self._type == ResultType.SUCCESS

    @property
    def is_error(self) -> bool:
        """Check if result is error"""
        return self._type == ResultType.ERROR

    def unwrap(self) -> T:
        """Get value or raise error (use when certain of success)"""
        if self.is_success:
            return self._value
        raise self._error or ValueError(self._error_message)

    def unwrap_or(self, default: T) -> T:
        """Get value or return default"""
        return self._value if self.is_success else default

    def unwrap_or_else(self, fn: Callable[[E], T]) -> T:
        """Get value or compute from error"""
        if self.is_success:
            return self._value
        return fn(self._error)

    def map(self, fn: Callable[[T], Any]) -> "Result[Any, E]":
        """Transform successful value"""
        if self.is_success:
            try:
                return Result.success(fn(self._value))
            except Exception as e:
                return Result.error(e, str(e))
        return Result.error(self._error, self._error_message)

    def map_error(self, fn: Callable[[E], Any]) -> "Result[T, Any]":
        """Transform error"""
        if self.is_error:
            try:
                return Result.error(fn(self._error), self._error_message)
            except Exception as e:
                return Result.error(e, str(e))
        return Result.success(self._value)

    def and_then(self, fn: Callable[[T], "Result[Any, E]"]) -> "Result[Any, E]":
        """Chain operations (flatMap/monadic bind)"""
        if self.is_success:
            return fn(self._value)
        return Result.error(self._error, self._error_message)

    def or_else(self, fn: Callable[[E], "Result[T, Any]"]) -> "Result[T, Any]":
        """Recover from error"""
        if self.is_error:
            return fn(self._error)
        return Result.success(self._value)

    def match(self, on_success: Callable[[T], Any], on_error: Callable[[E, str], Any]) -> Any:
        """Pattern matching style handling"""
        if self.is_success:
            return on_success(self._value)
        return on_error(self._error, self._error_message)

    def to_tuple(self) -> tuple[bool, Optional[T], Optional[E]]:
        """Convert to tuple for compatibility"""
        return (self.is_success, self._value, self._error)

    def __str__(self) -> str:
        if self.is_success:
            return f"Result.success({self._value})"
        return f"Result.error({self._error_message})"

    def __repr__(self) -> str:
        return self.__str__()


# Type aliases for common use cases
OptionalResult = Result[Optional[T], E]
IntResult = Result[int, E]
StrResult = Result[str, E]
BoolResult = Result[bool, E]
DictResult = Result[dict, E]
ListResult = Result[list, E]
