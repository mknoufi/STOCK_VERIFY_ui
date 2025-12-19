import logging
import os
from datetime import datetime, timedelta
from typing import Any, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Request

from backend.api.schemas import (
    ApiResponse,
    PinLogin,
    TokenResponse,
    UserLogin,
    UserRegister,
)
from backend.auth.dependencies import auth_deps, get_current_user
from backend.config import settings
from backend.db.runtime import get_db
from backend.error_messages import get_error_message
from backend.exceptions import (
    AuthenticationError,
    AuthorizationError,
    DatabaseConnectionError,
    NotFoundError,
    RateLimitError,
)
from backend.services.runtime import get_cache_service, get_refresh_token_service
from backend.utils.api_utils import result_to_response, sanitize_for_logging
from backend.utils.auth_utils import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from backend.utils.result import Fail, Ok, Result

logger = logging.getLogger(__name__)

router = APIRouter()

# Helper functions for login


async def check_rate_limit(ip_address: str) -> Result[bool, Exception]:
    """
    Check if the IP has exceeded the login attempt limit.

    Rate limiting is configurable via RATE_LIMIT_ENABLED environment variable.
    Default: Enabled in production, disabled in development.
    """
    cache_service = get_cache_service()
    # Check if rate limiting is enabled (default: True for production)
    rate_limit_enabled = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"

    if not rate_limit_enabled:
        logger.debug(f"Rate limiting disabled for IP: {ip_address}")
        return Ok(True)

    namespace = "login_attempts"
    key = ip_address

    # Get current attempt count
    attempts = (await cache_service.get(namespace, key)) or 0
    try:
        attempts = int(attempts)
    except (ValueError, TypeError):
        attempts = 0

    # Configuration: max attempts and TTL
    max_attempts = int(getattr(settings, "RATE_LIMIT_MAX_ATTEMPTS", 5))
    ttl_seconds = int(getattr(settings, "RATE_LIMIT_TTL_SECONDS", 300))

    if attempts >= max_attempts:
        # Block for configured TTL period
        await cache_service.set(namespace, key, attempts, ttl=ttl_seconds)
        logger.warning(f"Rate limit exceeded for IP {ip_address}: {attempts} attempts")
        return Fail(
            RateLimitError(
                f"Too many login attempts. Please try again in {ttl_seconds // 60} minutes.",
                retry_after=ttl_seconds,
            )
        )

    # Increment attempt counter with TTL
    await cache_service.set(namespace, key, attempts + 1, ttl=ttl_seconds)
    logger.debug(
        f"Rate limit check passed for IP {ip_address}: {attempts + 1}/{max_attempts} attempts"
    )
    return Ok(True)


async def find_user_by_username(username: str) -> Result[dict[str, Any], Exception]:
    """Find a user by username with error handling."""
    db = get_db()
    try:
        user = await db.users.find_one({"username": username})
        if not user:
            return Fail(NotFoundError("User not found"))
        return Ok(user)
    except Exception as e:
        logger.error(f"Error finding user {sanitize_for_logging(username)}: {str(e)}")
        return Fail(DatabaseConnectionError("Error accessing user data"))


async def generate_auth_tokens(
    user: dict[str, Any], ip_address: str, request: Request
) -> Result[dict[str, Any], Exception]:
    """Generate access and refresh tokens with error handling."""
    refresh_token_service = get_refresh_token_service()
    try:
        # Generate access token
        access_token_expires = timedelta(
            minutes=getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 15)
        )
        access_token = create_access_token(
            {"sub": user["username"], "role": user.get("role", "staff")},
            secret_key=auth_deps.secret_key,
            algorithm=auth_deps.algorithm,
        )

        # Generate refresh token using service
        refresh_payload = {"sub": user["username"], "role": user.get("role", "staff")}
        refresh_token = refresh_token_service.create_refresh_token(refresh_payload)
        refresh_token_expires = datetime.utcnow() + timedelta(
            days=getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 30)
        )

        # Store refresh token via service
        await refresh_token_service.store_refresh_token(
            refresh_token, user["username"], refresh_token_expires
        )

        return Ok(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": int(access_token_expires.total_seconds()),
            }
        )
    except Exception as e:
        logger.error(f"Error generating auth tokens: {str(e)}")
        return Fail(DatabaseConnectionError("Error generating authentication tokens"))


async def log_failed_login_attempt(
    username: str, ip_address: str, user_agent: Optional[str], error: str
) -> None:
    """Log a failed login attempt."""
    db = get_db()
    try:
        await db.login_attempts.insert_one(
            {
                "username": username,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "success": False,
                "timestamp": datetime.utcnow(),
                "error": error,
            }
        )
    except Exception as e:
        logger.error(f"Failed to log login attempt: {str(e)}")


async def log_successful_login(
    user: dict[str, Any], ip_address: str, request: Request
) -> None:
    """Log a successful login."""
    db = get_db()
    try:
        await db.login_attempts.insert_one(
            {
                "user_id": user["_id"],
                "username": user["username"],
                "ip_address": ip_address,
                "user_agent": request.headers.get("user-agent"),
                "success": True,
                "timestamp": datetime.utcnow(),
            }
        )

        # Update last login timestamp
        await db.users.update_one(
            {"_id": user["_id"]}, {"$set": {"last_login_at": datetime.utcnow()}}
        )
    except Exception as e:
        logger.error(f"Failed to log successful login: {str(e)}")


@router.post("/auth/register", response_model=TokenResponse, status_code=201)
async def register(user: UserRegister):
    """
    Register a new user.
    """
    db = get_db()
    refresh_token_service = get_refresh_token_service()
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"username": user.username})
        if existing_user:
            error = get_error_message(
                "AUTH_USERNAME_EXISTS", {"username": user.username}
            )
            raise HTTPException(
                status_code=error["status_code"],
                detail={
                    "message": error["message"],
                    "detail": error["detail"],
                    "code": error["code"],
                    "category": error["category"],
                },
            )

        # Create user
        hashed_password = get_password_hash(user.password)
        user_dict = {
            "username": user.username,
            "hashed_password": hashed_password,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": True,
            "permissions": [],
            "created_at": datetime.utcnow(),
        }

        insert_result = await auth_deps.db.users.insert_one(user_dict)

        user_doc = user_dict  # Renaming for consistency with original code's later use
        user_doc["_id"] = insert_result.inserted_id
        logger.info(
            f"User registered: {sanitize_for_logging(user.username)} ({sanitize_for_logging(user.role)})"
        )

        # Create access and refresh tokens
        logger.info(
            f"Generating tokens with secret key: {auth_deps.secret_key[:4]}...{auth_deps.secret_key[-4:]}"
        )
        access_token = create_access_token(
            data={"sub": user.username, "role": user.role},
            secret_key=auth_deps.secret_key,
            algorithm=auth_deps.algorithm,
        )
        refresh_token = refresh_token_service.create_refresh_token(
            {"sub": user.username, "role": user.role}
        )

        logger.info("Tokens generated successfully")

        # Store refresh token in database
        expires_at = datetime.utcnow() + timedelta(days=30)
        await refresh_token_service.store_refresh_token(
            refresh_token, user.username, expires_at
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 900,  # 15 minutes
            "user": {
                "id": str(user_doc["_id"]),
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "email": None,
                "is_active": True,
                "permissions": [],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        error = get_error_message(
            "UNKNOWN_ERROR", {"operation": "register", "error": str(e)}
        )
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=error["status_code"],
            detail={
                "message": error["message"],
                "detail": f"{error['detail']} Original error: {str(e)}",
                "code": error["code"],
                "category": error["category"],
            },
        )


async def _check_login_rate_limit(client_ip: str) -> Result[Any, Exception]:
    logger.debug(f"Checking rate limit for IP: {client_ip}")
    rate_limit_result = await check_rate_limit(client_ip)
    if rate_limit_result.is_err:
        # Extract error from Result type
        err = None
        if hasattr(rate_limit_result, "unwrap_err"):
            try:
                err = rate_limit_result.unwrap_err()
            except Exception as e:
                logger.error(f"Failed to unwrap rate limit error: {e}")
        if err is None:
            err = getattr(rate_limit_result, "err", None)
        if err is None:
            err = getattr(rate_limit_result, "_error", None)
        if err is None:
            err = RateLimitError("Rate limit exceeded")

        if isinstance(err, RateLimitError):
            return Fail(err)
        return Fail(RateLimitError(str(err)))
    logger.debug("Rate limit check passed")
    return None


def _validate_user_password(
    credentials: UserLogin, user: dict[str, Any]
) -> Result[bool, Exception]:
    hashed_pwd = user.get("hashed_password") or user.get("password")
    if not hashed_pwd:
        logger.error("No hashed_password or password field found!")
        return Fail(
            AuthenticationError("User account is corrupted. Please contact support.")
        )

    try:
        if verify_password(credentials.password, hashed_pwd):
            return Ok(True)
    except Exception as e:
        logger.error(f"Password verification exception: {e}")

    return Fail(AuthenticationError("Incorrect username or password"))


@router.post("/auth/login", response_model=ApiResponse[TokenResponse])
@result_to_response(success_status=200)
async def login(
    credentials: UserLogin, request: Request
) -> Result[dict[str, Any], Exception]:
    """
    User login endpoint with enhanced security and monitoring.

    Validates user credentials and returns an access token with refresh token.
    Implements rate limiting, IP tracking, and detailed logging.
    """
    db = get_db()
    cache_service = get_cache_service()

    logger.info("=== LOGIN ATTEMPT START ===")
    logger.info(f"Username: {sanitize_for_logging(credentials.username)}")

    client_ip = request.client.host if request.client else ""
    logger.info(f"Client IP: {client_ip}")

    try:
        # Check rate limiting
        rate_limit_fail = await _check_login_rate_limit(client_ip)
        if rate_limit_fail:
            return rate_limit_fail

        # Find user
        logger.info(f"Finding user: {credentials.username}")
        user_result = await find_user_by_username(credentials.username)
        if user_result.is_err:
            return await _handle_login_failure(
                credentials.username,
                client_ip,
                request,
                "User not found",
                "Incorrect username or password",
            )

        user = user_result.unwrap()
        logger.info("User found")

        # Verify password
        logger.info("Verifying password...")
        pwd_result = _validate_user_password(credentials, user)
        if pwd_result.is_err:
            return await _handle_login_failure(
                credentials.username,
                client_ip,
                request,
                "Invalid password",
                pwd_result._error,
            )

        # Handle legacy password migration (fire and forget)
        await _migrate_legacy_password(db, user, credentials.password)

        logger.info("Password verified successfully")

        # Check active status
        if not user.get("is_active", True):
            logger.error("User account is deactivated")
            return Fail(
                AuthorizationError("Account is deactivated. Please contact support.")
            )

        # Generate tokens
        logger.info("Generating tokens...")
        tokens_result = await generate_auth_tokens(user, client_ip, request)
        if tokens_result.is_err:
            logger.error(f"Token generation failed: {tokens_result}")
            return tokens_result

        tokens = tokens_result.unwrap()
        logger.info("Tokens generated successfully")

        # Log success and cleanup
        await log_successful_login(user, client_ip, request)
        await cache_service.delete("login_attempts", client_ip)

        logger.info("=== LOGIN SUCCESS ===")
        return Ok(_build_login_response(tokens, user))

    except Exception as e:
        logger.error("=== LOGIN EXCEPTION ===")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception message: {str(e)}")
        logger.error("Traceback:", exc_info=True)
        return Fail(e)


@router.post("/auth/login-pin", response_model=ApiResponse[TokenResponse])
@result_to_response(success_status=200)
async def login_with_pin(
    credentials: PinLogin, request: Request
) -> Result[dict[str, Any], Exception]:
    """
    Staff PIN login endpoint (4-digit numeric PIN).

    For staff users to quickly login with their PIN instead of username/password.
    PIN is stored as a hashed value in the user document.
    """
    db = get_db()
    cache_service = get_cache_service()
    pin = credentials.pin

    logger.info("=== PIN LOGIN ATTEMPT START ===")

    client_ip = request.client.host if request.client else ""

    # Validate PIN format (4-digit numeric)
    if not pin or len(pin) != 4 or not pin.isdigit():
        logger.warning(f"Invalid PIN format from IP: {client_ip}")
        return Fail(AuthenticationError("Invalid PIN format. PIN must be 4 digits."))

    try:
        # Check rate limiting
        rate_limit_fail = await _check_login_rate_limit(client_ip)
        if rate_limit_fail:
            return rate_limit_fail

        # Find user by PIN - we iterate through users with PIN and verify
        logger.info("Searching for user by PIN...")

        # We need to verify PIN against all users with PIN set
        # Since we hash PINs, we iterate and verify
        users_with_pin = await db.users.find({"pin_hash": {"$exists": True}}).to_list(
            length=100
        )

        found_user = None
        for user in users_with_pin:
            if verify_password(pin, user.get("pin_hash", "")):
                found_user = user
                break

        if not found_user:
            logger.warning(f"No user found with matching PIN from IP: {client_ip}")
            await log_failed_login_attempt(
                username="PIN_LOGIN",
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent"),
                error="Invalid PIN",
            )
            return Fail(AuthenticationError("Invalid PIN"))

        logger.info(f"PIN matched user: {found_user['username']}")

        # Check active status
        if not found_user.get("is_active", True):
            logger.error("User account is deactivated")
            return Fail(
                AuthorizationError("Account is deactivated. Please contact support.")
            )

        # Generate tokens
        logger.info("Generating tokens...")
        tokens_result = await generate_auth_tokens(found_user, client_ip, request)
        if tokens_result.is_err:
            logger.error(f"Token generation failed: {tokens_result}")
            return tokens_result

        tokens = tokens_result.unwrap()
        logger.info("Tokens generated successfully")

        # Log success and cleanup
        await log_successful_login(found_user, client_ip, request)
        await cache_service.delete("login_attempts", client_ip)

        logger.info("=== PIN LOGIN SUCCESS ===")
        return Ok(_build_login_response(tokens, found_user))

    except Exception as e:
        logger.error("=== PIN LOGIN EXCEPTION ===")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception message: {str(e)}")
        logger.error("Traceback:", exc_info=True)
        return Fail(e)


async def _handle_login_failure(
    username: str, client_ip: str, request: Request, log_error: str, return_error: Any
) -> Result[Any, Exception]:
    """Helper to log failure and return error result."""
    logger.error(log_error)
    await log_failed_login_attempt(
        username=username,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent"),
        error=log_error,
    )
    if isinstance(return_error, str):
        return Fail(AuthenticationError(return_error))
    return Fail(cast(Exception, return_error))


async def _migrate_legacy_password(
    db: Any, user: dict[str, Any], password: str
) -> None:
    """Helper to migrate legacy password field."""
    if "password" in user and "hashed_password" not in user:
        try:
            await db.users.update_one(
                {"_id": user["_id"]},
                {
                    "$set": {"hashed_password": get_password_hash(password)},
                    "$unset": {"password": ""},
                },
            )
        except Exception as e:
            logger.error(
                f"Failed to migrate legacy password for user {user.get('_id')}: {e}"
            )


def _build_login_response(
    tokens: dict[str, Any], user: dict[str, Any]
) -> dict[str, Any]:
    """Helper to build the login response dictionary."""
    return {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
        "expires_in": tokens["expires_in"],
        "refresh_token": tokens["refresh_token"],
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "full_name": user.get("full_name", ""),
            "role": user.get("role", "staff"),
            "email": user.get("email"),
            "is_active": user.get("is_active", True),
            "permissions": user.get("permissions", []),
        },
    }


@router.get("/auth/me")
async def get_me(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return {
        "username": current_user["username"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "permissions": current_user.get("permissions", []),
    }
