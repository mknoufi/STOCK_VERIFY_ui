"""
Tests for PIN Authentication API
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend.api.pin_auth_api import (
    PinChangeRequest,
    PinLoginRequest,
    change_pin,
    login_with_pin,
)
from backend.utils.result import Fail as Err
from backend.utils.result import Ok


@pytest.mark.asyncio
async def test_change_pin_success():
    mock_db = AsyncMock()
    valid_id = "507f1f77bcf86cd799439011"
    mock_user = {
        "_id": valid_id,
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
        mock_instance.set_pin.assert_called_once_with(valid_id, "123456")


@pytest.mark.asyncio
async def test_login_with_pin_success():
    mock_db = AsyncMock()
    valid_id = "507f1f77bcf86cd799439011"
    mock_user = {
        "_id": valid_id,
        "username": "testuser",
        "role": "staff",
        "is_active": True,
    }
    request = PinLoginRequest(username="testuser", pin="123456")

    with (
        patch("backend.api.pin_auth_api.PINAuthService") as MockService,
        patch(
            "backend.api.pin_auth_api.find_user_by_username",
            new_callable=AsyncMock,
            return_value=Ok(mock_user),
        ),
        patch(
            "backend.api.pin_auth_api.check_rate_limit",
            new_callable=AsyncMock,
            return_value=Ok(True),
        ),
        patch(
            "backend.api.pin_auth_api.generate_auth_tokens",
            new_callable=AsyncMock,
            return_value=Ok({"access_token": "token"}),
        ),
    ):
        mock_instance = MockService.return_value
        mock_instance.verify_pin = AsyncMock(return_value=True)

        response = await login_with_pin(request, Mock(), mock_db)

        assert response["access_token"] == "token"
        mock_instance.verify_pin.assert_called_once_with(valid_id, "123456")


@pytest.mark.asyncio
async def test_login_with_pin_invalid_user():
    mock_db = AsyncMock()
    request = PinLoginRequest(username="unknown", pin="123456")

    with (
        patch(
            "backend.api.pin_auth_api.find_user_by_username",
            new_callable=AsyncMock,
            return_value=Err(Exception("Not found")),
        ),
        patch(
            "backend.api.pin_auth_api.check_rate_limit",
            new_callable=AsyncMock,
            return_value=Ok(True),
        ),
    ):
        with pytest.raises(HTTPException) as exc:
            await login_with_pin(request, Mock(), mock_db)

    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_with_pin_invalid_pin():
    mock_db = AsyncMock()
    valid_id = "507f1f77bcf86cd799439011"
    mock_user = {"_id": valid_id, "username": "testuser", "is_active": True}
    request = PinLoginRequest(username="testuser", pin="wrong")

    with (
        patch("backend.api.pin_auth_api.PINAuthService") as MockService,
        patch(
            "backend.api.pin_auth_api.find_user_by_username",
            new_callable=AsyncMock,
            return_value=Ok(mock_user),
        ),
        patch(
            "backend.api.pin_auth_api.check_rate_limit",
            new_callable=AsyncMock,
            return_value=Ok(True),
        ),
    ):
        mock_instance = MockService.return_value
        mock_instance.verify_pin = AsyncMock(return_value=False)

        with pytest.raises(HTTPException) as exc:
            await login_with_pin(request, Mock(), mock_db)

        assert exc.value.status_code == 401
        assert exc.value.detail == "Invalid PIN"


@pytest.mark.asyncio
async def test_change_pin_service_failure():
    mock_db = AsyncMock()
    valid_id = "507f1f77bcf86cd799439011"
    mock_user = {
        "_id": valid_id,
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
