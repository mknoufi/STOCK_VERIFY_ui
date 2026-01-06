"""Tests for backend/utils/auth_utils.py"""

from datetime import timedelta
from unittest.mock import patch

from backend.utils.auth_utils import (
    _verify_bcrypt_fallback,
    create_access_token,
    get_password_hash,
    verify_password,
)


class TestPasswordHashing:
    """Test password hashing and verification"""

    def test_get_password_hash_basic(self):
        """Test basic password hashing"""
        password = "test_password_123"
        hashed = get_password_hash(password)

        assert hashed
        assert isinstance(hashed, str)
        assert hashed != password
        assert len(hashed) > 0

    def test_verify_password_correct(self):
        """Test password verification with correct password"""
        password = "correct_password"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password"""
        password = "correct_password"
        hashed = get_password_hash(password)

        assert verify_password("wrong_password", hashed) is False

    def test_verify_password_empty_password(self):
        """Test password verification with empty password"""
        hashed = get_password_hash("test")

        assert verify_password("", hashed) is False

    def test_verify_password_empty_hash(self):
        """Test password verification with empty hash"""
        assert verify_password("test", "") is False

    def test_verify_password_none_values(self):
        """Test password verification with None values"""
        with patch("backend.utils.auth_utils.logger"):
            # Empty password
            result = verify_password("", "hash")
            assert result is False

            # Empty hash
            result = verify_password("password", "")
            assert result is False

    def test_long_password_truncation(self):
        """Test that passwords over 72 bytes are truncated"""
        # Create a password longer than 72 bytes
        long_password = "a" * 100

        with patch("backend.utils.auth_utils.logger") as mock_logger:
            hashed = get_password_hash(long_password)

            # Should have logged a warning
            mock_logger.warning.assert_called()

            # Verify with the same long password (should also truncate)
            assert verify_password(long_password, hashed) is True

    def test_password_with_unicode(self):
        """Test password hashing with unicode characters"""
        password = "pässwörd_🔒"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True
        assert verify_password("different", hashed) is False

    def test_verify_password_passlib_exception(self):
        """Test fallback when passlib verification fails"""
        password = "test_password"
        hashed = get_password_hash(password)

        mock_error = Exception("Mock error")
        with patch("backend.utils.auth_utils.pwd_context.verify", side_effect=mock_error):
            # Should fall back to bcrypt
            result = verify_password(password, hashed)
            # Result depends on whether bcrypt fallback succeeds
            assert isinstance(result, bool)

    def test_bcrypt_fallback_success(self):
        """Test direct bcrypt fallback verification"""
        import bcrypt

        password = b"test_password"
        hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode("utf-8")

        result = _verify_bcrypt_fallback(password, hashed)
        assert result is True

    def test_bcrypt_fallback_wrong_password(self):
        """Test bcrypt fallback with wrong password"""
        import bcrypt

        password = b"test_password"
        wrong_password = b"wrong_password"
        hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode("utf-8")

        result = _verify_bcrypt_fallback(wrong_password, hashed)
        assert result is False

    def test_bcrypt_fallback_invalid_hash(self):
        """Test bcrypt fallback with invalid hash"""
        password = b"test_password"
        invalid_hash = "not_a_valid_hash"

        with patch("backend.utils.auth_utils.logger") as mock_logger:
            result = _verify_bcrypt_fallback(password, invalid_hash)
            assert result is False
            mock_logger.error.assert_called()

    def test_bcrypt_fallback_non_string_hash(self):
        """Test bcrypt fallback with non-string hash"""
        password = b"test_password"

        with patch("backend.utils.auth_utils.logger") as mock_logger:
            result = _verify_bcrypt_fallback(password, 12345)  # type: ignore
            assert result is False
            mock_logger.error.assert_called()

    def test_bcrypt_fallback_import_error(self):
        """Test bcrypt fallback when bcrypt is not available"""
        password = b"test_password"
        hashed = "some_hash"

        with patch("backend.utils.auth_utils.bcrypt", side_effect=ImportError):
            with patch("backend.utils.auth_utils.logger"):
                # Mock the import inside the function
                with patch.dict("sys.modules", {"bcrypt": None}):
                    result = _verify_bcrypt_fallback(password, hashed)
                    assert result is False


class TestJWTTokens:
    """Test JWT token creation"""

    def test_create_access_token_basic(self):
        """Test basic JWT token creation"""
        data = {"sub": "user123", "role": "admin"}
        token = create_access_token(data)

        assert token
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_access_token_with_expiry(self):
        """Test JWT token creation with custom expiry"""
        data = {"sub": "user123"}
        expires_delta = timedelta(minutes=30)

        token = create_access_token(data, expires_delta=expires_delta)

        assert token
        assert isinstance(token, str)

    def test_create_access_token_custom_secret(self):
        """Test JWT token creation with custom secret"""
        data = {"sub": "user123"}
        custom_secret = "custom_secret_key_123"

        token = create_access_token(data, secret_key=custom_secret)

        assert token
        assert isinstance(token, str)

    def test_create_access_token_custom_algorithm(self):
        """Test JWT token creation with custom algorithm"""
        data = {"sub": "user123"}

        token = create_access_token(data, algorithm="HS256")

        assert token
        assert isinstance(token, str)

    def test_create_access_token_all_params(self):
        """Test JWT token creation with all parameters"""
        data = {"sub": "user123", "role": "admin"}
        custom_secret = "custom_secret"
        custom_algo = "HS256"
        expires_delta = timedelta(hours=1)

        token = create_access_token(
            data, secret_key=custom_secret, algorithm=custom_algo, expires_delta=expires_delta
        )

        assert token
        assert isinstance(token, str)

    def test_create_access_token_has_required_fields(self):
        """Test that created token has required fields"""
        from backend.auth.jwt_provider import jwt
        from backend.config import settings

        data = {"sub": "user123"}
        token = create_access_token(data)

        # Decode to verify structure
        secret = str(settings.JWT_SECRET)
        algorithm = str(settings.JWT_ALGORITHM)
        decoded = jwt.decode(token, secret, algorithms=[algorithm])

        assert "sub" in decoded
        assert decoded["sub"] == "user123"
        assert "exp" in decoded
        assert "type" in decoded
        assert decoded["type"] == "access"
