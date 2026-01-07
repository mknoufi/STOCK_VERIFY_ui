"""
Refresh Token Service
Implements JWT refresh tokens with automatic rotation for enhanced security
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.auth.jwt_provider import jwt

logger = logging.getLogger(__name__)


class RefreshTokenService:
    """Service for managing refresh tokens"""

    def __init__(self, db: AsyncIOMotorDatabase, secret_key: str, algorithm: str = "HS256"):
        self.db = db
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.refresh_token_expiry = timedelta(days=30)  # 30 days
        self.access_token_expiry = timedelta(minutes=15)  # 15 minutes

    def create_access_token(self, data: dict[str, Any]) -> str:
        """Create a short-lived access token"""
        expire = datetime.utcnow() + self.access_token_expiry
        to_encode = data.copy()
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, data: dict[str, Any]) -> str:
        """Create a long-lived refresh token"""
        expire = datetime.utcnow() + self.refresh_token_expiry
        to_encode = data.copy()
        to_encode.update({"exp": expire, "type": "refresh"})
        token = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

        return token

    async def store_refresh_token(self, token: str, username: str, expires_at: datetime):
        """Store refresh token in database (public method)"""
        await self._store_refresh_token(token, username, expires_at)

    async def _store_refresh_token(self, token: str, username: str, expires_at: datetime):
        """Store refresh token in database"""
        try:
            await self.db.refresh_tokens.insert_one(
                {
                    "token": token,
                    "username": username,
                    "created_at": datetime.utcnow(),
                    "expires_at": expires_at,
                    "revoked": False,
                }
            )

            # Clean up old tokens
            await self._cleanup_expired_tokens()
        except Exception as e:
            logger.error(f"Error storing refresh token: {str(e)}")

    async def _cleanup_expired_tokens(self):
        """Remove expired and revoked tokens"""
        try:
            result = await self.db.refresh_tokens.delete_many(
                {"$or": [{"expires_at": {"$lt": datetime.utcnow()}}, {"revoked": True}]}
            )
            if result.deleted_count > 0:
                logger.info(f"Cleaned up {result.deleted_count} expired/revoked tokens")
        except Exception as e:
            logger.error(f"Error cleaning up tokens: {str(e)}")

    async def verify_refresh_token(self, token: str) -> Optional[dict[str, Optional[Any]]]:
        """Verify and return refresh token payload"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            if payload.get("type") != "refresh":
                logger.warning("Token is not a refresh token")
                return None

            # Check if token is revoked
            stored_token = await self.db.refresh_tokens.find_one(
                {
                    "token": token,
                    "revoked": False,
                    "expires_at": {"$gt": datetime.utcnow()},
                }
            )

            if not stored_token:
                logger.warning("Refresh token not found or revoked")
                return None

            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Refresh token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid refresh token: {str(e)}")
            return None

    async def revoke_token(self, token: str) -> bool:
        """Revoke a refresh token"""
        try:
            result = await self.db.refresh_tokens.update_one(
                {"token": token},
                {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}},
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error revoking token: {str(e)}")
            return False

    async def revoke_all_user_tokens(self, username: str) -> int:
        """Revoke all refresh tokens for a user"""
        try:
            result = await self.db.refresh_tokens.update_many(
                {"username": username, "revoked": False},
                {"$set": {"revoked": True, "revoked_at": datetime.utcnow()}},
            )
            return result.modified_count
        except Exception as e:
            logger.error(f"Error revoking user tokens: {str(e)}")
            return 0

    async def refresh_access_token(self, refresh_token: str) -> Optional[dict[str, Optional[Any]]]:
        """Generate new access token from refresh token"""
        payload = await self.verify_refresh_token(refresh_token)

        if not payload:
            return None

        username = payload.get("sub")
        role = payload.get("role")

        # Fetch user profile to include in response; keep failures non-fatal
        user_profile: Optional[dict[str, Optional[Any]]] = None
        if username:
            try:
                user_profile = await self.db.users.find_one({"username": username})
            except Exception as fetch_error:
                logger.warning(
                    f"Failed to fetch user profile for refresh response: {str(fetch_error)}"
                )

        # Rotate refresh token (issue new one, revoke old one)
        new_refresh_token = self.create_refresh_token({"sub": username, "role": role})

        # Revoke old token
        await self.revoke_token(refresh_token)

        # Create new access token
        access_token = self.create_access_token({"sub": username, "role": role})

        expires_in_seconds = int(self.access_token_expiry.total_seconds())

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": expires_in_seconds,
            "user": {
                "username": str(username) if username else "",
                "full_name": (str(user_profile.get("full_name", "")) if user_profile else ""),
                "role": str(role) if role else "",
            },
        }
