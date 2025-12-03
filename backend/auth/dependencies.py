"""
Authentication Dependencies
Shared dependencies for authentication across all routers
"""

import logging
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from .jwt_provider import jwt

logger = logging.getLogger(__name__)


class AuthDependencies:
    """Thread-safe authentication dependencies container"""

    def __init__(self):
        logger.error("DEBUG: AuthDependencies.__init__ called")
        self._db: Optional[AsyncIOMotorDatabase] = None
        self._secret_key: Optional[str] = None
        self._algorithm: Optional[str] = None
        # auto_error=True to force 403 if missing (for debugging)
        self._security = HTTPBearer(auto_error=True)
        self._initialized = False

    def initialize(self, db: AsyncIOMotorDatabase, secret_key: str, algorithm: str):
        """Initialize auth dependencies (call once at startup)"""
        logger.error(
            f"DEBUG: AuthDependencies.initialize called with secret_key={secret_key[:5]}..."
        )
        if self._initialized:
            # In non-dev environments, raise error on double initialization
            import os

            environment = os.getenv("ENVIRONMENT", "development").lower()
            testing = os.getenv("TESTING", "false").lower() == "true"

            if environment in ("production", "staging") and not testing:
                raise RuntimeError(
                    "AuthDependencies already initialized. Double initialization detected - "
                    "this may indicate a configuration error."
                )

            # In development or testing, allow re-initialization (update references)
            logger.info("AuthDependencies re-initializing (updating db/keys)")
            self._db = db
            self._secret_key = secret_key
            self._algorithm = algorithm
            return

        self._db = db
        self._secret_key = secret_key
        self._algorithm = algorithm
        self._initialized = True
        logger.info("✓ AuthDependencies initialized successfully")

    @property
    def db(self) -> AsyncIOMotorDatabase:
        """Get database connection"""
        if not self._initialized or self._db is None:
            raise HTTPException(status_code=500, detail="Authentication not initialized")
        return self._db

    @property
    def secret_key(self) -> str:
        """Get JWT secret key"""
        if not self._initialized or not self._secret_key:
            raise HTTPException(status_code=500, detail="Authentication not initialized")
        return self._secret_key

    @property
    def algorithm(self) -> str:
        """Get JWT algorithm"""
        if not self._initialized or not self._algorithm:
            raise HTTPException(status_code=500, detail="Authentication not initialized")
        return self._algorithm

    @property
    def security(self) -> HTTPBearer:
        """Get HTTPBearer security scheme"""
        return self._security


# Singleton instance
auth_deps = AuthDependencies()


def init_auth_dependencies(db: AsyncIOMotorDatabase, secret_key: str, algorithm: str):
    """Initialize auth dependencies with database and JWT settings (backward compatibility)"""
    auth_deps.initialize(db, secret_key, algorithm)


class JWTValidator:
    """Handles JWT token validation and decoding"""

    @staticmethod
    def extract_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]) -> str:
        """Extract JWT token from request credentials or headers"""
        if credentials:
            return credentials.credentials

        # Fallback to manual header extraction
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            from backend.error_messages import get_error_message
            error = get_error_message("AUTH_TOKEN_INVALID")
            raise HTTPException(
                status_code=401,
                detail={
                    "message": error["message"],
                    "detail": "Authentication credentials were not provided",
                    "code": error["code"],
                    "category": error["category"],
                },
            )
        return auth_header.split(" ")[1]

    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, auth_deps.secret_key, algorithms=[auth_deps.algorithm])
            username = payload.get("sub")
            if username is None:
                from backend.error_messages import get_error_message
                error = get_error_message("AUTH_TOKEN_INVALID")
                raise HTTPException(
                    status_code=error["status_code"],
                    detail=error,
                )
            return payload
        except jwt.ExpiredSignatureError:
            from backend.error_messages import get_error_message
            error = get_error_message("AUTH_TOKEN_EXPIRED")
            raise HTTPException(
                status_code=error["status_code"],
                detail=error,
            )
        except jwt.InvalidTokenError:
            from backend.error_messages import get_error_message
            error = get_error_message("AUTH_TOKEN_INVALID")
            raise HTTPException(
                status_code=error["status_code"],
                detail=error,
            )


class UserRepository:
    """Handles user database operations"""

    @staticmethod
    async def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
        """Retrieve user from database by username"""
        return await auth_deps.db.users.find_one({"username": username})


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_deps.security),
) -> Dict[str, Any]:
    """
    Get current authenticated user from JWT token
    Can be used in any router without circular import
    """
    try:
        # Extract and validate token
        token = JWTValidator.extract_token(request, credentials)
        payload = JWTValidator.decode_token(token)

        # Retrieve user from database
        username = payload["sub"]
        user = await UserRepository.get_user_by_username(username)

        if user is None:
            from backend.error_messages import get_error_message
            error = get_error_message("AUTH_USER_NOT_FOUND", {"username": username})
            raise HTTPException(
                status_code=error["status_code"],
                detail=error,
            )

        return user

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any unexpected errors and convert to auth error
        logger.error(f"Unexpected error in get_current_user: {e}")
        from backend.error_messages import get_error_message
        error = get_error_message("AUTH_TOKEN_INVALID")
        raise HTTPException(
            status_code=error["status_code"],
            detail=error,
        )


# Alias for backward compatibility - both names point to same function
get_current_user_async = get_current_user


def require_permissions(required_permissions: list[str]):
    """
    Dependency factory to require specific permissions
    Usage: dependencies=[Depends(require_permissions(["manage_reports"]))]
    """

    async def permission_checker(
        current_user: dict = Depends(get_current_user),
    ) -> dict:
        """Check if user has required permissions"""
        from backend.error_messages import get_error_message

        user_role = current_user.get("role", "")
        user_permissions = current_user.get("permissions", [])

        # Admin has all permissions
        if user_role == "admin":
            return current_user

        # Check if user has all required permissions
        missing_permissions = [p for p in required_permissions if p not in user_permissions]

        if missing_permissions:
            error = get_error_message("AUTH_INSUFFICIENT_PERMISSIONS")
            raise HTTPException(
                status_code=403,
                detail={
                    "message": error.get("message", "Insufficient permissions"),
                    "detail": f"Missing permissions: {', '.join(missing_permissions)}",
                    "code": error.get("code", "INSUFFICIENT_PERMISSIONS"),
                    "category": error.get("category", "authorization"),
                    "required_permissions": required_permissions,
                    "missing_permissions": missing_permissions,
                },
            )

        return current_user

    return permission_checker
