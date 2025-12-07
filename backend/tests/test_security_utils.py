"""
Tests for Security Utilities
Ensures regex escaping and input sanitization work correctly
"""

import pytest
from backend.utils.security_utils import (
    escape_regex,
    create_safe_regex_query,
    validate_search_term,
    sanitize_for_logging,
    validate_quantity,
    is_valid_barcode,
)


class TestEscapeRegex:
    """Tests for regex escaping function"""

    def test_escape_special_characters(self):
        """Test that special regex characters are escaped"""
        # These characters have special meaning in regex
        special_chars = r".*+?^${}[]|()\"
        escaped = escape_regex(special_chars)
        # Each special char should be escaped with backslash
        assert escaped != special_chars
        assert "\\" in escaped

    def test_escape_empty_string(self):
        """Test escaping empty string"""
        assert escape_regex("") == ""

    def test_escape_normal_string(self):
        """Test that normal strings are unchanged"""
        normal = "Hello World 123"
        assert escape_regex(normal) == normal

    def test_escape_dot_star(self):
        """Test escaping of .* pattern (commonly used in ReDoS)"""
        pattern = ".*"
        escaped = escape_regex(pattern)
        assert escaped == r"\.\*"

    def test_escape_bracket_patterns(self):
        """Test escaping of bracket patterns"""
        pattern = "[a-z]+"
        escaped = escape_regex(pattern)
        assert escaped == r"\[a\-z\]\+"


class TestCreateSafeRegexQuery:
    """Tests for safe MongoDB regex query creation"""

    def test_creates_regex_dict(self):
        """Test that function returns proper MongoDB regex format"""
        query = create_safe_regex_query("test")
        assert "$regex" in query
        assert "$options" in query
        assert query["$options"] == "i"

    def test_escapes_user_input(self):
        """Test that user input is escaped in the query"""
        query = create_safe_regex_query("test.*")
        assert query["$regex"] == r"test\.\*"

    def test_custom_options(self):
        """Test custom regex options"""
        query = create_safe_regex_query("test", options="im")
        assert query["$options"] == "im"


class TestValidateSearchTerm:
    """Tests for search term validation"""

    def test_strips_whitespace(self):
        """Test that leading/trailing whitespace is removed"""
        result = validate_search_term("  test  ")
        assert result == "test"

    def test_truncates_long_strings(self):
        """Test that strings are truncated to max length"""
        long_string = "a" * 300
        result = validate_search_term(long_string, max_length=200)
        assert len(result) == 200

    def test_removes_control_characters(self):
        """Test that control characters are removed"""
        with_null = "test\x00value"
        result = validate_search_term(with_null)
        assert "\x00" not in result

    def test_empty_string(self):
        """Test handling of empty string"""
        assert validate_search_term("") == ""


class TestSanitizeForLogging:
    """Tests for log sanitization"""

    def test_removes_newlines(self):
        """Test that newlines are removed (prevents log injection)"""
        input_str = "test\ninjected\rlog"
        result = sanitize_for_logging(input_str)
        assert "\n" not in result
        assert "\r" not in result

    def test_removes_dangerous_chars(self):
        """Test that potentially dangerous characters are removed"""
        input_str = '<script>alert("xss")</script>'
        result = sanitize_for_logging(input_str)
        assert "<" not in result
        assert ">" not in result
        assert '"' not in result

    def test_truncates_long_input(self):
        """Test that long input is truncated"""
        long_input = "a" * 100
        result = sanitize_for_logging(long_input, max_length=50)
        assert len(result) == 50

    def test_empty_input(self):
        """Test handling of empty input"""
        assert sanitize_for_logging("") == ""
        assert sanitize_for_logging(None) == ""  # type: ignore


class TestValidateQuantity:
    """Tests for quantity validation"""

    def test_valid_quantity(self):
        """Test valid quantities pass"""
        assert validate_quantity(100) == 100.0
        assert validate_quantity(0) == 0.0
        assert validate_quantity(999999) == 999999.0

    def test_negative_quantity_fails(self):
        """Test that negative quantities raise error"""
        with pytest.raises(ValueError, match="at least"):
            validate_quantity(-1)

    def test_too_large_quantity_fails(self):
        """Test that quantities over max raise error"""
        with pytest.raises(ValueError, match="exceed"):
            validate_quantity(2_000_000)

    def test_non_numeric_fails(self):
        """Test that non-numeric values raise error"""
        with pytest.raises(ValueError, match="must be a number"):
            validate_quantity("abc")  # type: ignore

    def test_custom_range(self):
        """Test custom min/max values"""
        assert validate_quantity(50, min_value=10, max_value=100) == 50.0
        with pytest.raises(ValueError):
            validate_quantity(5, min_value=10, max_value=100)


class TestIsValidBarcode:
    """Tests for barcode validation"""

    def test_valid_barcodes(self):
        """Test valid barcodes pass"""
        assert is_valid_barcode("123456789") is True
        assert is_valid_barcode("ABC123") is True
        assert is_valid_barcode("ITEM-001") is True

    def test_empty_barcode_fails(self):
        """Test empty barcodes fail"""
        assert is_valid_barcode("") is False
        assert is_valid_barcode(None) is False  # type: ignore

    def test_too_long_barcode_fails(self):
        """Test that very long barcodes fail"""
        long_barcode = "1" * 100
        assert is_valid_barcode(long_barcode) is False

    def test_invalid_characters_fail(self):
        """Test that invalid characters fail"""
        assert is_valid_barcode("barcode with spaces") is False
        assert is_valid_barcode("bar@code") is False
        assert is_valid_barcode("bar<code>") is False
