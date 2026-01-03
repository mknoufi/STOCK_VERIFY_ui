"""
Tests for PIN Authentication API
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend.api.pin_auth_api import PinChangeRequest, PinLoginRequest, change_pin, login_with_pin


class OkResult:
    def __init__(self, value):
        self.is_err = False
        self._value = value

    def unwrap(self):
        return self._value


class ErrResult:
    def __init__(self, error):
        self.is_err = True
        self._error = error

    def unwrap(self):
        raise RuntimeError("Tried to unwrap an error result")


@pytest.mark.asyncio
async def test_change_pin_success():
    mock_db = AsyncMock()
    mock_user = {"_id": "user123", "username": "testuser", "hashed_password": "hash"}
    request = PinChangeRequest(current_password="password", new_pin="123456")

    with (
        patch("backend.api.pin_auth_api.PINAuthService") as MockService,
        patch("backend.api.pin_auth_api.verify_password", return_value=True),
    ):
        mock_instance = MockService.return_value
        mock_instance.set_pin = AsyncMock(return_value=True)

        response = await change_pin(request, mock_user, mock_db)

        assert response == {"message": "PIN changed successfully"}
        mock_instance.set_pin.assert_called_once_with("user123", "123456")


@pytest.mark.asyncio
async def test_login_with_pin_success():
    mock_db = AsyncMock()
    mock_user = {
        "_id": "user123",
        "username": "testuser",
        "role": "staff",
        "full_name": "Test User",
        "is_active": True,
    }
    request = PinLoginRequest(username="testuser", pin="123456")
    mock_http_request = MagicMock()
    mock_http_request.client.host = "127.0.0.1"

    with (
        patch("backend.api.pin_auth_api.PINAuthService") as MockService,
        patch(
            "backend.api.pin_auth_api.check_rate_limit", new=AsyncMock(return_value=OkResult(True))
        ),
        patch(
            "backend.api.pin_auth_api.find_user_by_username",
            new=AsyncMock(return_value=OkResult(mock_user)),
        ),
        patch(
            "backend.api.pin_auth_api.generate_auth_tokens",
            new=AsyncMock(
                return_value=OkResult({"access_token": "access", "refresh_token": "refresh"})
            ),
        ),
        patch("backend.api.pin_auth_api.reset_rate_limit", new=AsyncMock(return_value=None)),
    ):
        mock_instance = MockService.return_value
        mock_instance.verify_pin = AsyncMock(return_value=True)

        response = await login_with_pin(request, mock_http_request, mock_db)

        assert response["access_token"] == "access"
        assert response["refresh_token"] == "refresh"
        assert response["token_type"] == "bearer"
        assert response["user"]["username"] == "testuser"
        assert response["user"]["role"] == "staff"
        mock_instance.verify_pin.assert_called_once_with("user123", "123456")


@pytest.mark.asyncio
async def test_login_with_pin_invalid_user():
    mock_db = AsyncMock()
    request = PinLoginRequest(username="unknown", pin="123456")
    mock_http_request = MagicMock()
    mock_http_request.client.host = "127.0.0.1"

    with (
        patch(
            "backend.api.pin_auth_api.check_rate_limit", new=AsyncMock(return_value=OkResult(True))
        ),
        patch(
            "backend.api.pin_auth_api.find_user_by_username",
            new=AsyncMock(return_value=ErrResult("not found")),
        ),
    ):
        with pytest.raises(HTTPException) as exc:
            await login_with_pin(request, mock_http_request, mock_db)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_with_pin_invalid_pin():
    mock_db = AsyncMock()
    mock_user = {"_id": "user123", "username": "testuser", "role": "staff", "is_active": True}
    request = PinLoginRequest(username="testuser", pin="wrong")
    mock_http_request = MagicMock()
    mock_http_request.client.host = "127.0.0.1"

    with (
        patch("backend.api.pin_auth_api.PINAuthService") as MockService,
        patch(
            "backend.api.pin_auth_api.check_rate_limit", new=AsyncMock(return_value=OkResult(True))
        ),
        patch(
            "backend.api.pin_auth_api.find_user_by_username",
            new=AsyncMock(return_value=OkResult(mock_user)),
        ),
    ):
        mock_instance = MockService.return_value
        mock_instance.verify_pin = AsyncMock(return_value=False)

        with pytest.raises(HTTPException) as exc:
            await login_with_pin(request, mock_http_request, mock_db)

        assert exc.value.status_code == 401
        assert exc.value.detail == "Invalid PIN"


@pytest.mark.asyncio
async def test_change_pin_service_failure():
    mock_db = AsyncMock()
    mock_user = {"_id": "user123", "username": "testuser", "hashed_password": "hash"}
    request = PinChangeRequest(current_password="password", new_pin="123456")

    with (
        patch("backend.api.pin_auth_api.PINAuthService") as MockService,
        patch("backend.api.pin_auth_api.verify_password", return_value=True),
    ):
        mock_instance = MockService.return_value
        mock_instance.set_pin = AsyncMock(return_value=False)

        with pytest.raises(HTTPException) as exc:
            await change_pin(request, mock_user, mock_db)

        assert exc.value.status_code == 500
        assert exc.value.detail == "Failed to set PIN"


def test_pin_change_request_validation():
    # Valid PIN
    request = PinChangeRequest(current_password="password", new_pin="1234")
    assert request.new_pin == "1234"

    # Too short
    with pytest.raises(ValidationError):
        PinChangeRequest(current_password="password", new_pin="123")

    # Too long
    with pytest.raises(ValidationError):
        PinChangeRequest(current_password="password", new_pin="1234567")

    # Non-numeric
    with pytest.raises(ValidationError):
        PinChangeRequest(current_password="password", new_pin="abcd")
