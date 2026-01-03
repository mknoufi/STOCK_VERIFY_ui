import logging
import os
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional, TypeVar, cast

import jwt
import uvicorn
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
# from motor.motor_asyncio import AsyncIOMotorClient
# from passlib.context import CryptContext
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request

from backend.api import auth, supervisor_pin
from backend.api.admin_control_api import admin_control_router
from backend.api.admin_dashboard_api import admin_dashboard_router
from backend.api.auth import router as auth_router
from backend.api.count_lines_api import router as count_lines_router
from backend.api.dynamic_fields_api import dynamic_fields_router
from backend.api.dynamic_reports_api import dynamic_reports_router
from backend.api.enhanced_item_api import enhanced_item_router as items_router
from backend.api.erp_api import router as erp_router
from backend.api.exports_api import exports_router
from backend.api.health import health_router, info_router
from backend.api.item_verification_api import verification_router
from backend.api.locations_api import router as locations_router
from backend.api.logs_api import router as logs_router
from backend.api.mapping_api import router as mapping_router
from backend.api.master_settings_api import master_settings_router
from backend.api.metrics_api import metrics_router
from backend.core.lifespan import (
    lifespan,
    db,
    # client,
    cache_service,
    refresh_token_service,
    activity_log_service,
)

# New feature API routers
from backend.api.permissions_api import permissions_router
from backend.api.preferences_api import router as preferences_router
from backend.api.rack_api import router as rack_router
from backend.api.realtime_dashboard_api import realtime_dashboard_router
from backend.api.report_generation_api import report_generation_router
from backend.api.reporting_api import router as reporting_router
from backend.api.user_management_api import user_management_router
from backend.api.schemas import (
    ApiResponse,
    CountLineCreate,
    Session,
    SessionCreate,
    TokenResponse,
)
from backend.api.search_api import router as search_router
from backend.api.security_api import security_router
from backend.api.self_diagnosis_api import self_diagnosis_router
from backend.api.service_logs_api import service_logs_router
from backend.api.session_management_api import router as session_mgmt_router
from backend.api.error_reporting_api import router as error_reporting_router

# Phase 1-3: New Upgrade APIs
from backend.api.sync_batch_api import router as sync_batch_router

# New feature services
from backend.api.sync_conflicts_api import sync_conflicts_router
from backend.api.sync_management_api import sync_management_router
from backend.api.sync_status_api import sync_router
from backend.api.user_settings_api import router as user_settings_router
from backend.api.variance_api import router as variance_router
from backend.api.websocket_api import router as websocket_router
from backend.config import settings
from backend.error_messages import get_error_message
from backend.services.errors import (
    AuthenticationError,
    DatabaseError,
    NotFoundError,
    RateLimitExceededError,
    ValidationError,
)

# Phase 1-3: New Services
# from backend.services.runtime import get_cache_service, get_refresh_token_service

# Utils
from backend.utils.api_utils import result_to_response
from backend.utils.api_utils import sanitize_for_logging
from backend.utils.auth_utils import get_password_hash

from backend.utils.port_detector import PortDetector, save_backend_info
from backend.utils.result import Fail, Ok, Result
from backend.utils.tracing import instrument_fastapi_app

# Initialize a fallback logger early so optional import blocks can log safely
logger = logging.getLogger("stock-verify")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# Import optional services
try:
    from backend.api.enrichment_api import enrichment_router
except ImportError:
    enrichment_router = None  # type: ignore

# Import enterprise services (optional - for enterprise features)
try:
    from backend.api.enterprise_api import enterprise_router
    ENTERPRISE_AVAILABLE = True
except ImportError as e:
    ENTERPRISE_AVAILABLE = False
    enterprise_router = None  # type: ignore
    logger.info(f"Enterprise features not available: {e}")
    enrichment_router = None  # type: ignore

T = TypeVar("T")
E = TypeVar("E", bound=Exception)
R = TypeVar("R")


RUNNING_UNDER_PYTEST = "pytest" in sys.modules

ROOT_DIR = Path(__file__).parent

# SECURITY: settings from backend.config already enforce strong secrets
SECRET_KEY: str = cast(str, settings.JWT_SECRET)
ALGORITHM = settings.JWT_ALGORITHM
security = HTTPBearer(auto_error=False)

# Create FastAPI app with lifespan
app = FastAPI(
    title=getattr(settings, "APP_NAME", "Stock Count API"),
    description="Stock counting and ERP sync API",
    version=getattr(settings, "APP_VERSION", "1.0.0"),
    lifespan=lifespan,
)

# Attach OpenTelemetry tracing to the FastAPI app if enabled
try:
    instrument_fastapi_app(app)
except Exception:
    # Tracing should never prevent the app from starting
    pass

# SECURITY FIX: Configure CORS with specific origins instead of wildcard
# Configure CORS from settings with environment-aware defaults
_env = getattr(settings, "ENVIRONMENT", "development").lower()
if getattr(settings, "CORS_ALLOW_ORIGINS", None):
    _allowed_origins = [
        o.strip() for o in (settings.CORS_ALLOW_ORIGINS or "").split(",") if o.strip()
    ]
elif _env == "development":
    # Base development origins (localhost variants)
    _allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "exp://localhost:8081",
    ]
    # Add additional dev origins from environment if configured
    if getattr(settings, "CORS_DEV_ORIGINS", None):
        dev_origins = [o.strip() for o in (settings.CORS_DEV_ORIGINS or "").split(",") if o.strip()]
        _allowed_origins.extend(dev_origins)
        logger.info(f"Added {len(dev_origins)} additional CORS origins from CORS_DEV_ORIGINS")
else:
    _allowed_origins = []
    if not getattr(settings, "CORS_ALLOW_ORIGINS", None):
        logger.warning(
            "CORS_ALLOW_ORIGINS not configured for non-development environment; "
            "requests may be blocked"
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    # Allow local network IPs for development (Expo Go, LAN access)
    allow_origin_regex=(
        r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?"
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Request-ID",
    ],
)

# Add security headers middleware (OWASP best practices)
try:
    from backend.middleware.security_headers import SecurityHeadersMiddleware

    # Enable security headers (strict CSP in production)
    strict_csp = os.getenv("STRICT_CSP", "false").lower() == "true"
    force_https = os.getenv("FORCE_HTTPS", "false").lower() == "true"

    app.add_middleware(
        SecurityHeadersMiddleware,
        STRICT_CSP=strict_csp,
        force_https=force_https,
    )
    logger.info("✓ Security headers middleware enabled")
except Exception as e:
    logger.warning(f"Security headers middleware not available: {str(e)}")

# Create API router
api_router = APIRouter()

# Register all routers with the app
app.include_router(health_router)  # Health check endpoints at /health/*
app.include_router(health_router, prefix="/api")  # Alias for frontend compatibility
app.include_router(info_router)  # Version check and info endpoints at /api/*
app.include_router(permissions_router, prefix="/api")  # Permissions management
app.include_router(user_management_router, prefix="/api")  # User management CRUD
app.include_router(mapping_router)  # Database mapping endpoints via mapping_api
app.include_router(exports_router, prefix="/api")  # Export functionality

app.include_router(auth_router, prefix="/api")
app.include_router(items_router)  # Enhanced items API (has its own prefix /api/v2/erp/items)
app.include_router(search_router)  # Search API (has prefix /api/items)
app.include_router(metrics_router, prefix="/api")  # Metrics and monitoring
app.include_router(sync_router, prefix="/api")  # Sync status
app.include_router(sync_management_router, prefix="/api")  # Sync management
app.include_router(self_diagnosis_router, prefix="/api/diagnosis")  # Self-diagnosis tools
app.include_router(security_router)  # Security dashboard (has its own prefix)
app.include_router(verification_router)
app.include_router(erp_router, prefix="/api")  # ERP endpoints
app.include_router(variance_router, prefix="/api")  # Variance reasons and trendspoints
app.include_router(admin_control_router)  # Admin control endpoints
app.include_router(dynamic_fields_router)  # Dynamic fields management
app.include_router(dynamic_reports_router)  # Dynamic reports (has prefix /api/dynamic-reports)
app.include_router(realtime_dashboard_router, prefix="/api")  # Real-time dashboard (SSE/WebSocket)
app.include_router(logs_router, prefix="/api")  # Error and Activity logs
app.include_router(master_settings_router)  # Master settings
app.include_router(service_logs_router)  # Service logs
app.include_router(locations_router)  # Locations (Zones/Warehouses)
app.include_router(count_lines_router, prefix="/api")  # Count lines management


# Phase 1-3: New Upgrade Routers
app.include_router(sync_batch_router)  # Batch sync API (has prefix /api/sync)
app.include_router(rack_router)  # Rack management (has prefix /api/racks)
app.include_router(session_mgmt_router)  # Session management (has prefix /api/sessions)
app.include_router(user_settings_router)  # User settings (has prefix /api/user)
app.include_router(
    preferences_router, prefix="/api"
)  # User preferences (has prefix /api/users/me/preferences)
app.include_router(reporting_router)  # Reporting API (has prefix /api/reports)
app.include_router(admin_dashboard_router, prefix="/api")  # Admin Dashboard API
app.include_router(report_generation_router, prefix="/api")  # Report Generation API
app.include_router(error_reporting_router)  # Error Reporting API (has prefix /api/admin)
app.include_router(websocket_router)  # WebSocket updates (endpoint at /ws/updates)
logger.info("✓ Phase 1-3 upgrade routers registered")
logger.info("✓ Admin Dashboard, Report Generation, and Dynamic Reports APIs registered")

# Enterprise API (audit, security, feature flags, governance)
if ENTERPRISE_AVAILABLE and enterprise_router is not None:
    app.include_router(enterprise_router, prefix="/api")
    logger.info("✓ Enterprise API router registered at /api/enterprise/*")


@app.get("/api/mapping/test_direct")
def test_direct():
    return {"status": "ok"}


# Debug: Print all registered routes
for route in app.routes:
    if hasattr(route, "path"):
        logger.info(f"Route: {route.path}")
# Import and include Notes API router locally to avoid top-level import churn
try:
    from backend.api.notes_api import router as notes_router

    app.include_router(notes_router, prefix="/api")  # Notes feature
    app.include_router(sync_conflicts_router, prefix="/api")  # Sync conflicts feature

except Exception as _e:
    logger.warning(f"Feature API router not available: {_e}")

# Import and include Enrichment API router
if enrichment_router:
    try:
        app.include_router(enrichment_router)  # Enrichment endpoints
        logger.info("✓ Enrichment API router registered")
    except Exception as _e:
        logger.warning(f"Enrichment API router not available: {_e}")

# Include API v2 router (upgraded endpoints)
try:
    from backend.api.v2 import v2_router

    app.include_router(v2_router)
    logger.info("✓ API v2 router registered")
except Exception as e:
    logger.warning(f"API v2 router not available: {e}")

# Register routers with clear prefixes
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(supervisor_pin.router, prefix="/api", tags=["Supervisor"])

# Include routes defined on api_router
app.include_router(api_router, prefix="/api")


# Pydantic Models


# Note: verify_password and get_password_hash are imported from backend.utils.auth_utils (line 72)


def create_access_token(data: dict[str, Any]) -> str:
    """Create a JWT access token from user data"""
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict[str, Any]:
    logger.debug("get_current_user called")
    try:
        if credentials is None:
            logger.debug("get_current_user: No credentials")
            error = get_error_message("AUTH_TOKEN_INVALID")
            raise HTTPException(
                status_code=401,
                detail={
                    "message": error["message"],
                    "detail": "Authentication credentials were not provided",
                    "code": error["code"],
                },
            )

        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # No type validation needed - we only issue access tokens through this endpoint
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
        user = await db.users.find_one({"username": username})
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
        return dict(user)
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
        ) from None
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
        ) from None


# Initialize default users
async def init_default_users():
    """Create default users if they don't exist"""
    try:
        # Check for staff1
        staff_exists = await db.users.find_one({"username": "staff1"})
        if not staff_exists:
            await db.users.insert_one(
                {
                    "username": "staff1",
                    "hashed_password": get_password_hash("staff123"),
                    "full_name": "Staff Member",
                    "role": "staff",
                    "is_active": True,
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                }
            )
            logger.info("Default user created: staff1/staff123")

        # Check for supervisor
        supervisor_exists = await db.users.find_one({"username": "supervisor"})
        if not supervisor_exists:
            await db.users.insert_one(
                {
                    "username": "supervisor",
                    "hashed_password": get_password_hash("super123"),
                    "full_name": "Supervisor",
                    "role": "supervisor",
                    "is_active": True,
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                }
            )
            logger.info("Default user created: supervisor/super123")

        # Check for admin
        admin_exists = await db.users.find_one({"username": "admin"})
        if not admin_exists:
            await db.users.insert_one(
                {
                    "username": "admin",
                    "hashed_password": get_password_hash("admin123"),
                    "full_name": "Administrator",
                    "role": "admin",
                    "is_active": True,
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                }
            )
            logger.info("Default user created: admin/admin123")
    except Exception as e:
        logger.error(f"Error creating default users: {str(e)}")
        raise


# Initialize mock ERP data
async def init_mock_erp_data():
    count = await db.erp_items.count_documents({})
    if count == 0:
        mock_items = [
            {
                "item_code": "ITEM001",
                "item_name": "Rice Bag 25kg",
                "barcode": "1234567890123",
                "stock_qty": 150.0,
                "mrp": 1200.0,
                "category": "Food",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM002",
                "item_name": "Cooking Oil 5L",
                "barcode": "1234567890124",
                "stock_qty": 80.0,
                "mrp": 650.0,
                "category": "Food",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM003",
                "item_name": "Sugar 1kg",
                "barcode": "1234567890125",
                "stock_qty": 200.0,
                "mrp": 50.0,
                "category": "Food",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM004",
                "item_name": "Tea Powder 250g",
                "barcode": "1234567890126",
                "stock_qty": 95.0,
                "mrp": 180.0,
                "category": "Beverages",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM005",
                "item_name": "Soap Bar",
                "barcode": "1234567890127",
                "stock_qty": 300.0,
                "mrp": 25.0,
                "category": "Personal Care",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM006",
                "item_name": "Shampoo 200ml",
                "barcode": "1234567890128",
                "stock_qty": 120.0,
                "mrp": 150.0,
                "category": "Personal Care",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM007",
                "item_name": "Toothpaste",
                "barcode": "1234567890129",
                "stock_qty": 180.0,
                "mrp": 75.0,
                "category": "Personal Care",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM008",
                "item_name": "Wheat Flour 10kg",
                "barcode": "1234567890130",
                "stock_qty": 90.0,
                "mrp": 400.0,
                "category": "Food",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM009",
                "item_name": "Detergent Powder 1kg",
                "barcode": "1234567890131",
                "stock_qty": 110.0,
                "mrp": 120.0,
                "category": "Household",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM010",
                "item_name": "Biscuits Pack",
                "barcode": "1234567890132",
                "stock_qty": 250.0,
                "mrp": 30.0,
                "category": "Snacks",
                "warehouse": "Main",
            },
            {
                "item_code": "ITEM_TEST_E2E",
                "item_name": "E2E Test Item",
                "barcode": "513456",
                "stock_qty": 100.0,
                "mrp": 999.0,
                "category": "Test",
                "warehouse": "Main",
            },
        ]
        await db.erp_items.insert_many(mock_items)
        logging.info("Mock ERP data initialized")


# Routes


# Helper functions for login
async def check_rate_limit(ip_address: str) -> Result[bool, Exception]:
    """
    Check if the IP has exceeded the login attempt limit.

    Rate limiting is configurable via RATE_LIMIT_ENABLED environment variable.
    Default: Enabled in production, disabled in development.
    """
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
            RateLimitExceededError(
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
    try:
        user = await db.users.find_one({"username": username})
        if not user:
            return Fail(NotFoundError("User not found"))
        return Ok(user)
    except Exception as e:
        logger.error(f"Error finding user {sanitize_for_logging(username)}: {str(e)}")
        return Fail(DatabaseError("Error accessing user data"))


async def generate_auth_tokens(
    user: dict[str, Any], ip_address: str, request: Request
) -> Result[dict[str, Any], Exception]:
    """Generate access and refresh tokens with error handling."""
    try:
        # Generate access token
        access_token_expires = timedelta(
            minutes=getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 15)
        )
        access_token = create_access_token(
            {"sub": user["username"], "role": user.get("role", "staff")}
        )

        # Generate refresh token using service
        refresh_payload = {"sub": user["username"], "role": user.get("role", "staff")}
        refresh_token = refresh_token_service.create_refresh_token(refresh_payload)
        refresh_token_expires = datetime.utcnow() + timedelta(
            days=getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 30)
        )

        # Store refresh token via service
        await refresh_token_service.store_refresh_token(
            refresh_token,
            user["username"],
            refresh_token_expires,
            ip_address=ip_address,
            user_agent=request.headers.get("user-agent"),
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
        return Fail(DatabaseError("Error generating authentication tokens"))


async def log_failed_login_attempt(
    username: str, ip_address: str, user_agent: Optional[str], error: str
) -> None:
    """Log a failed login attempt."""
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


async def log_successful_login(user: dict[str, Any], ip_address: str, request: Request) -> None:
    """Log a successful login."""
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

        # Log to monitoring
        # monitoring_service.log_event(
        #     "user_login",
        #     user_id=user["_id"],
        #     username=user["username"],
        #     ip_address=ip_address,
        #     user_agent=request.headers.get("user-agent")
        # )
    except Exception as e:
        logger.error(f"Failed to log successful login: {str(e)}")


@api_router.post("/auth/refresh", response_model=ApiResponse[TokenResponse])
@result_to_response(success_status=200)
async def refresh_token(request: Request) -> Result[dict[str, Any], Exception]:
    """
    Refresh access token using refresh token.

    Request body should contain: {"refresh_token": "uuid-string"}
    """
    try:
        body = await request.json()
        refresh_token_value = body.get("refresh_token")

        if not refresh_token_value:
            return Fail(ValidationError("Refresh token is required"))

        refreshed = await refresh_token_service.refresh_access_token(refresh_token_value)
        if not refreshed:
            return Fail(AuthenticationError("Invalid or expired refresh token"))

        return Ok(refreshed)
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return Fail(e)


@api_router.post("/auth/logout")
async def logout(
    request: Request, current_user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """
    Logout user by revoking their refresh token.

    Request body should contain: {"refresh_token": "uuid-string"}
    """
    try:
        body = await request.json()
        refresh_token_value = body.get("refresh_token")

        if refresh_token_value:
            payload = await refresh_token_service.verify_refresh_token(refresh_token_value)
            if payload and payload.get("sub") == current_user.get("username"):
                await refresh_token_service.revoke_token(refresh_token_value)

        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(status_code=500, detail="Logout failed") from e


# Session routes
@api_router.post("/sessions", response_model=Session)
async def create_session(
    request: Request,
    session_data: SessionCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Session:
    logger.debug(f"create_session called. User: {current_user.get('username')}")
    # Input validation and sanitization
    warehouse = session_data.warehouse.strip()
    if not warehouse:
        raise HTTPException(status_code=400, detail="Warehouse name cannot be empty")
    if len(warehouse) < 2:
        raise HTTPException(status_code=400, detail="Warehouse name must be at least 2 characters")
    if len(warehouse) > 100:
        raise HTTPException(
            status_code=400, detail="Warehouse name must be less than 100 characters"
        )
    # Sanitize warehouse name (remove potentially dangerous characters)
    warehouse = warehouse.replace("<", "").replace(">", "").replace('"', "").replace("'", "")

    session = Session(
        warehouse=warehouse,
        staff_user=current_user["username"],
        staff_name=current_user.get("full_name") or current_user["username"],
        type=session_data.type or "STANDARD",
    )

    # Add session_id to satisfy the unique index on session_id
    session_dict = session.model_dump()
    session_dict["session_id"] = session.id
    await db.sessions.insert_one(session_dict)

    # Log activity
    await activity_log_service.log_activity(
        user=current_user["username"],
        role=current_user["role"],
        action="create_session",
        entity_type="session",
        entity_id=session.id,
        details={"warehouse": session_data.warehouse},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )

    return session


@api_router.get("/sessions", response_model=dict[str, Any])
async def get_sessions(
    current_user: dict[str, Any] = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict[str, Any]:
    """Get sessions with pagination"""
    skip = (page - 1) * page_size

    if current_user["role"] == "supervisor":
        total = await db.sessions.count_documents({})
        sessions_cursor = db.sessions.find().sort("started_at", -1).skip(skip).limit(page_size)
    else:
        filter_query = {"staff_user": current_user["username"]}
        total = await db.sessions.count_documents(filter_query)
        # Optimize query with projection and batch size
        projection = {"_id": 0}
        sessions_cursor = (
            db.sessions.find(filter_query, projection)
            .sort("started_at", -1)
            .skip(skip)
            .limit(page_size)
        )
        sessions_cursor.batch_size(min(page_size, 100))

    sessions = await sessions_cursor.to_list(page_size)

    return {
        "items": [Session(**session) for session in sessions],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": skip + page_size < total,
            "has_prev": page > 1,
        },
    }


# Bulk session operations
@api_router.post("/sessions/bulk/close")
async def bulk_close_sessions(
    session_ids: list[str], current_user: dict = Depends(get_current_user)
):
    """Bulk close sessions (supervisor only)"""
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        updated_count = 0
        errors = []

        for session_id in session_ids:
            try:
                result = await db.sessions.update_one(
                    {"id": session_id},
                    {"$set": {"status": "closed", "ended_at": datetime.utcnow()}},
                )
                if result.modified_count > 0:
                    updated_count += 1
                    # Log activity
                    await activity_log_service.log_activity(
                        user=current_user["username"],
                        role=current_user["role"],
                        action="bulk_close_session",
                        entity_type="session",
                        entity_id=session_id,
                        details={"operation": "bulk_close"},
                        ip_address=None,
                        user_agent=None,
                    )
            except Exception as e:
                errors.append({"session_id": session_id, "error": str(e)})

        return {
            "success": True,
            "updated_count": updated_count,
            "total": len(session_ids),
            "errors": errors,
        }
    except Exception as e:
        logger.error(f"Bulk close sessions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@api_router.post("/sessions/bulk/reconcile")
async def bulk_reconcile_sessions(
    session_ids: list[str], current_user: dict = Depends(get_current_user)
):
    """Bulk reconcile sessions (supervisor only)"""
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        updated_count = 0
        errors = []

        for session_id in session_ids:
            try:
                result = await db.sessions.update_one(
                    {"id": session_id},
                    {
                        "$set": {
                            "status": "reconciled",
                            "reconciled_at": datetime.utcnow(),
                        }
                    },
                )
                if result.modified_count > 0:
                    updated_count += 1
                    # Log activity
                    await activity_log_service.log_activity(
                        user=current_user["username"],
                        role=current_user["role"],
                        action="bulk_reconcile_session",
                        entity_type="session",
                        entity_id=session_id,
                        details={"operation": "bulk_reconcile"},
                        ip_address=None,
                        user_agent=None,
                    )
            except Exception as e:
                errors.append({"session_id": session_id, "error": str(e)})

        return {
            "success": True,
            "updated_count": updated_count,
            "total": len(session_ids),
            "errors": errors,
        }
    except Exception as e:
        logger.error(f"Bulk reconcile sessions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@api_router.post("/sessions/bulk/export")
async def bulk_export_sessions(
    session_ids: list[str],
    format: str = "excel",
    current_user: dict = Depends(get_current_user),
):
    """Bulk export sessions (supervisor only)"""
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        sessions = []
        for session_id in session_ids:
            session = await db.sessions.find_one({"session_id": session_id})
            if session:
                sessions.append(session)

        # Log activity
        await activity_log_service.log_activity(
            user=current_user["username"],
            role=current_user["role"],
            action="bulk_export_sessions",
            entity_type="session",
            entity_id=None,
            details={
                "operation": "bulk_export",
                "count": len(sessions),
                "format": format,
            },
            ip_address=None,
            user_agent=None,
        )

        return {
            "success": True,
            "exported_count": len(sessions),
            "total": len(session_ids),
            "data": sessions,
            "format": format,
        }
    except Exception as e:
        logger.error(f"Bulk export sessions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@api_router.get("/sessions/analytics")
async def get_sessions_analytics(current_user: dict = Depends(get_current_user)):
    """Get aggregated session analytics (supervisor only)"""
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        # Aggregation pipeline for efficient server-side calculation
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "total_sessions": {"$sum": 1},
                    "total_items": {"$sum": "$total_items"},
                    "total_variance": {"$sum": "$total_variance"},
                    "avg_variance": {"$avg": "$total_variance"},
                    "sessions_by_status": {"$push": {"status": "$status", "count": 1}},
                }
            }
        ]

        # Sessions by date
        date_pipeline = [
            {
                "$project": {
                    "date": {"$substr": ["$started_at", 0, 10]},
                    "warehouse": 1,
                    "staff_name": 1,
                    "total_items": 1,
                    "total_variance": 1,
                }
            },
            {"$group": {"_id": "$date", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]

        # Variance by warehouse
        warehouse_pipeline = [
            {
                "$group": {
                    "_id": "$warehouse",
                    "total_variance": {"$sum": {"$abs": "$total_variance"}},
                    "session_count": {"$sum": 1},
                }
            }
        ]

        # Items by staff
        staff_pipeline = [
            {
                "$group": {
                    "_id": "$staff_name",
                    "total_items": {"$sum": "$total_items"},
                    "session_count": {"$sum": 1},
                }
            }
        ]

        # Execute aggregations
        overall = await db.sessions.aggregate(pipeline).to_list(1)
        by_date = await db.sessions.aggregate(date_pipeline).to_list(None)  # type: ignore
        by_warehouse = await db.sessions.aggregate(warehouse_pipeline).to_list(None)
        by_staff = await db.sessions.aggregate(staff_pipeline).to_list(None)

        # Transform results
        sessions_by_date = {item["_id"]: item["count"] for item in by_date}
        variance_by_warehouse = {item["_id"]: item["total_variance"] for item in by_warehouse}
        items_by_staff = {item["_id"]: item["total_items"] for item in by_staff}

        return {
            "success": True,
            "data": {
                "overall": overall[0] if overall else {},
                "sessions_by_date": sessions_by_date,
                "variance_by_warehouse": variance_by_warehouse,
                "items_by_staff": items_by_staff,
                "total_sessions": overall[0]["total_sessions"] if overall else 0,
            },
        }
    except Exception as e:
        logger.error(f"Analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@api_router.get("/sessions/{session_id}")
async def get_session_by_id(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific session by ID"""
    try:
        session = await db.sessions.find_one({"session_id": session_id})

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Check permissions
        if (
            current_user["role"] != "supervisor"
            and session.get("staff_user") != current_user["username"]
        ):
            raise HTTPException(status_code=403, detail="Access denied")

        return Session(**session)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


# ERP Item routes


# Helper function to detect high-risk corrections
def detect_risk_flags(erp_item: dict, line_data: CountLineCreate, variance: float) -> list[str]:
    """Detect high-risk correction patterns"""
    risk_flags = []

    # Get values
    erp_qty = erp_item.get("stock_qty", 0)
    erp_mrp = erp_item.get("mrp", 0)
    counted_mrp = line_data.mrp_counted or erp_mrp

    # Calculate percentages safely
    variance_percent = (abs(variance) / erp_qty * 100) if erp_qty > 0 else 100
    mrp_change_percent = ((counted_mrp - erp_mrp) / erp_mrp * 100) if erp_mrp > 0 else 0

    # Rule 1: Large variance
    if abs(variance) > 100 or variance_percent > 50:
        risk_flags.append("LARGE_VARIANCE")

    # Rule 2: MRP reduced significantly
    if mrp_change_percent < -20:
        risk_flags.append("MRP_REDUCED_SIGNIFICANTLY")

    # Rule 3: High value item with variance
    if erp_mrp > 10000 and variance_percent > 5:
        risk_flags.append("HIGH_VALUE_VARIANCE")

    # Rule 4: Serial numbers missing for high-value item
    if erp_mrp > 5000 and (not line_data.serial_numbers or len(line_data.serial_numbers) == 0):
        risk_flags.append("SERIAL_MISSING_HIGH_VALUE")

    # Rule 5: Correction without reason when variance exists
    if abs(variance) > 0 and not line_data.correction_reason and not line_data.variance_reason:
        risk_flags.append("MISSING_CORRECTION_REASON")

    # Rule 6: MRP change without reason
    if (
        abs(mrp_change_percent) > 5
        and not line_data.correction_reason
        and not line_data.variance_reason
    ):
        risk_flags.append("MRP_CHANGE_WITHOUT_REASON")

    # Rule 7: Photo required but missing
    photo_required = (
        abs(variance) > 100
        or variance_percent > 50
        or abs(mrp_change_percent) > 20
        or erp_mrp > 10000
    )
    if (
        photo_required
        and not line_data.photo_base64
        and (not line_data.photo_proofs or len(line_data.photo_proofs) == 0)
    ):
        risk_flags.append("PHOTO_PROOF_REQUIRED")

    return risk_flags


# Helper function to calculate financial impact
def calculate_financial_impact(erp_mrp: float, counted_mrp: float, counted_qty: float) -> float:
    """Calculate revenue impact of MRP change"""
    old_value = erp_mrp * counted_qty
    new_value = counted_mrp * counted_qty
    return new_value - old_value


# Count Line routes
@api_router.post("/count-lines")
async def create_count_line(
    request: Request,
    line_data: CountLineCreate,
    current_user: dict = Depends(get_current_user),
):
    # Validate session exists
    session = await db.sessions.find_one({"session_id": line_data.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get ERP item
    erp_item = await db.erp_items.find_one({"item_code": line_data.item_code})
    if not erp_item:
        raise HTTPException(status_code=404, detail="Item not found in ERP")

    # Calculate variance
    variance = line_data.counted_qty - erp_item["stock_qty"]

    # Validate mandatory correction reason for variance
    if abs(variance) > 0 and not line_data.correction_reason and not line_data.variance_reason:
        raise HTTPException(
            status_code=400,
            detail="Correction reason is mandatory when variance exists",
        )

    # Detect risk flags
    risk_flags = detect_risk_flags(erp_item, line_data, variance)

    # Calculate financial impact
    counted_mrp = line_data.mrp_counted or erp_item["mrp"]
    financial_impact = calculate_financial_impact(
        erp_item["mrp"], counted_mrp, line_data.counted_qty
    )

    # Determine approval status based on risk
    # High-risk corrections require supervisor review
    approval_status = "NEEDS_REVIEW" if risk_flags else "PENDING"

    # Check for duplicates
    duplicate_check = await db.count_lines.count_documents(
        {
            "session_id": line_data.session_id,
            "item_code": line_data.item_code,
            "counted_by": current_user["username"],
        }
    )
    if duplicate_check > 0:
        risk_flags.append("DUPLICATE_CORRECTION")
        approval_status = "NEEDS_REVIEW"

    # Create count line with enhanced fields
    count_line = {
        "id": str(uuid.uuid4()),
        "session_id": line_data.session_id,
        "item_code": line_data.item_code,
        "item_name": erp_item["item_name"],
        "barcode": erp_item["barcode"],
        "erp_qty": erp_item["stock_qty"],
        "counted_qty": line_data.counted_qty,
        "variance": variance,
        # Legacy fields
        "variance_reason": line_data.variance_reason,
        "variance_note": line_data.variance_note,
        "remark": line_data.remark,
        "photo_base64": line_data.photo_base64,
        # Enhanced fields
        "damaged_qty": line_data.damaged_qty,
        "item_condition": line_data.item_condition,
        "floor_no": line_data.floor_no,
        "rack_no": line_data.rack_no,
        "mark_location": line_data.mark_location,
        "sr_no": line_data.sr_no,
        "manufacturing_date": line_data.manufacturing_date,
        "correction_reason": (
            line_data.correction_reason.model_dump() if line_data.correction_reason else None
        ),
        "photo_proofs": (
            [p.model_dump() for p in line_data.photo_proofs] if line_data.photo_proofs else None
        ),
        "correction_metadata": (
            line_data.correction_metadata.model_dump() if line_data.correction_metadata else None
        ),
        "approval_status": approval_status,
        "approval_by": None,
        "approval_at": None,
        "rejection_reason": None,
        "risk_flags": risk_flags,
        "financial_impact": financial_impact,
        # User and timestamp
        "counted_by": current_user["username"],
        "counted_at": datetime.utcnow(),
        # MRP tracking
        "mrp_erp": erp_item["mrp"],
        "mrp_counted": line_data.mrp_counted,
        # Additional fields
        "split_section": line_data.split_section,
        "serial_numbers": line_data.serial_numbers,
        # Legacy approval fields
        "status": "pending",
        "verified": False,
        "verified_at": None,
        "verified_by": None,
    }

    await db.count_lines.insert_one(count_line)

    # Update item location in ERP items collection if floor/rack provided
    if line_data.floor_no or line_data.rack_no:
        update_fields = {}
        if line_data.floor_no:
            update_fields["floor_no"] = line_data.floor_no
        if line_data.rack_no:
            update_fields["rack_no"] = line_data.rack_no

        if update_fields:
            try:
                await db.erp_items.update_one(
                    {"item_code": line_data.item_code},
                    {"$set": update_fields}
                )
            except Exception as e:
                logger.error(f"Failed to update item location: {str(e)}")
                # Non-critical error, continue execution

    # Update session stats atomically using aggregation
    try:
        pipeline = [
            {"$match": {"session_id": line_data.session_id}},
            {
                "$group": {
                    "_id": None,
                    "total_items": {"$sum": 1},
                    "total_variance": {"$sum": "$variance"},
                }
            },
        ]
        stats = await db.count_lines.aggregate(pipeline).to_list(1)  # type: ignore
        if stats:
            await db.sessions.update_one(
                {"id": line_data.session_id},
                {
                    "$set": {
                        "total_items": stats[0]["total_items"],
                        "total_variance": stats[0]["total_variance"],
                    }
                },
            )
    except Exception as e:
        logger.error(f"Failed to update session stats: {str(e)}")
        # Non-critical error, continue execution

    # Log high-risk correction
    if risk_flags:
        await activity_log_service.log_activity(
            user=current_user["username"],
            role=current_user["role"],
            action="high_risk_correction",
            entity_type="count_line",
            entity_id=count_line["id"],
            details={"risk_flags": risk_flags, "item_code": line_data.item_code},
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )

    # Remove the MongoDB _id field before returning
    count_line.pop("_id", None)
    return count_line


def _get_db_client(db_override=None):
    """Resolve the active database client, raising if not initialized."""
    db_client = db_override or db
    if db_client is None:
        raise HTTPException(status_code=500, detail="Database is not initialized")
    return db_client


def _require_supervisor(current_user: dict):
    if current_user.get("role") not in {"supervisor", "admin"}:
        raise HTTPException(status_code=403, detail="Supervisor access required")


async def verify_stock(
    line_id: str,
    current_user: dict,
    *,
    request: Request = None,
    db_override=None,
):
    """Mark a count line as verified. Exposed for direct test usage."""
    _require_supervisor(current_user)
    db_client = _get_db_client(db_override)

    update_result = await db_client.count_lines.update_one(
        {"id": line_id},
        update={
            "$set": {
                "verified": True,
                "verified_by": current_user["username"],
                "verified_at": datetime.utcnow(),
            }
        },
    )
    if update_result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Count line not found")

    if activity_log_service:
        await activity_log_service.log_activity(
            user=current_user["username"],
            role=current_user.get("role", ""),
            action="verify_stock",
            entity_type="count_line",
            entity_id=line_id,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )

    return {"message": "Stock verified", "verified": True}


async def unverify_stock(
    line_id: str,
    current_user: dict,
    *,
    request: Request = None,
    db_override=None,
):
    """Remove verification metadata from a count line."""
    _require_supervisor(current_user)
    db_client = _get_db_client(db_override)

    update_result = await db_client.count_lines.update_one(
        {"id": line_id},
        update={"$set": {"verified": False, "verified_by": None, "verified_at": None}},
    )
    if update_result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Count line not found")

    if activity_log_service:
        await activity_log_service.log_activity(
            user=current_user["username"],
            role=current_user.get("role", ""),
            action="unverify_stock",
            entity_type="count_line",
            entity_id=line_id,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )

    return {"message": "Stock verification removed", "verified": False}


async def get_count_lines(
    session_id: str,
    current_user: dict,
    page: int = 1,
    page_size: int = 50,
    verified: Optional[bool] = None,
    *,
    db_override=None,
):
    """Get count lines with pagination. Shared between routes and tests."""
    skip = (page - 1) * page_size
    filter_query: dict[str, Any] = {"session_id": session_id}

    if verified is not None:
        filter_query["verified"] = verified

    db_client = _get_db_client(db_override)
    total = await db_client.count_lines.count_documents(filter_query)
    lines_cursor = (
        db_client.count_lines.find(filter_query, {"_id": 0})
        .sort("counted_at", -1)
        .skip(skip)
        .limit(page_size)
    )
    lines = await lines_cursor.to_list(page_size)

    return {
        "items": lines,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": skip + page_size < total,
            "has_prev": page > 1,
        },
    }


# Register api_router AFTER all routes have been defined
app.include_router(
    api_router, prefix="/api"
)  # Main API endpoints with auth, sessions, items, count-lines


# Run the server if executed directly
if __name__ == "__main__":
    # Get configured port as starting point
    start_port = int(getattr(settings, "PORT", os.getenv("PORT", 8001)))
    # Use PortDetector to find port and IP
    port = PortDetector.find_available_port(start_port, range(start_port, start_port + 10))
    local_ip = PortDetector.get_local_ip()

    # Set PORT env var for lifespan to pick up
    os.environ["PORT"] = str(port)

    # Check for SSL certificates
    # Try to find certs in project root/nginx/ssl
    project_root = Path(__file__).parent.parent
    default_key = project_root / "nginx" / "ssl" / "privkey.pem"
    default_cert = project_root / "nginx" / "ssl" / "fullchain.pem"

    ssl_keyfile = os.getenv("SSL_KEYFILE", str(default_key))
    ssl_certfile = os.getenv("SSL_CERTFILE", str(default_cert))
    use_ssl = os.path.exists(ssl_keyfile) and os.path.exists(ssl_certfile)

    # Save port to file for other services to discover
    protocol = "https" if use_ssl else "http"
    save_backend_info(port, local_ip, protocol)

    if use_ssl:
        logger.info(f"🔒 SSL certificates found. Starting server with HTTPS on port {port}...")
        uvicorn.run(
            "backend.server:app",
            host=os.getenv("HOST", "0.0.0.0"), # Listen on all interfaces for LAN access
            port=port,
            reload=False,
            log_level="info",
            access_log=True,
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile,
        )
    else:
        logger.warning("⚠️  No SSL certificates found. Starting server with HTTP (Unencrypted)...")
        logger.info(f"Starting server on port {port}...")
        uvicorn.run(
            "backend.server:app",
            host=os.getenv("HOST", "0.0.0.0"), # Listen on all interfaces for LAN access
            port=port,
            reload=False,
            log_level="info",
            access_log=True,
        )
