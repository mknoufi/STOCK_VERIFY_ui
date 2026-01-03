"""Tests for version checking functionality."""

import pytest
from httpx import ASGITransport, AsyncClient

from backend.api.health import _compare_versions, _parse_version
from backend.server import app


class TestVersionParsing:
    """Test version string parsing."""

    def test_parse_simple_version(self):
        assert _parse_version("1.0.0") == (1, 0, 0)
        assert _parse_version("2.5.3") == (2, 5, 3)
        assert _parse_version("10.20.30") == (10, 20, 30)

    def test_parse_version_with_suffix(self):
        assert _parse_version("1.0.0-beta") == (1, 0, 0)
        assert _parse_version("2.0.0-rc.1") == (2, 0, 0)
        assert _parse_version("1.2.3+build.456") == (1, 2, 3)

    def test_parse_short_version(self):
        assert _parse_version("1.0") == (1, 0, 0)
        assert _parse_version("2") == (2, 0, 0)

    def test_parse_empty_version(self):
        assert _parse_version("") == (0, 0, 0)
        assert _parse_version(None) == (0, 0, 0)

    def test_parse_invalid_version(self):
        assert _parse_version("invalid") == (0, 0, 0)
        assert _parse_version("a.b.c") == (0, 0, 0)


class TestVersionComparison:
    """Test version comparison logic."""

    def test_client_up_to_date(self):
        result = _compare_versions("1.0.0", "1.0.0", "1.0.0")
        assert result["is_compatible"] is True
        assert result["is_latest"] is True
        assert result["update_available"] is False
        assert result["force_update"] is False

    def test_client_needs_minor_update(self):
        result = _compare_versions("1.0.0", "1.0.0", "1.1.0")
        assert result["is_compatible"] is True
        assert result["is_latest"] is False
        assert result["update_available"] is True
        assert result["update_type"] == "minor"
        assert result["force_update"] is False

    def test_client_needs_major_update(self):
        result = _compare_versions("1.0.0", "1.0.0", "2.0.0")
        assert result["is_compatible"] is True
        assert result["is_latest"] is False
        assert result["update_available"] is True
        assert result["update_type"] == "major"
        assert result["force_update"] is False

    def test_client_needs_patch_update(self):
        result = _compare_versions("1.0.0", "1.0.0", "1.0.1")
        assert result["is_compatible"] is True
        assert result["is_latest"] is False
        assert result["update_available"] is True
        assert result["update_type"] == "patch"
        assert result["force_update"] is False

    def test_client_below_minimum_version(self):
        result = _compare_versions("0.9.0", "1.0.0", "1.1.0")
        assert result["is_compatible"] is False
        assert result["is_latest"] is False
        assert result["update_available"] is True
        assert result["force_update"] is True

    def test_client_ahead_of_server(self):
        # Edge case: client has a newer version than server
        result = _compare_versions("2.0.0", "1.0.0", "1.5.0")
        assert result["is_compatible"] is True
        assert result["is_latest"] is True
        assert result["update_available"] is False


class TestVersionCheckEndpoint:
    """Test the /api/version/check endpoint."""

    @pytest.mark.asyncio
    async def test_version_check_endpoint_basic(self, test_db):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/version/check?client_version=1.0.0")
            assert response.status_code == 200

            data = response.json()
            assert "is_compatible" in data
            assert "is_latest" in data
            assert "update_available" in data
            assert "client_version" in data
            assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_version_check_endpoint_missing_version(self, test_db):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/version/check")
            # Missing required parameter
            assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_version_check_endpoint_invalid_version(self, test_db):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/version/check?client_version=invalid!")
            # Invalid version format (doesn't match pattern)
            assert response.status_code == 422
