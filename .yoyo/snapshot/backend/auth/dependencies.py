"""
Authentication Dependencies
Shared dependencies for authentication across all routers
"""

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .jwt_provider import jwt
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class AuthDependencies:
    """Thread-safe authentication dependencies container"""

    def __init__(self):
        self._db: Optional[AsyncIOMotorDatabase] = None
        self._secret_key: Optional[str] = None
        self._algorithm: Optional[str] = None
        # auto_error=False lets us return a 401 instead of FastAPI's default 403
        self._security = HTTPBearer(auto_error=False)
        self._initialized = False

    def initialize(self, db: AsyncIOMotorDatabase, secret_key: str, algorithm: str):
        """Initialize auth dependencies (call once at startup)"""
        if self._initialized:
            # In non-dev environments, raise error on double initialization
            import os
            environment = os.getenv("ENVIRONMENT", "development").lower()
            if environment in ("production", "staging"):
                raise RuntimeError(
                    "AuthDependencies already initialized. Double initialization detected - "
                    "this may indicate a configuration error."
                )
            logger.warning("AuthDependencies already initialized, skipping re-initialization")
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


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(auth_deps.security),
) -> Dict[str, Any]:
    """
    Get current authenticated user from JWT token
    Can be used in any router without circular import
    """
    # Import at function level but verify it's available at startup
    try:
        from error_messages import get_error_message
    except ImportError as e:
        logger.error(f"Failed to import error_messages: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal error: Error message module not available"
        )

    try:
        if credentials is None:
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

        token = credentials.credentials
        payload = jwt.decode(token, auth_deps.secret_key, algorithms=[auth_deps.algorithm])

        # No type validation needed - we only issue access tokens through login endpoint
        # (Refresh tokens are UUIDs, not JWTs, so they won't decode successfully)

        username = payload.get("sub")
        if username is None:
            error = get_error_message("AUTH_TOKEN_INVALID")
            raise HTTPException(
                status_code=error["status_code"],
                detail={
                    "message": error["message"],
                    "detail": error["detail"],
                    "code": error["code"],
                    "category": error["category"],
                },
            )

        user = await auth_deps.db.users.find_one({"username": username})
        if user is None:
            error = get_error_message("AUTH_USER_NOT_FOUND", {"username": username})
            raise HTTPException(
                status_code=error["status_code"],
                detail={
                    "message": error["message"],
                    "detail": error["detail"],
                    "code": error["code"],
                    "category": error["category"],
                },
            )

        return user

    except jwt.ExpiredSignatureError:
        error = get_error_message("AUTH_TOKEN_EXPIRED")
        raise HTTPException(
            status_code=error["status_code"],
            detail={
                "message": error["message"],
                "detail": error["detail"],
                "code": error["code"],
                "category": error["category"],
            },
        )
    except jwt.InvalidTokenError:
        error = get_error_message("AUTH_TOKEN_INVALID")
        raise HTTPException(
            status_code=error["status_code"],
            detail={
                "message": error["message"],
                "detail": error["detail"],
                "code": error["code"],
                "category": error["category"],
            },
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
        from error_messages import get_error_message

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
