"""
Tests for PIN Authentication API
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from backend.api.pin_auth_api import (
    PinChangeRequest,
    PinLoginRequest,
    change_pin,
    login_with_pin,
)
from fastapi import HTTPException
from pydantic import ValidationError


@pytest.mark.asyncio
async def test_change_pin_success():
    mock_db = AsyncMock()
    mock_user = {
        "_id": "user123",
        "username": "testuser",
        "hashed_password": "hashed_password",
    }
    request = PinChangeRequest(current_password="password", new_pin="123456")

    with (
        patch("backend.api.pin_auth_api.PINAuthService") as MockService,
        patch("backend.api.pin_auth_api.verify_password", return_value=True),
    ):
        mock_instance = MockService.return_value
        mock_instance.set_pin = AsyncMock(return_value=True)

        response = await change_pin(request, mock_user, mock_db)

        assert response == {"message": "PIN updated successfully"}
        mock_instance.set_pin.assert_called_once_with("user123", "123456")


@pytest.mark.asyncio
async def test_login_with_pin_success():
    mock_db = AsyncMock()
    mock_request = MagicMock()
    mock_request.client.host = "127.0.0.1"
    mock_user = {"_id": "user123", "username": "testuser", "role": "staff"}
    request = PinLoginRequest(username="testuser", pin="123456")

    mock_result = MagicMock()
    mock_result.is_err = False
    mock_result.unwrap.return_value = mock_user

    mock_tokens_result = MagicMock()
    mock_tokens_result.is_err = False
    mock_tokens_result.unwrap.return_value = {
        "access_token": "token",
        "refresh_token": "refresh",
    }

    with (
        patch("backend.api.pin_auth_api.PINAuthService") as MockService,
        patch(
            "backend.api.pin_auth_api.find_user_by_username", return_value=mock_result
        ),
        patch("backend.api.pin_auth_api.check_rate_limit") as mock_rate,
        patch(
            "backend.api.pin_auth_api.generate_auth_tokens",
            return_value=mock_tokens_result,
        ),
    ):
        mock_rate_result = MagicMock()
        mock_rate_result.is_err = False
        mock_rate.return_value = mock_rate_result

        mock_instance = MockService.return_value
        mock_instance.verify_pin = AsyncMock(return_value=True)

        response = await login_with_pin(request, mock_request, mock_db)

        assert response["access_token"] == "token"
        assert response["user"]["username"] == "testuser"
        mock_instance.verify_pin.assert_called_once_with("user123", "123456")


@pytest.mark.asyncio
async def test_login_with_pin_invalid_user():
    mock_db = AsyncMock()
    mock_request = MagicMock()
    mock_request.client.host = "127.0.0.1"

    mock_result = MagicMock()
    mock_result.is_err = True

    request = PinLoginRequest(username="unknown", pin="123456")

    with (
        patch("backend.api.pin_auth_api.check_rate_limit") as mock_rate,
        patch(
            "backend.api.pin_auth_api.find_user_by_username", return_value=mock_result
        ),
    ):
        mock_rate_result = MagicMock()
        mock_rate_result.is_err = False
        mock_rate.return_value = mock_rate_result

        with pytest.raises(HTTPException) as exc:
            await login_with_pin(request, mock_request, mock_db)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_with_pin_invalid_pin():
    mock_db = AsyncMock()
    mock_request = MagicMock()
    mock_request.client.host = "127.0.0.1"
    mock_user = {"_id": "user123", "username": "testuser"}
    request = PinLoginRequest(username="testuser", pin="wrong")

    mock_result = MagicMock()
    mock_result.is_err = False
    mock_result.unwrap.return_value = mock_user

    with (
        patch("backend.api.pin_auth_api.PINAuthService") as MockService,
        patch(
            "backend.api.pin_auth_api.find_user_by_username", return_value=mock_result
        ),
        patch("backend.api.pin_auth_api.check_rate_limit") as mock_rate,
    ):
        mock_rate_result = MagicMock()
        mock_rate_result.is_err = False
        mock_rate.return_value = mock_rate_result

        mock_instance = MockService.return_value
        mock_instance.verify_pin = AsyncMock(return_value=False)

        with pytest.raises(HTTPException) as exc:
            await login_with_pin(request, mock_request, mock_db)

        assert exc.value.status_code == 401
        assert exc.value.detail == "Invalid PIN"
        mock_rate_result.is_err = False
        mock_rate.return_value = mock_rate_result

        mock_instance = MockService.return_value
        mock_instance.verify_pin = AsyncMock(return_value=False)

        with pytest.raises(HTTPException) as exc:
            await login_with_pin(request, mock_db)

        assert exc.value.status_code == 401
        assert exc.value.detail == "Invalid PIN"


@pytest.mark.asyncio
async def test_change_pin_service_failure():
    mock_db = AsyncMock()
    mock_user = {
        "_id": "user123",
        "username": "testuser",
        "hashed_password": "hashed_password",
    }
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
