"""
Auth API Endpoints (PIN Extensions)
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from backend.api.auth import (
    check_rate_limit,
    find_user_by_username,
    generate_auth_tokens,
    reset_rate_limit,
)
from backend.auth.dependencies import get_current_user
from backend.db.runtime import get_db
from backend.services.pin_auth_service import PINAuthService
from backend.utils.auth_utils import verify_password

router = APIRouter()


class PinChangeRequest(BaseModel):
    current_password: str
    new_pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d+$")


class PinLoginRequest(BaseModel):
    username: str
    pin: str


@router.post("/auth/pin/change")
async def change_pin(
    request: PinChangeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Change the current user's PIN."""
    pin_service = PINAuthService(db)

    # Verify current password before allowing PIN change
    hashed_password = current_user.get("hashed_password")
    if not hashed_password or not verify_password(
        request.current_password, hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    success = await pin_service.set_pin(str(current_user["_id"]), request.new_pin)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set PIN",
        )

    return {"message": "PIN updated successfully"}


@router.post("/auth/login/pin")
async def login_with_pin(
    request: PinLoginRequest,
    http_request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Login with PIN."""
    # Rate limit login attempts by IP
    ip_address = (
        http_request.client.host if http_request and http_request.client else "unknown"
    )
    rate_result = await check_rate_limit(ip_address)
    if rate_result.is_err:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(rate_result._error),
        )

    # Find user and validate status
    user_result = await find_user_by_username(request.username)
    if user_result.is_err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    user = user_result.unwrap()
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    pin_service = PINAuthService(db)
    is_valid = await pin_service.verify_pin(str(user["_id"]), request.pin)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN",
        )

    # Generate JWT + refresh tokens using existing auth flow
    token_result = await generate_auth_tokens(user, ip_address, http_request)
    if token_result.is_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate tokens",
        )
    tokens = token_result.unwrap()

    # Reset rate limit for successful PIN login
    try:
        await reset_rate_limit(ip_address)
    except Exception:
        pass

    return {
        **tokens,
        "token_type": "bearer",
        "user": {
            "username": user.get("username"),
            "role": user.get("role"),
            "full_name": user.get("full_name"),
            "is_active": user.get("is_active", True),
        },
    }
