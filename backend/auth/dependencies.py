"""
Authentication Dependencies
Shared dependencies for authentication across all routers
"""

import logging
from typing import Any, Dict, Optional, cast

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


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_deps.security),
) -> Dict[str, Any]:
    """
    Get current authenticated user from JWT token
    Can be used in any router without circular import
    """
    logger.error("DEBUG: get_current_user START")
    # Import at function level but verify it's available at startup
    try:
        from backend.error_messages import get_error_message
    except ImportError:
        # Fallback for circular imports
        def get_error_message(error_key: str, context: dict = None) -> dict:
            return {
                "status_code": 401,
                "message": "Auth error",
                "detail": str(error_key),
                "code": error_key,
                "category": "AUTH",
            }

    try:
        # If credentials provided by HTTPBearer, use them
        if credentials:
            token = credentials.credentials
        else:
            # Fallback to manual header extraction (just in case)
            auth_header = request.headers.get("Authorization")
            logger.error(f"DEBUG: get_current_user auth_header: {auth_header}")
            if not auth_header or not auth_header.startswith("Bearer "):
                logger.error("get_current_user: No credentials provided or invalid format")
                logger.error("DEBUG: get_current_user: No credentials provided or invalid format")
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
            token = auth_header.split(" ")[1]
        logger.error(f"DEBUG: get_current_user token: {token}")
        logger.error(f"DEBUG: get_current_user secret_key: {auth_deps.secret_key}")
        logger.error(f"DEBUG: get_current_user algorithm: {auth_deps.algorithm}")
        payload = jwt.decode(token, auth_deps.secret_key, algorithms=[auth_deps.algorithm])
        logger.error(f"DEBUG: get_current_user payload: {payload}")

        username = payload.get("sub")
        if username is None:
            logger.error("DEBUG: get_current_user: username is None in payload")
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
            logger.error(
                f"DEBUG: get_current_user: User {username} not found in db {id(auth_deps.db)}"
            )
            print(f"DEBUG: get_current_user: User {username} not found in db")
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

        return cast(Dict[str, Any], user)

    except jwt.ExpiredSignatureError:
        logger.error("DEBUG: get_current_user: Token expired")
        print("DEBUG: get_current_user: Token expired")
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
    except jwt.InvalidTokenError as e:
        logger.error(f"DEBUG: get_current_user: Invalid token: {e}")
        print(f"DEBUG: get_current_user: Invalid token: {e}")
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
