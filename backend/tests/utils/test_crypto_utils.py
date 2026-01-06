"""Tests for backend/utils/crypto_utils.py"""

import hashlib

from backend.utils.crypto_utils import get_pin_lookup_hash


class TestCryptoUtils:
    """Test crypto utility functions"""

    def test_get_pin_lookup_hash_basic(self):
        """Test basic PIN hash generation"""
        pin = "1234"
        result = get_pin_lookup_hash(pin)

        # Should return a hex string
        assert isinstance(result, str)
        assert len(result) == 64  # SHA-256 produces 64 hex characters

        # Should be deterministic
        assert result == get_pin_lookup_hash(pin)

    def test_get_pin_lookup_hash_matches_sha256(self):
        """Test that hash matches standard SHA-256"""
        pin = "5678"
        result = get_pin_lookup_hash(pin)

        # Should match manual SHA-256 calculation
        expected = hashlib.sha256(pin.encode("utf-8")).hexdigest()
        assert result == expected

    def test_get_pin_lookup_hash_different_pins(self):
        """Test that different PINs produce different hashes"""
        pin1 = "1111"
        pin2 = "2222"

        hash1 = get_pin_lookup_hash(pin1)
        hash2 = get_pin_lookup_hash(pin2)

        assert hash1 != hash2

    def test_get_pin_lookup_hash_unicode(self):
        """Test PIN hash with unicode characters"""
        pin = "🔒1234"
        result = get_pin_lookup_hash(pin)

        assert isinstance(result, str)
        assert len(result) == 64
