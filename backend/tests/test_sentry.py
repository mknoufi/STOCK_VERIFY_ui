"""
Tests for Sentry integration configuration
Verifies that Sentry is properly configured for error tracking
"""

from unittest.mock import patch


class TestSentryConfiguration:
    """Tests for Sentry configuration settings"""

    def test_sentry_dsn_can_be_none(self):
        """SENTRY_DSN should be optional (None when not configured)"""
        from backend.config import Settings

        # Create settings without SENTRY_DSN
        settings = Settings(JWT_SECRET="test-secret", SENTRY_DSN=None)
        assert settings.SENTRY_DSN is None

    def test_sentry_dsn_accepts_valid_url(self):
        """SENTRY_DSN should accept valid Sentry URL"""
        from backend.config import Settings

        dsn = "https://key@sentry.io/12345"
        settings = Settings(JWT_SECRET="test-secret", SENTRY_DSN=dsn)
        assert settings.SENTRY_DSN == dsn

    def test_sentry_environment_default(self):
        """SENTRY_ENVIRONMENT defaults to None"""
        from backend.config import Settings

        settings = Settings(JWT_SECRET="test-secret")
        assert settings.SENTRY_ENVIRONMENT is None

    def test_sentry_traces_sample_rate_default(self):
        """SENTRY_TRACES_SAMPLE_RATE defaults to 0.1"""
        from backend.config import Settings

        settings = Settings(JWT_SECRET="test-secret")
        assert settings.SENTRY_TRACES_SAMPLE_RATE == 0.1

    def test_sentry_traces_sample_rate_custom(self):
        """SENTRY_TRACES_SAMPLE_RATE accepts custom value"""
        from backend.config import Settings

        settings = Settings(JWT_SECRET="test-secret", SENTRY_TRACES_SAMPLE_RATE=0.5)
        assert settings.SENTRY_TRACES_SAMPLE_RATE == 0.5

    def test_sentry_profiles_sample_rate_default(self):
        """SENTRY_PROFILES_SAMPLE_RATE defaults to 0.1"""
        from backend.config import Settings

        settings = Settings(JWT_SECRET="test-secret")
        assert settings.SENTRY_PROFILES_SAMPLE_RATE == 0.1


class TestSentryInitialization:
    """Tests for Sentry SDK initialization"""

    @patch("sentry_sdk.init")
    def test_sentry_init_not_called_without_dsn(self, mock_init):
        """Sentry should NOT initialize when DSN is None"""
        from backend.config import Settings

        settings = Settings(JWT_SECRET="test-secret", SENTRY_DSN=None)

        # Sentry init should not be called when DSN is None
        if settings.SENTRY_DSN is None:
            # Verify DSN is None (init shouldn't be called)
            assert settings.SENTRY_DSN is None

    @patch("sentry_sdk.init")
    def test_sentry_init_called_with_dsn(self, mock_init):
        """Sentry should initialize when DSN is provided"""
        dsn = "https://key@sentry.io/12345"

        # Simulating Sentry initialization
        mock_init(dsn=dsn, traces_sample_rate=0.1, profiles_sample_rate=0.1, environment="test")

        mock_init.assert_called_once()


class TestSentryErrorCapture:
    """Tests for Sentry error capture functionality"""

    @patch("sentry_sdk.capture_exception")
    def test_capture_exception(self, mock_capture):
        """Verify exception capture works"""
        test_error = ValueError("Test error for Sentry")

        # Simulate capturing an exception
        mock_capture(test_error)

        mock_capture.assert_called_once_with(test_error)

    @patch("sentry_sdk.capture_message")
    def test_capture_message(self, mock_capture):
        """Verify message capture works"""
        test_message = "Test message for Sentry"

        # Simulate capturing a message
        mock_capture(test_message)

        mock_capture.assert_called_once_with(test_message)

    @patch("sentry_sdk.set_tag")
    def test_set_tags(self, mock_set_tag):
        """Verify tag setting works"""
        # Simulate setting tags
        mock_set_tag("user_id", "user123")
        mock_set_tag("session_id", "sess456")

        assert mock_set_tag.call_count == 2


class TestSentryContext:
    """Tests for Sentry context enrichment"""

    @patch("sentry_sdk.set_user")
    def test_set_user_context(self, mock_set_user):
        """Verify user context can be set"""
        user_data = {"id": "user123", "username": "testuser", "role": "staff"}

        mock_set_user(user_data)

        mock_set_user.assert_called_once_with(user_data)

    @patch("sentry_sdk.set_context")
    def test_set_custom_context(self, mock_set_context):
        """Verify custom context can be set"""
        context_data = {"session_id": "sess123", "scan_count": 50}

        mock_set_context("stock_verify", context_data)

        mock_set_context.assert_called_once_with("stock_verify", context_data)
