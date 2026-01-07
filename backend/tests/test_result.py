"""
Comprehensive test suite for the Result type implementation.
"""

import pytest

from backend.utils.result import (
    Fail,
    Left,
    Ok,
    Result,
    Right,
    UnwrapError,
    result_function,
)


# Test data
class CustomError(Exception):
    """Custom error type for testing."""

    pass


class TestResult:
    """Test cases for the Result type."""

    def test_ok_creation(self):
        """Test creating a successful result."""
        result = Ok(42)
        assert result.is_ok
        assert not result.is_err
        assert result.unwrap() == 42

    def test_fail_creation(self):
        """Test creating a failed result."""
        error = ValueError("test error")
        result = Fail(error)
        assert not result.is_ok
        assert result.is_err
        with pytest.raises(UnwrapError):
            result.unwrap()

    def test_unwrap_or(self):
        """Test unwrap_or with success and failure cases."""
        assert Ok(42).unwrap_or(0) == 42
        assert Fail(ValueError("error")).unwrap_or(0) == 0

    def test_map_success(self):
        """Test mapping over a successful result."""
        result = Ok(21).map(lambda x: x * 2)
        assert result.unwrap() == 42

    def test_map_failure(self):
        """Test that mapping a failure returns the same failure."""
        error = ValueError("test")
        result = Fail(error).map(lambda x: x * 2)
        assert result.is_err
        with pytest.raises(UnwrapError):
            result.unwrap()

    def test_map_preserves_error(self):
        """Test that mapping preserves the original error."""
        error = ValueError("original")
        result = Fail(error).map(lambda x: x * 2)
        with pytest.raises(UnwrapError) as exc_info:
            result.unwrap()
        assert str(exc_info.value.error) == "original"

    def test_and_then_success(self):
        """Test chaining operations that might fail."""

        def safe_divide(x: int, y: int) -> Result[int, str]:
            if y == 0:
                return Fail("division by zero")
            return Ok(x // y)

        result = Ok(10).and_then(lambda x: safe_divide(x, 2))
        assert result.unwrap() == 5

    def test_and_then_failure(self):
        """Test that and_then short-circuits on failure."""

        def fail_if_positive(x: int) -> Result[int, str]:
            return Fail("positive")

        result = (
            Ok(10)
            .and_then(lambda x: Ok(x * 2))  # This runs
            .and_then(fail_if_positive)  # This fails
            .and_then(lambda x: Ok(x + 1))  # This is skipped
        )
        assert result.is_err
        assert result.unwrap_or("error") == "error"

    def test_or_else(self):
        """Test error recovery with or_else."""
        result = Fail("original error").or_else(lambda e: Ok(f"recovered from {e}"))
        assert result.unwrap() == "recovered from original error"

    def test_match(self):
        """Test pattern matching style handling."""
        success = Ok(42)
        failure = Fail(ValueError("error"))

        def handle(result: Result[int, Exception]) -> str:
            return result.match(ok=lambda x: f"Success: {x}", err=lambda e: f"Error: {str(e)}")

        assert handle(success) == "Success: 42"
        assert handle(failure) == "Error: error"

    def test_context_manager_success(self):
        """Test using Result as a context manager with success."""
        with Ok(42) as result:
            value = result.unwrap()
            assert value == 42

    def test_context_manager_failure(self):
        """Test using Result as a context manager with failure."""
        with pytest.raises(ValueError):
            with Fail(ValueError("test")) as result:
                result.unwrap()

    def test_from_callable_success(self):
        """Test creating a result from a successful callable."""

        def add(a: int, b: int) -> int:
            return a + b

        result = Result.from_callable(add, 2, 3)
        assert result.unwrap() == 5

    def test_from_callable_failure(self):
        """Test creating a result from a failing callable."""

        def fail() -> int:
            raise ValueError("test error")

        result = Result.from_callable(fail, error_type=ValueError)
        assert result.is_err
        with pytest.raises(UnwrapError) as exc_info:
            result.unwrap()
        assert "test error" in str(exc_info.value)

    def test_log_error(self, caplog):
        """Test error logging."""
        import logging

        logger = logging.getLogger(__name__)

        error = ValueError("test error")
        result = Fail(error).log_error(logger, "Operation failed")

        assert "Operation failed: test error" in caplog.text
        assert result.is_err


class TestResultFunctionDecorator:
    """Test the @result_function decorator."""

    def test_successful_function(self):
        """Test decorating a function that succeeds."""

        @result_function(ValueError)
        def add(a: int, b: int) -> int:
            return a + b

        result = add(2, 3)
        assert result.unwrap() == 5

    def test_failing_function(self):
        """Test decorating a function that raises an exception."""

        @result_function(ValueError)
        def divide(a: int, b: int) -> float:
            return a / b

        result = divide(10, 0)
        assert result.is_err
        assert isinstance(result.unwrap_or("error"), str)

    def test_custom_error_type(self):
        """Test with a custom error type."""

        @result_function(CustomError)
        def might_fail() -> int:
            raise ValueError("test")

        result = might_fail()
        assert result.is_err
        assert isinstance(result.unwrap_or("error"), str)


class TestEither:
    """Test cases for the Either type."""

    def test_right_creation(self):
        """Test creating a Right value."""
        right = Right(42)
        assert right.is_right
        assert not right.is_left

    def test_left_creation(self):
        """Test creating a Left value."""
        left = Left("error")
        assert left.is_left
        assert not left.is_right

    def test_fold_right(self):
        """Test folding a Right value."""
        right = Right(42)
        result = right.fold(left_fn=lambda e: f"Error: {e}", right_fn=lambda x: f"Success: {x}")
        assert result == "Success: 42"

    def test_fold_left(self):
        """Test folding a Left value."""
        left = Left("failure")
        result = left.fold(left_fn=lambda e: f"Error: {e}", right_fn=lambda x: f"Success: {x}")
        assert result == "Error: failure"

    def test_map_right(self):
        """Test mapping over a Right value."""
        right = Right(21).map(lambda x: x * 2)
        assert right.fold(left_fn=str, right_fn=str) == "42"

    def test_map_left(self):
        """Test mapping over a Left value."""
        left = Left("error").map(lambda x: x * 2)
        assert left.fold(left_fn=str, right_fn=str) == "error"
