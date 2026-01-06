"""
PIN Validation Module

Validates PIN format and security requirements.
"""

from typing import Optional

from pydantic import BaseModel, Field


class PinValidationResult(BaseModel):
    """Result of PIN validation."""

    is_valid: bool = Field(description="Whether the PIN is valid")
    error_message: Optional[str] = Field(default=None, description="Error message if invalid")
    error_code: Optional[str] = Field(default=None, description="Error code for frontend handling")


def validate_pin(pin: str, min_length: int = 4, max_length: int = 6) -> PinValidationResult:
    """
    Validate a PIN against security requirements.

    Requirements:
    - Must be numeric only
    - Length between min_length and max_length (default: 4-6 digits)
    - Cannot be all the same digit (e.g., 1111, 0000)
    - Cannot be a simple sequential pattern (e.g., 1234, 4321)
    - Cannot be a common weak PIN (e.g., 1234, 0000, 1111)

    Args:
        pin: The PIN to validate
        min_length: Minimum allowed length (default: 4)
        max_length: Maximum allowed length (default: 6)

    Returns:
        PinValidationResult with validation status and error details
    """

    # Check if PIN is provided
    if not pin:
        return PinValidationResult(
            is_valid=False, error_message="PIN is required", error_code="PIN_REQUIRED"
        )

    # Check if PIN is numeric only
    if not pin.isdigit():
        return PinValidationResult(
            is_valid=False,
            error_message="PIN must contain only digits",
            error_code="PIN_NOT_NUMERIC",
        )

    # Check length
    if len(pin) < min_length:
        return PinValidationResult(
            is_valid=False,
            error_message=f"PIN must be at least {min_length} digits",
            error_code="PIN_TOO_SHORT",
        )

    if len(pin) > max_length:
        return PinValidationResult(
            is_valid=False,
            error_message=f"PIN must be at most {max_length} digits",
            error_code="PIN_TOO_LONG",
        )

    # Check for repeated digits (e.g., 1111, 0000)
    if len(set(pin)) == 1:
        return PinValidationResult(
            is_valid=False,
            error_message="PIN cannot be all the same digit",
            error_code="PIN_ALL_SAME",
        )

    # Check for sequential patterns
    if _is_sequential(pin):
        return PinValidationResult(
            is_valid=False,
            error_message="PIN cannot be a sequential pattern",
            error_code="PIN_SEQUENTIAL",
        )

    # Check for common weak PINs
    weak_pins = {
        "1234",
        "4321",
        "1111",
        "0000",
        "2222",
        "3333",
        "4444",
        "5555",
        "6666",
        "7777",
        "8888",
        "9999",
        "1212",
        "2121",
        "1010",
        "0101",
        "1122",
        "2211",
        "1357",
        "2468",
        "0246",
        "1379",
        "2580",
        "0852",
        "123456",
        "654321",
        "111111",
        "000000",
        "123123",
    }

    if pin in weak_pins:
        return PinValidationResult(
            is_valid=False,
            error_message="This PIN is too common. Please choose a more secure PIN",
            error_code="PIN_TOO_COMMON",
        )

    return PinValidationResult(is_valid=True)


def _is_sequential(pin: str) -> bool:
    """
    Check if PIN is a sequential pattern.

    Examples of sequential patterns:
    - Ascending: 1234, 2345, 3456
    - Descending: 4321, 5432, 6543
    """
    digits = [int(d) for d in pin]

    # Check ascending sequence
    is_ascending = all(digits[i] + 1 == digits[i + 1] for i in range(len(digits) - 1))

    # Check descending sequence
    is_descending = all(digits[i] - 1 == digits[i + 1] for i in range(len(digits) - 1))

    return is_ascending or is_descending


def validate_pin_change(
    current_pin: str, new_pin: str, confirm_pin: Optional[str] = None
) -> PinValidationResult:
    """
    Validate a PIN change request.

    Args:
        current_pin: The current PIN
        new_pin: The new PIN to set
        confirm_pin: Optional confirmation of new PIN

    Returns:
        PinValidationResult with validation status
    """

    # Validate new PIN format
    validation = validate_pin(new_pin)
    if not validation.is_valid:
        return validation

    # Check if new PIN is different from current
    if current_pin == new_pin:
        return PinValidationResult(
            is_valid=False,
            error_message="New PIN must be different from current PIN",
            error_code="PIN_SAME_AS_CURRENT",
        )

    # Check confirmation if provided
    if confirm_pin is not None and new_pin != confirm_pin:
        return PinValidationResult(
            is_valid=False,
            error_message="New PIN and confirmation do not match",
            error_code="PIN_MISMATCH",
        )

    return PinValidationResult(is_valid=True)
