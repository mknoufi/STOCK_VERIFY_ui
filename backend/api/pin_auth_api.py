"""
Auth API Endpoints (PIN Extensions)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from backend.auth.dependencies import get_current_user
from backend.services.pin_auth_service import PINAuthService
from backend.core.database import get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

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

    # Verify password first (implementation depends on existing auth service)
    # For now, we assume the user is authenticated via JWT

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
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Login with PIN."""
    # This requires finding the user by username first to get user_id
    user = await db.users.find_one({"username": request.username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    pin_service = PINAuthService(db)
    is_valid = await pin_service.verify_pin(str(user["_id"]), request.pin)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN",
        )

    # Generate JWT token (reuse existing logic)
    # from backend.auth.jwt_provider import create_access_token
    # access_token = create_access_token(data={"sub": str(user["_id"]), "role": user["role"]})
    # return {"access_token": access_token, "token_type": "bearer"}

    return {"message": "PIN verified"}  # Placeholder until JWT integration
