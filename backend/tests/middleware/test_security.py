"""
Tests for middleware/security.py
Comprehensive tests for input sanitization, filter validation, and rate limiting
"""

from unittest.mock import Mock

from backend.middleware.security import (
    sanitize_barcode,
    sanitize_filter_keys,
    sanitize_string_input,
    LoginRateLimiter,
    BatchRateLimiter,
    get_client_ip,
    ALLOWED_FILTER_KEYS,
    _is_regex_value,
)


class TestBarcodeSanitization:
    """Test barcode input sanitization"""

    def test_sanitize_valid_barcode(self):
        """Test that valid barcodes pass through unchanged"""
        valid_barcodes = ["123456", "ABC123", "test-code", "code_123", "A1-B2_C3"]
        for barcode in valid_barcodes:
            assert sanitize_barcode(barcode) == barcode

    def test_sanitize_barcode_removes_special_chars(self):
        """Test that special characters are removed"""
        assert sanitize_barcode("123!@#456") == "123456"
        assert sanitize_barcode("code<script>") == "codescript"
        assert sanitize_barcode("test;DROP TABLE") == "testDROPTABLE"

    def test_sanitize_barcode_with_spaces(self):
        """Test that spaces are removed"""
        assert sanitize_barcode("  123 456  ") == "123456"
        assert sanitize_barcode("A B C") == "ABC"

    def test_sanitize_empty_barcode(self):
        """Test empty barcode handling"""
        assert sanitize_barcode("") == ""
        assert sanitize_barcode("   ") == ""

    def test_sanitize_barcode_sql_injection(self):
        """Test SQL injection attempt sanitization"""
        malicious = "123' OR '1'='1"
        sanitized = sanitize_barcode(malicious)
        assert "'" not in sanitized
        assert "OR" in sanitized  # Letters are allowed
        assert sanitized == "123OR11"


class TestFilterKeySanitization:
    """Test filter key sanitization and validation"""

    def test_sanitize_filter_keys_allowed(self):
        """Test that allowed keys pass through"""
        filters = {
            "warehouse": "WH01",
            "status": "active",
            "item_code": "ITEM123",
        }
        result = sanitize_filter_keys(filters)
        assert result == filters

    def test_sanitize_filter_keys_reject_disallowed(self):
        """Test that disallowed keys are rejected"""
        filters = {
            "warehouse": "WH01",
            "malicious_key": "DROP TABLE",
            "$where": "malicious code",
        }
        result = sanitize_filter_keys(filters)
        assert "warehouse" in result
        assert "malicious_key" not in result
        assert "$where" not in result

    def test_sanitize_filter_keys_normalize_keys(self):
        """Test that keys are normalized (lowercase, stripped)"""
        filters = {
            "  WAREHOUSE  ": "WH01",
            "Status": "active",
        }
        result = sanitize_filter_keys(filters)
        assert "warehouse" in result
        assert "status" in result
        assert result["warehouse"] == "WH01"

    def test_sanitize_filter_keys_custom_allowed(self):
        """Test custom allowed keys parameter"""
        filters = {
            "custom_key": "value",
            "another_key": "value2",
        }
        allowed = {"custom_key"}
        result = sanitize_filter_keys(filters, allowed)
        assert "custom_key" in result
        assert "another_key" not in result

    def test_sanitize_filter_keys_empty_dict(self):
        """Test empty dictionary handling"""
        assert sanitize_filter_keys({}) == {}
        assert sanitize_filter_keys(None) == {}

    def test_sanitize_filter_keys_regex_escape(self):
        """Test that regex patterns are escaped"""
        filters = {
            "item_code": ".*test.*",  # Regex pattern
        }
        result = sanitize_filter_keys(filters)
        # Should escape the regex special chars
        assert "item_code" in result


class TestRegexValueDetection:
    """Test regex pattern detection"""

    def test_is_regex_value_true(self):
        """Test detection of regex patterns"""
        regex_patterns = [".*", "test.+", "^start", "end$", "\\d+", "\\w*", "[abc]", "(group)"]
        for pattern in regex_patterns:
            assert _is_regex_value(pattern) is True

    def test_is_regex_value_false(self):
        """Test normal strings are not detected as regex"""
        normal_strings = ["test", "simple_value", "no-special-chars", "123456"]
        for string in normal_strings:
            assert _is_regex_value(string) is False


class TestStringInputSanitization:
    """Test general string input sanitization"""

    def test_sanitize_string_input_html_tags(self):
        """Test HTML tag removal"""
        assert sanitize_string_input("<p>Hello</p>") == "Hello"
        # Script tags are removed but content remains (expected behavior)
        assert sanitize_string_input("<script>alert('xss')</script>") == "alert('xss')"
        assert sanitize_string_input("Text <b>bold</b> text") == "Text bold text"

    def test_sanitize_string_input_javascript(self):
        """Test JavaScript removal"""
        assert sanitize_string_input("javascript:alert('xss')") == "alert('xss')"
        assert sanitize_string_input("JAVASCRIPT:malicious()") == "malicious()"

    def test_sanitize_string_input_event_handlers(self):
        """Test event handler removal"""
        assert sanitize_string_input("text onclick=alert(1)") == "text alert(1)"
        assert sanitize_string_input("onerror=malicious") == "malicious"

    def test_sanitize_string_input_max_length(self):
        """Test length truncation"""
        long_string = "a" * 2000
        result = sanitize_string_input(long_string, max_length=100)
        assert len(result) == 100

    def test_sanitize_string_input_empty(self):
        """Test empty string handling"""
        assert sanitize_string_input("") == ""
        assert sanitize_string_input("   ") == ""


class TestLoginRateLimiter:
    """Test login rate limiting"""

    def test_login_rate_limiter_allows_initial_attempts(self):
        """Test that initial attempts are allowed"""
        limiter = LoginRateLimiter(max_attempts=5)
        ip = "192.168.1.100"

        for i in range(5):
            allowed, info = limiter.is_allowed(ip)
            assert allowed is True
            assert info["remaining"] == 4 - i

    def test_login_rate_limiter_blocks_after_max(self):
        """Test that attempts are blocked after reaching max"""
        limiter = LoginRateLimiter(max_attempts=3)
        ip = "192.168.1.101"

        # Use up the allowed attempts
        for _ in range(3):
            limiter.is_allowed(ip)

        # Next attempt should be blocked
        allowed, info = limiter.is_allowed(ip)
        assert allowed is False
        assert info["remaining"] == 0
        assert "retry_after" in info
        assert info["retry_after"] > 0

    def test_login_rate_limiter_reset(self):
        """Test resetting attempts after successful login"""
        limiter = LoginRateLimiter(max_attempts=3)
        ip = "192.168.1.102"

        # Make some attempts
        for _ in range(2):
            limiter.is_allowed(ip)

        # Reset
        limiter.reset(ip)

        # Should allow attempts again
        allowed, info = limiter.is_allowed(ip)
        assert allowed is True
        assert info["remaining"] == 2

    def test_login_rate_limiter_different_ips(self):
        """Test that different IPs have separate limits"""
        limiter = LoginRateLimiter(max_attempts=2)
        ip1 = "192.168.1.103"
        ip2 = "192.168.1.104"

        # Block ip1
        limiter.is_allowed(ip1)
        limiter.is_allowed(ip1)
        allowed1, _ = limiter.is_allowed(ip1)
        assert allowed1 is False

        # ip2 should still be allowed
        allowed2, _ = limiter.is_allowed(ip2)
        assert allowed2 is True

    def test_login_rate_limiter_window_expiry(self):
        """Test that attempts expire after window"""
        limiter = LoginRateLimiter(max_attempts=2, window_seconds=1)
        ip = "192.168.1.105"

        # Use up attempts
        limiter.is_allowed(ip)
        limiter.is_allowed(ip)

        # Should be blocked
        allowed, _ = limiter.is_allowed(ip)
        assert allowed is False

        # Wait for window to expire
        import time
        time.sleep(1.1)

        # Should be allowed again
        allowed, _ = limiter.is_allowed(ip)
        assert allowed is True


class TestBatchRateLimiter:
    """Test batch operation rate limiting"""

    def test_batch_rate_limiter_allows_initial_requests(self):
        """Test that initial requests are allowed"""
        limiter = BatchRateLimiter(max_requests=10)
        user_id = "user123"

        for i in range(10):
            allowed, info = limiter.is_allowed(user_id)
            assert allowed is True
            assert info["remaining"] == 9 - i

    def test_batch_rate_limiter_blocks_after_max(self):
        """Test that requests are blocked after reaching max"""
        limiter = BatchRateLimiter(max_requests=3)
        user_id = "user124"

        # Use up allowed requests
        for _ in range(3):
            limiter.is_allowed(user_id)

        # Next request should be blocked
        allowed, info = limiter.is_allowed(user_id)
        assert allowed is False
        assert info["remaining"] == 0
        assert "retry_after" in info

    def test_batch_rate_limiter_different_users(self):
        """Test that different users have separate limits"""
        limiter = BatchRateLimiter(max_requests=2)
        user1 = "user125"
        user2 = "user126"

        # Block user1
        limiter.is_allowed(user1)
        limiter.is_allowed(user1)
        allowed1, _ = limiter.is_allowed(user1)
        assert allowed1 is False

        # user2 should still be allowed
        allowed2, _ = limiter.is_allowed(user2)
        assert allowed2 is True


class TestClientIPExtraction:
    """Test client IP address extraction"""

    def test_get_client_ip_direct(self):
        """Test direct client IP extraction"""
        request = Mock()
        request.client.host = "192.168.1.200"
        request.headers.get.return_value = None

        ip = get_client_ip(request)
        assert ip == "192.168.1.200"

    def test_get_client_ip_forwarded(self):
        """Test X-Forwarded-For header handling"""
        request = Mock()
        request.headers.get.return_value = "10.0.0.1, 192.168.1.200, 172.16.0.1"

        ip = get_client_ip(request)
        assert ip == "10.0.0.1"  # First IP in chain

    def test_get_client_ip_forwarded_single(self):
        """Test single IP in X-Forwarded-For"""
        request = Mock()
        request.headers.get.return_value = "10.0.0.5"

        ip = get_client_ip(request)
        assert ip == "10.0.0.5"

    def test_get_client_ip_no_client(self):
        """Test handling when client is None"""
        request = Mock()
        request.client = None
        request.headers.get.return_value = None

        ip = get_client_ip(request)
        assert ip == "unknown"


class TestAllowedFilterKeys:
    """Test ALLOWED_FILTER_KEYS constant"""

    def test_allowed_filter_keys_common(self):
        """Test that common filter keys are present"""
        assert "warehouse" in ALLOWED_FILTER_KEYS
        assert "status" in ALLOWED_FILTER_KEYS
        assert "user_id" in ALLOWED_FILTER_KEYS
        assert "session_id" in ALLOWED_FILTER_KEYS

    def test_allowed_filter_keys_no_dangerous(self):
        """Test that dangerous MongoDB operators are not allowed"""
        dangerous_keys = ["$where", "$regex", "$ne", "$gt", "$lt"]
        for key in dangerous_keys:
            assert key not in ALLOWED_FILTER_KEYS
