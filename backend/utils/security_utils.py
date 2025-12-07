"""
Security Utilities
Centralized security functions for input sanitization and validation.
"""

import re
from typing import Optional


def escape_regex(pattern: str) -> str:
    """
    Escape special regex characters in user input to prevent ReDoS attacks.

    This prevents regex injection attacks (CWE-1333) where malicious input
    could cause catastrophic backtracking in regex evaluation.

    Args:
        pattern: The user input to escape

    Returns:
        Escaped string safe for use in regex patterns
    """
    if not pattern:
        return ""
    # Escape all special regex characters
    return re.escape(pattern)


def create_safe_regex_query(value: str, options: str = "i") -> dict:
    """
    Create a MongoDB regex query with escaped user input.

    Args:
        value: User-provided search term (will be escaped)
        options: MongoDB regex options (default: 'i' for case-insensitive)

    Returns:
        MongoDB regex query dict
    """
    return {"$regex": escape_regex(value), "$options": options}


def validate_search_term(term: str, max_length: int = 200) -> str:
    """
    Validate and sanitize a search term.

    Args:
        term: The search term to validate
        max_length: Maximum allowed length (default: 200)

    Returns:
        Sanitized search term

    Raises:
        ValueError: If term is invalid or too long
    """
    if not term:
        return ""

    # Truncate to max length
    sanitized = term.strip()[:max_length]

    # Remove null bytes and control characters
    sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', sanitized)

    return sanitized


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

    # Remove newlines, carriage returns, and control characters
    sanitized = re.sub(r"[\r\n\x00-\x1f\x7f-\x9f]", "", sanitized)

    # Remove potentially dangerous characters for log parsers
    sanitized = re.sub(r'[<>&"\'`]', "", sanitized)

    return sanitized


def validate_quantity(value: float, min_value: float = 0, max_value: float = 1_000_000) -> float:
    """
    Validate and constrain a quantity value.

    Args:
        value: The quantity to validate
        min_value: Minimum allowed value (default: 0)
        max_value: Maximum allowed value (default: 1,000,000)

    Returns:
        Validated quantity

    Raises:
        ValueError: If quantity is invalid
    """
    if not isinstance(value, (int, float)):
        raise ValueError(f"Quantity must be a number, got {type(value).__name__}")

    if value < min_value:
        raise ValueError(f"Quantity must be at least {min_value}")

    if value > max_value:
        raise ValueError(f"Quantity must not exceed {max_value}")

    return float(value)


def is_valid_barcode(barcode: str) -> bool:
    """
    Validate barcode format.

    Args:
        barcode: The barcode string to validate

    Returns:
        True if valid, False otherwise
    """
    if not barcode or not isinstance(barcode, str):
        return False

    # Remove whitespace
    barcode = barcode.strip()

    # Check length (most barcodes are 8-14 digits)
    if len(barcode) < 1 or len(barcode) > 50:
        return False

    # Check for valid characters (alphanumeric and common separators)
    if not re.match(r'^[A-Za-z0-9\-_]+$', barcode):
        return False

    return True
