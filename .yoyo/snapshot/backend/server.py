from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings as PydanticBaseSettings
from typing import List, Optional, Dict, Any, TypeVar, Generic
import uuid
from datetime import datetime, timedelta
import time
import jwt
from passlib.context import CryptContext
from contextlib import asynccontextmanager
from functools import wraps
from bson import ObjectId
import re

from backend.utils.result import Result, Ok, Fail
from backend.services.errors import (
    DatabaseError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitExceededError,
)

T = TypeVar("T")
E = TypeVar("E", bound=Exception)
R = TypeVar("R")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[Dict[str, Any]] = None

    @classmethod
    def success_response(cls, data: T):
        return cls(success=True, data=data)

    @classmethod
    def error_response(cls, error: Dict[str, Any]):
        return cls(success=False, error=error)


# Helper function to convert Result to API response
def handle_result(result: Result[T, E], success_status: int = 200) -> Dict[str, Any]:
    """Convert a Result type to a proper API response."""
    if result.is_ok:
        return {"success": True, "data": result.unwrap(), "error": None}
    else:
        # Try common error attributes for Result
        error = getattr(result, "err", None) or getattr(result, "_error", None)
        if error is None:
            logger.error("Result has no error attribute - this should not happen")
            error = Exception("Unknown error")
        if isinstance(error, (AuthenticationError, AuthorizationError)):
            status_code = 401 if isinstance(error, AuthenticationError) else 403
            raise HTTPException(
                status_code=status_code,
                detail={
                    "success": False,
                    "error": {
                        "message": str(error),
                        "code": error.__class__.__name__,
                        "details": getattr(error, "details", {}),
                    },
                },
            )
        elif isinstance(error, ValidationError):
            raise HTTPException(
                status_code=422,
                detail={
                    "success": False,
                    "error": {
                        "message": str(error),
                        "code": "VALIDATION_ERROR",
                        "details": getattr(error, "details", {}),
                    },
                },
            )
        elif isinstance(error, NotFoundError):
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": {
                        "message": str(error),
                        "code": "NOT_FOUND",
                        "details": getattr(error, "details", {}),
                    },
                },
            )
        elif isinstance(error, RateLimitExceededError):
            raise HTTPException(
                status_code=429,
                detail={
                    "success": False,
                    "error": {
                        "message": str(error),
                        "code": "RATE_LIMIT_EXCEEDED",
                        "retry_after": getattr(error, "retry_after", None),
                        "details": getattr(error, "details", {}),
                    },
                },
            )
        else:
            # Log unexpected errors
            error_id = str(uuid.uuid4())
            logger.error(
                f"Unexpected error (ID: {error_id}): {str(error)}\n"
                f"Type: {type(error).__name__}\n"
                f"Traceback: {getattr(error, '__traceback__', 'No traceback')}"
            )
            raise HTTPException(
                status_code=500,
                detail={
                    "success": False,
                    "error": {
                        "message": "An unexpected error occurred",
                        "code": "INTERNAL_SERVER_ERROR",
                        "error_id": error_id,
                        "details": {
                            "error_type": type(error).__name__,
                            "error_message": str(error),
                        },
                    },
                },
            )


# Decorator for result handling
def result_to_response(success_status: int = 200):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                result = await func(*args, **kwargs)
                if isinstance(result, Result):
                    return handle_result(result, success_status)
                return result
            except HTTPException:
                raise
            except Exception as e:
                # Convert unhandled exceptions to Result and then to API response
                return handle_result(Fail(e), 500)

        return wrapper

    return decorator


# Production services
from backend.services.connection_pool import SQLServerConnectionPool
from backend.services.cache_service import CacheService
from backend.services.rate_limiter import RateLimiter, ConcurrentRequestHandler
from backend.services.monitoring_service import MonitoringService
from backend.services.database_health import DatabaseHealthService
from backend.services.database_optimizer import DatabaseOptimizer
from backend.middleware.performance_middleware import (
    PerformanceMiddleware,
    CacheMiddleware,
)
from backend.middleware.rate_limit_middleware import RateLimitMiddleware
from backend.middleware.compression_middleware import CompressionMiddleware
from backend.middleware.request_size_limit import RequestSizeLimitMiddleware
from backend.middleware.security_headers import SecurityHeadersMiddleware
from backend.middleware.request_id import RequestIDMiddleware
from backend.middleware.input_sanitization import InputSanitizationMiddleware
from backend.db.migrations import MigrationManager
from backend.sql_server_connector import SQLServerConnector
from backend.error_messages import get_error_message
from backend.services.refresh_token import RefreshTokenService
from backend.services.batch_operations import BatchOperationsService
from backend.services.activity_log import ActivityLogService
from backend.services.error_log import ErrorLogService
from backend.api_mapping import router as mapping_router
from backend.auth.dependencies import (
    init_auth_dependencies,
    get_current_user_async as get_current_user,
)
from backend.api.self_diagnosis_api import self_diagnosis_router
from backend.api.health import health_router
from backend.api.item_verification_api import init_verification_api, verification_router

# New feature API routers
from backend.api.permissions_api import permissions_router
from backend.api.exports_api import exports_router
from backend.api.sync_conflicts_api import sync_conflicts_router
from backend.api.metrics_api import metrics_router, set_monitoring_service
from backend.api.sync_status_api import sync_router, set_auto_sync_manager
from backend.api.sync_management_api import (
    sync_management_router,
    set_change_detection_service,
)
from backend.api.security_api import security_router

# New feature services
from backend.services.scheduled_export_service import ScheduledExportService
from backend.services.sync_conflicts_service import SyncConflictsService

RUNNING_UNDER_PYTEST = "pytest" in sys.modules

ROOT_DIR = Path(__file__).parent

# Setup basic logging first (before config to catch config errors)
if not RUNNING_UNDER_PYTEST:
    logging.basicConfig(level=logging.INFO)
else:
    logging.getLogger().setLevel(logging.INFO)
logger = logging.getLogger(__name__)

# SECURITY: Helper function to sanitize user input for logging
def sanitize_for_logging(user_input: str, max_length: int = 50) -> str:
    """
    Sanitize user input before logging to prevent log injection attacks.
    
    Args:
        user_input: The user input to sanitize
        max_length: Maximum length to allow (default: 50)
        
    Returns:
        Sanitized string safe for logging
    """
    if not user_input:
        return ""
    
    # Convert to string and truncate
    sanitized = str(user_input)[:max_length]
    
    # Remove newlines, carriage returns, and control characters that could break log format
    sanitized = re.sub(r'[\r\n\x00-\x1f\x7f-\x9f]', '', sanitized)
    
    # Remove potentially dangerous characters for log parsers
    sanitized = re.sub(r'[<>&"\'`]', '', sanitized)
    
    return sanitized

# SECURITY: Helper function for safe error responses
def create_safe_error_response(status_code: int, message: str, error_code: str = "INTERNAL_ERROR", log_details: str = None) -> HTTPException:
    """
    Create a safe error response that doesn't leak sensitive information.
    
    Args:
        status_code: HTTP status code
        message: Safe user-facing error message
        error_code: Application-specific error code
        log_details: Detailed error for logging only (not sent to client)
        
    Returns:
        HTTPException with sanitized error information
    """
    if log_details:
        logger.error(f"Internal error ({error_code}): {log_details}")
    
    return HTTPException(
        status_code=status_code,
        detail={
            "success": False,
            "error": {
                "message": message,
                "code": error_code,
            }
        }
    )

# Load configuration with validation
try:
    # Use centralized validated settings
    from backend.config import settings
except Exception as e:
    logger.error(f"Failed to load configuration: {str(e)}")
    raise


# Only define fallback Settings if settings is None
# Removed insecure local Settings fallback. All configuration must come from backend.config


# settings is guaranteed from backend.config


# MongoDB connection with optimization
mongo_url = settings.MONGO_URL
# Normalize trailing slash (avoid accidental DB name in URL)
mongo_url = mongo_url.rstrip("/")
# Do not append pool options to URL; keep them in client options only

mongo_client_options = dict(
    maxPoolSize=100,
    minPoolSize=10,
    maxIdleTimeMS=45000,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=20000,
    socketTimeoutMS=20000,
    retryWrites=True,
    retryReads=True,
)

client = AsyncIOMotorClient(
    mongo_url,
    **mongo_client_options,
)
# Use DB_NAME from settings (database name should not be in URL for this setup)
db = client[settings.DB_NAME]

# Database optimizer
db_optimizer = DatabaseOptimizer(
    mongo_client=client,
    max_pool_size=100,
    min_pool_size=10,
    max_idle_time_ms=45000,
    server_selection_timeout_ms=5000,
    connect_timeout_ms=20000,
    socket_timeout_ms=20000,
)
client = db_optimizer.optimize_client()

# Security - Modern password hashing with Argon2 (OWASP recommended)
# Fallback to bcrypt-only if argon2 is not available
try:
    pwd_context = CryptContext(
        schemes=[
            "argon2",
            "bcrypt",
        ],  # Argon2 first (preferred), bcrypt for backward compatibility
        deprecated="auto",  # Auto-upgrade old hashes on next login
        argon2__memory_cost=65536,  # 64 MB memory (resistant to GPU attacks)
        argon2__time_cost=3,  # 3 iterations
        argon2__parallelism=4,  # 4 threads
    )
    # Test if bcrypt backend is available
    try:
        import bcrypt

        # Verify bcrypt is working
        test_hash = bcrypt.hashpw(b"test", bcrypt.gensalt())
        bcrypt.checkpw(b"test", test_hash)
        logger.info("Password hashing: Using Argon2 with bcrypt fallback")
    except Exception as e:
        logger.warning(f"Bcrypt backend check failed, using bcrypt-only context: {str(e)}")
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception as e:
    logger.warning(f"Argon2 not available, using bcrypt-only: {str(e)}")
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# SECURITY: settings from backend.config already enforce strong secrets
SECRET_KEY = settings.JWT_SECRET
ALGORITHM = settings.JWT_ALGORITHM
security = HTTPBearer(auto_error=False)

# Initialize production services
# Enhanced Connection pool (if using SQL Server)
connection_pool = None
if (
    getattr(settings, "USE_CONNECTION_POOL", True)
    and settings.SQL_SERVER_HOST
    and settings.SQL_SERVER_DATABASE
):
    try:
        # Try to use enhanced connection pool first
        try:
            from backend.services.enhanced_connection_pool import EnhancedSQLServerConnectionPool
            connection_pool = EnhancedSQLServerConnectionPool(
                host=settings.SQL_SERVER_HOST,
                port=settings.SQL_SERVER_PORT,
                database=settings.SQL_SERVER_DATABASE,
                user=getattr(settings, "SQL_SERVER_USER", None),
                password=getattr(settings, "SQL_SERVER_PASSWORD", None),
                pool_size=getattr(settings, "POOL_SIZE", 10),
                max_overflow=getattr(settings, "MAX_OVERFLOW", 5),
                retry_attempts=getattr(settings, "CONNECTION_RETRY_ATTEMPTS", 3),
                retry_delay=getattr(settings, "CONNECTION_RETRY_DELAY", 1.0),
                health_check_interval=getattr(settings, "CONNECTION_HEALTH_CHECK_INTERVAL", 60),
            )
            logging.info("✓ Enhanced connection pool initialized")
        except ImportError:
            # Fallback to standard connection pool
            connection_pool = SQLServerConnectionPool(
                host=settings.SQL_SERVER_HOST,
                port=settings.SQL_SERVER_PORT,
                database=settings.SQL_SERVER_DATABASE,
                user=getattr(settings, "SQL_SERVER_USER", None),
                password=getattr(settings, "SQL_SERVER_PASSWORD", None),
                pool_size=getattr(settings, "POOL_SIZE", 10),
                max_overflow=getattr(settings, "MAX_OVERFLOW", 5),
            )
            logging.info("✓ Connection pool initialized (standard)")
    except Exception as e:
        logging.warning(f"Connection pool initialization failed: {str(e)}")

# Cache service
cache_service = CacheService(
    redis_url=getattr(settings, "REDIS_URL", None),
    default_ttl=getattr(settings, "CACHE_TTL", 3600),
)

# Rate limiter
rate_limiter = RateLimiter(
    default_rate=getattr(settings, "RATE_LIMIT_PER_MINUTE", 100),
    default_burst=getattr(settings, "RATE_LIMIT_BURST", 20),
    per_user=True,
    per_endpoint=False,
)

# Concurrent request handler
concurrent_handler = ConcurrentRequestHandler(
    max_concurrent=getattr(settings, "MAX_CONCURRENT", 50),
    queue_size=getattr(settings, "QUEUE_SIZE", 100),
)

# Monitoring service
monitoring_service = MonitoringService(
    history_size=getattr(settings, "METRICS_HISTORY_SIZE", 1000),
)

# SQL Server connector (global instance)
sql_connector = SQLServerConnector()

# Database health service (reuse shared db to avoid extra client)
database_health_service = DatabaseHealthService(
    mongo_db=db,
    sql_connector=sql_connector,
    check_interval=60,  # Check every 60 seconds
    mongo_uri=mongo_url,
    db_name=settings.DB_NAME,
    mongo_client_options=mongo_client_options,
)

# ERP sync service (full sync) - DISABLED to avoid conflicts with change detection
# Using ChangeDetectionSyncService instead for better performance
erp_sync_service = None
# if getattr(settings, 'ERP_SYNC_ENABLED', True):
#     try:
#         erp_sync_service = ERPSyncService(
#             sql_connector=sql_connector,
#             mongo_db=db,
#             sync_interval=getattr(settings, 'ERP_SYNC_INTERVAL', 3600),
#             enabled=True,
#         )
#         logging.info("✓ ERP sync service initialized")
#     except Exception as e:
#         logging.warning(f"ERP sync service initialization failed: {str(e)}")

# Change detection sync service (syncs item_name, manual_barcode, MRP changes)
# FULLY DISABLED FOR TESTING
change_detection_sync = None
set_change_detection_service(change_detection_sync)

# Auto-sync manager - automatically syncs when SQL Server becomes available
from backend.services.auto_sync_manager import AutoSyncManager

auto_sync_manager = None

# Migration manager
migration_manager = MigrationManager(db)

# Initialize refresh token and batch operations services
refresh_token_service = RefreshTokenService(db, SECRET_KEY, ALGORITHM)
batch_operations = BatchOperationsService(db)
activity_log_service = ActivityLogService(db)
error_log_service = ErrorLogService(db)


# Create the main app with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting application...")

    # Initialize SQL Server connection if credentials are available
    try:
        sql_host = getattr(settings, "SQL_SERVER_HOST", None)
        sql_port = getattr(settings, "SQL_SERVER_PORT", 1433)
        sql_database = getattr(settings, "SQL_SERVER_DATABASE", None)
        sql_user = getattr(settings, "SQL_SERVER_USER", None)
        sql_password = getattr(settings, "SQL_SERVER_PASSWORD", None)

        if sql_host and sql_database:
            logger.info(
                f"Attempting to connect to SQL Server at {sql_host}:{sql_port}/{sql_database}..."
            )
            try:
                sql_connector.connect(sql_host, sql_port, sql_database, sql_user, sql_password)
                logger.info("OK: SQL Server connection established")
            except (ConnectionError, TimeoutError, OSError) as e:
                logger.warning(f"SQL Server connection failed (network/system error): {str(e)}")
                logger.warning("ERP sync will be disabled until SQL Server is configured")
            except Exception as e:
                # Catch-all for other SQL Server connection errors (authentication, database not found, etc.)
                logger.warning(f"SQL Server connection failed: {str(e)}")
                logger.warning("ERP sync will be disabled until SQL Server is configured")
        else:
            logger.warning(
                "SQL Server credentials not configured. Set SQL_SERVER_HOST and SQL_SERVER_DATABASE in .env"
            )
    except (ValueError, AttributeError) as e:
        # Configuration errors - invalid settings
        logger.warning(f"Error initializing SQL Server connection (configuration error): {str(e)}")
    except Exception as e:
        # Other unexpected errors during initialization
        logger.warning(f"Unexpected error initializing SQL Server connection: {str(e)}")

    # CRITICAL: Verify MongoDB is available (required)
    try:
        await db.command("ping")
        logger.info("✅ MongoDB connection verified - MongoDB is required and available")
    except Exception as e:
        # MongoDB connection failed - this is critical, so we exit
        error_type = type(e).__name__
        logger.error(f"❌ MongoDB is required but unavailable ({error_type}): {e}")
        logger.error("Application cannot start without MongoDB. Please ensure MongoDB is running.")
        raise SystemExit(f"MongoDB is required but unavailable ({error_type}). Please start MongoDB and try again.")

    # Initialize default users
    try:
        await init_default_users()
        logger.info("OK: Default users initialized")
    except Exception as e:
        logger.error(f"Error initializing default users: {str(e)}")

    # Run migrations
    try:
        await migration_manager.ensure_indexes()
        await migration_manager.run_migrations()
        logger.info("OK: Migrations completed")
    except DatabaseError as e:
        logger.error(f"Database error during migrations: {str(e)}")
    except Exception as e:
        # Catch-all for migration errors (index creation failures, etc.)
        logger.error(f"Migration error: {str(e)}")

    # Initialize auto-sync manager (monitors SQL Server and auto-syncs when available)
    global auto_sync_manager
    try:
        auto_sync_manager = AutoSyncManager(
            sql_connector=sql_connector,
            mongo_db=db,
            sync_interval=getattr(settings, "ERP_SYNC_INTERVAL", 3600),
            check_interval=30,  # Check connection every 30 seconds
            enabled=True,
        )

        # Set callbacks for admin notifications
        async def on_connection_restored():
            logger.info("📢 SQL Server connection restored - sync will start automatically")
            # Could send notification to admin panel here

        async def on_connection_lost():
            logger.warning("📢 SQL Server connection lost - sync paused")
            # Could send notification to admin panel here

        async def on_sync_complete():
            logger.info("📢 Sync completed successfully")
            # Could send notification to admin panel here

        auto_sync_manager.set_callbacks(
            on_connection_restored=on_connection_restored,
            on_connection_lost=on_connection_lost,
            on_sync_complete=on_sync_complete,
        )

        await auto_sync_manager.start()
        logger.info("✅ Auto-sync manager started")

        # Register with API router
        set_auto_sync_manager(auto_sync_manager)
    except Exception as e:
        logger.warning(f"Auto-sync manager initialization failed: {str(e)}")
        auto_sync_manager = None

    # Start ERP sync service (full sync) - legacy, kept for backward compatibility
    if erp_sync_service:
        try:
            erp_sync_service.start()
            logger.info("✓ ERP sync service started")
        except Exception as e:
            logger.error(f"Failed to start ERP sync service: {str(e)}")

    # Change detection sync service is fully disabled for testing

    # Start database health monitoring
    try:
        database_health_service.start()
        logger.info("OK: Database health monitoring started")
    except Exception as e:
        logger.error(f"Failed to start database health monitoring: {str(e)}")

    # Initialize cache
    try:
        await cache_service.initialize()
        cache_stats = await cache_service.get_stats()
        logger.info(f"OK: Cache service initialized: {cache_stats.get('backend', 'unknown')}")
    except Exception as e:
        logger.warning(f"Cache service error: {str(e)}")

    # Initialize auth dependencies for routers (avoid circular imports)
    try:
        init_auth_dependencies(db, SECRET_KEY, ALGORITHM)
        logger.info("OK: Auth dependencies initialized")
    except Exception as e:
        logger.error(f"Failed to initialize auth dependencies: {str(e)}")

    # Initialize new feature services
    global scheduled_export_service, sync_conflicts_service
    try:
        # Scheduled export service
        scheduled_export_service = ScheduledExportService(db)
        scheduled_export_service.start()
        logger.info("✓ Scheduled export service started")
    except Exception as e:
        logger.error(f"Failed to start scheduled export service: {str(e)}")

    try:
        # Sync conflicts service
        sync_conflicts_service = SyncConflictsService(db)
        logger.info("✓ Sync conflicts service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize sync conflicts service: {str(e)}")

    try:
        # Set monitoring service for metrics API
        set_monitoring_service(monitoring_service)
        logger.info("✓ Monitoring service connected to metrics API")
    except Exception as e:
        logger.error(f"Failed to set monitoring service: {str(e)}")

    try:
        # Initialize verification API
        init_verification_api(db)
        logger.info("✓ Item verification API initialized")
    except Exception as e:
        logger.error(f"Failed to initialize verification API: {str(e)}")

    # Startup checklist verification
    startup_checklist = {
        "mongodb": False,
        "sql_server": False,
        "cache": False,
        "auth": False,
        "services": False,
    }

    # Verify MongoDB
    try:
        await db.command("ping")
        startup_checklist["mongodb"] = True
        logger.info("✓ Startup Check: MongoDB connected")
    except Exception as e:
        logger.warning(f"⚠️  Startup Check: MongoDB not connected - {str(e)}")

    # Verify SQL Server (optional)
    try:
        if sql_connector and sql_connector.test_connection():
            startup_checklist["sql_server"] = True
            logger.info("✓ Startup Check: SQL Server connected")
        else:
            logger.info("ℹ️  Startup Check: SQL Server not configured (optional)")
    except Exception as e:
        logger.info(f"ℹ️  Startup Check: SQL Server not available - {str(e)}")

    # Verify Cache
    try:
        cache_stats = await cache_service.get_stats()
        logger.info(f"✓ Startup Check: Cache initialized ({cache_stats.get('backend', 'unknown')})")
    except Exception as e:
        logger.warning(f"⚠️ Startup Check: Cache service warning: {str(e)}")

    # Verify Auth
    try:
        from backend.auth.dependencies import auth_deps

        if auth_deps._initialized:
            startup_checklist["auth"] = True
            logger.info("✓ Startup Check: Auth initialized")
    except Exception as e:
        logger.warning(f"⚠️  Startup Check: Auth error - {str(e)}")

    # Verify Services
    services_running = []
    if erp_sync_service:
        services_running.append("ERP Sync")
    if scheduled_export_service:
        services_running.append("Scheduled Export")
    if sync_conflicts_service:
        services_running.append("Sync Conflicts")
    if monitoring_service:
        services_running.append("Monitoring")
    if database_health_service:
        services_running.append("Database Health")

    if services_running:
        startup_checklist["services"] = True
        logger.info(f"✓ Startup Check: {len(services_running)} services running")

    # Log startup summary
    critical_services = ["mongodb", "auth"]
    all_critical_ok = all(startup_checklist[svc] for svc in critical_services)

    if all_critical_ok:
        logger.info("✅ Startup Checklist: All critical services OK")
    else:
        failed = [svc for svc in critical_services if not startup_checklist[svc]]
        logger.warning(f"⚠️  Startup Checklist: Critical services failed - {', '.join(failed)}")

    logger.info("OK: Application startup complete")

    yield

    # Shutdown with timeout handling
    logger.info("🛑 Shutting down application...")
    shutdown_start = time.time()
    shutdown_timeout = 30  # 30 seconds max for graceful shutdown

    shutdown_tasks = []

    # Stop sync services
    if erp_sync_service is not None:
        erp_sync = erp_sync_service  # Type narrowing for Pyright

        async def stop_erp_sync():
            try:
                erp_sync.stop()
                logger.info("✓ ERP sync service stopped")
            except Exception as e:
                logger.error(f"Error stopping ERP sync service: {str(e)}")

        shutdown_tasks.append(stop_erp_sync())

    # Stop scheduled export service
    if scheduled_export_service:

        async def stop_export_service():
            try:
                scheduled_export_service.stop()
                logger.info("✓ Scheduled export service stopped")
            except Exception as e:
                logger.error(f"Error stopping scheduled export service: {str(e)}")

        shutdown_tasks.append(stop_export_service())

    # Stop database health monitoring
    async def stop_health_monitoring():
        try:
            database_health_service.stop()
            logger.info("✓ Database health monitoring stopped")
        except Exception as e:
            logger.error(f"Error stopping database health monitoring: {str(e)}")

    shutdown_tasks.append(stop_health_monitoring())

    # Stop auto-sync manager
    async def stop_auto_sync():
        global auto_sync_manager
        if auto_sync_manager:
            try:
                await auto_sync_manager.stop()
                logger.info("✅ Auto-sync manager stopped")
            except Exception as e:
                logger.error(f"Error stopping auto-sync manager: {e}")

    shutdown_tasks.append(stop_auto_sync())

    # Execute shutdown tasks with timeout
    try:
        import asyncio

        await asyncio.wait_for(
            asyncio.gather(*shutdown_tasks, return_exceptions=True),
            timeout=shutdown_timeout,
        )
    except asyncio.TimeoutError:
        logger.warning(f"⚠️  Shutdown timeout after {shutdown_timeout}s, forcing shutdown...")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")

    # Close connection pool (blocking operation)
    if connection_pool:
        try:
            connection_pool.close_all()
            logger.info("✓ Connection pool closed")
        except Exception as e:
            logger.error(f"Error closing connection pool: {str(e)}")

    # Close MongoDB connection
    try:
        client.close()
        logger.info("✓ MongoDB connection closed")
    except Exception as e:
        logger.error(f"Error closing MongoDB connection: {str(e)}")

    shutdown_duration = time.time() - shutdown_start
    logger.info(f"✓ Application shutdown complete (took {shutdown_duration:.2f}s)")


# Create FastAPI app with lifespan
app = FastAPI(
    title=getattr(settings, "APP_NAME", "Stock Count API"),
    description="Stock counting and ERP sync API",
    version=getattr(settings, "APP_VERSION", "1.0.0"),
    lifespan=lifespan,
)

# SECURITY FIX: Configure CORS with specific origins instead of wildcard
# Configure CORS from settings with environment-aware defaults
_env = getattr(settings, "ENVIRONMENT", "development").lower()
if getattr(settings, "CORS_ALLOW_ORIGINS", None):
    _allowed_origins = [o.strip() for o in settings.CORS_ALLOW_ORIGINS.split(",") if o.strip()]
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
        dev_origins = [o.strip() for o in settings.CORS_DEV_ORIGINS.split(",") if o.strip()]
        _allowed_origins.extend(dev_origins)
        logger.info(f"Added {len(dev_origins)} additional CORS origins from CORS_DEV_ORIGINS")
else:
    _allowed_origins = []
    if not getattr(settings, "CORS_ALLOW_ORIGINS", None):
        logger.warning("CORS_ALLOW_ORIGINS not configured for non-development environment; requests may be blocked")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Request-ID"
    ],
)

# Create API router
api_router = APIRouter()

# Register all routers with the app
app.include_router(health_router)  # Health check endpoints at /health/*
app.include_router(permissions_router, prefix="/api")  # Permissions management
app.include_router(exports_router, prefix="/api")  # Export functionality
app.include_router(sync_conflicts_router, prefix="/api")  # Sync conflict handling
app.include_router(metrics_router, prefix="/api")  # Metrics and monitoring
app.include_router(sync_router, prefix="/api")  # Sync status
app.include_router(sync_management_router, prefix="/api")  # Sync management
app.include_router(mapping_router, prefix="/api")  # API mappings
app.include_router(self_diagnosis_router, prefix="/api")  # Self-diagnosis tools
app.include_router(security_router)  # Security dashboard (has its own prefix)
app.include_router(verification_router)
# Import and include Notes API router locally to avoid top-level import churn
try:
    from backend.api.notes_api import router as notes_router  # type: ignore
    app.include_router(notes_router, prefix="/api")  # Notes feature
except Exception as _e:
    logger.warning(f"Notes API router not available: {_e}")

# Include API v2 router (upgraded endpoints)
try:
    from backend.api.v2 import v2_router
    app.include_router(v2_router)
    logger.info("✓ API v2 router registered")
except Exception as e:
    logger.warning(f"API v2 router not available: {e}")

# Include routes defined on api_router
app.include_router(api_router, prefix="/api")

# Import JSONResponse and traceback for error handling
from fastapi.responses import JSONResponse
import traceback


# Pydantic Models
class ERPItem(BaseModel):
    item_code: str
    item_name: str
    barcode: str
    stock_qty: float
    mrp: float
    category: Optional[str] = None
    subcategory: Optional[str] = None
    warehouse: Optional[str] = None
    uom_code: Optional[str] = None
    uom_name: Optional[str] = None
    floor: Optional[str] = None
    rack: Optional[str] = None
    verified: Optional[bool] = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    last_scanned_at: Optional[datetime] = None


class UserInfo(BaseModel):
    id: str
    username: str
    full_name: str
    role: str
    email: Optional[str] = None
    is_active: bool = True
    permissions: List[str] = Field(default_factory=list)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    role: str


class UserLogin(BaseModel):
    username: str
    password: str


class CorrectionReason(BaseModel):
    code: str
    description: str


class PhotoProof(BaseModel):
    photo_base64: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = None


class CorrectionMetadata(BaseModel):
    correction_type: str
    original_value: Optional[float] = None
    corrected_value: Optional[float] = None
    approved_by: Optional[str] = None


class CountLineCreate(BaseModel):
    session_id: str
    item_code: str
    counted_qty: float
    damaged_qty: Optional[float] = 0
    item_condition: Optional[str] = None
    floor_no: Optional[str] = None
    rack_no: Optional[str] = None
    mark_location: Optional[str] = None
    sr_no: Optional[str] = None
    manufacturing_date: Optional[str] = None
    variance_reason: Optional[str] = None
    variance_note: Optional[str] = None
    remark: Optional[str] = None
    photo_base64: Optional[str] = None
    mrp_counted: Optional[float] = None
    split_section: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    correction_reason: Optional[CorrectionReason] = None
    photo_proofs: Optional[List[PhotoProof]] = None
    correction_metadata: Optional[CorrectionMetadata] = None


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    warehouse: str
    staff_user: str
    staff_name: str
    status: str = "OPEN"  # OPEN, RECONCILE, CLOSED
    started_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    total_items: int = 0
    total_variance: float = 0


class SessionCreate(BaseModel):
    warehouse: str


class UnknownItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    barcode: Optional[str] = None
    description: str
    counted_qty: float
    photo_base64: Optional[str] = None
    remark: Optional[str] = None
    reported_by: str
    reported_at: datetime = Field(default_factory=datetime.utcnow)


class UnknownItemCreate(BaseModel):
    session_id: str
    barcode: Optional[str] = None
    description: str
    counted_qty: float
    photo_base64: Optional[str] = None
    remark: Optional[str] = None


# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash using multiple fallback strategies.

    Args:
        plain_password: The plain text password to verify
        hashed_password: The hashed password to compare against

    Returns:
        True if password matches, False otherwise
    """
    if not plain_password or not hashed_password:
        logger.warning("Empty password or hash provided")
        return False

    # Bcrypt has a 72-byte limit, truncate if necessary
    password_bytes = plain_password.encode("utf-8")
    if len(password_bytes) > 72:
        logger.warning("Password exceeds 72 bytes, truncating")
        plain_password = plain_password[:72]
        password_bytes = plain_password.encode("utf-8")

    # Strategy 1: Try passlib CryptContext (supports multiple schemes)
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        if result:
            logger.debug("Password verified using passlib CryptContext")
        return result
    except Exception as e:
        logger.debug(f"Passlib verification failed: {type(e).__name__}: {str(e)}")

    # Strategy 2: Direct bcrypt verification (fallback)
    try:
        import bcrypt

        if isinstance(hashed_password, str):
            hash_bytes = hashed_password.encode("utf-8")
            result = bcrypt.checkpw(password_bytes, hash_bytes)
            if result:
                logger.debug("Password verified using direct bcrypt")
            return result
        else:
            logger.error(f"Password hash is not a string: {type(hashed_password)}")
            return False
    except ImportError:
        logger.error("bcrypt module not available - password verification cannot proceed")
        return False
    except Exception as e:
        logger.error(f"Direct bcrypt verification failed: {type(e).__name__}: {str(e)}")
        return False


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
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
        ]
        await db.erp_items.insert_many(mock_items)
        logging.info("Mock ERP data initialized")


# Routes
@api_router.post("/auth/register", response_model=TokenResponse, status_code=201)
async def register(user: UserRegister):
    try:
        # Check if user exists
        existing = await db.users.find_one({"username": user.username})
        if existing:
            error = get_error_message("AUTH_USERNAME_EXISTS", {"username": user.username})
            logger.warning(f"Registration attempt with existing username: {sanitize_for_logging(user.username)}")
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
        user_doc = {
            "username": user.username,
            "hashed_password": hashed_password,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": True,
            "permissions": [],
            "created_at": datetime.utcnow(),
        }
        insert_result = await db.users.insert_one(user_doc)
        user_doc["_id"] = insert_result.inserted_id
        logger.info(f"User registered: {sanitize_for_logging(user.username)} ({sanitize_for_logging(user.role)})")

        # Create access and refresh tokens
        access_token = refresh_token_service.create_access_token(
            {"sub": user.username, "role": user.role}
        )
        refresh_token = refresh_token_service.create_refresh_token(
            {"sub": user.username, "role": user.role}
        )

        # Store refresh token in database
        expires_at = datetime.utcnow() + timedelta(days=30)
        await refresh_token_service.store_refresh_token(refresh_token, user.username, expires_at)

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
        error = get_error_message("UNKNOWN_ERROR", {"operation": "register", "error": str(e)})
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


@api_router.post("/auth/login", response_model=ApiResponse[TokenResponse])
@result_to_response(success_status=200)
async def login(credentials: UserLogin, request: Request) -> Result[Dict[str, Any], Exception]:
    """
    User login endpoint with enhanced security and monitoring.

    Validates user credentials and returns an access token with refresh token.
    Implements rate limiting, IP tracking, and detailed logging.
    """
    try:
        logger.info("=== LOGIN ATTEMPT START ===")
        logger.info(f"Username: {sanitize_for_logging(credentials.username)}")

        client_ip = request.client.host if request.client else ""
        logger.info(f"Client IP: {client_ip}")

        # Check rate limiting
        logger.debug(f"Checking rate limit for IP: {client_ip}")
        rate_limit_result = await check_rate_limit(client_ip)
        if rate_limit_result.is_err:
            # Extract error from Result type
            err = None
            if hasattr(rate_limit_result, "unwrap_err"):
                try:
                    err = rate_limit_result.unwrap_err()
                except Exception:
                    pass
            if err is None:
                err = getattr(rate_limit_result, "err", None)
            if err is None:
                err = getattr(rate_limit_result, "_error", None)
            if err is None:
                err = RateLimitExceededError("Rate limit exceeded")

            logger.warning(f"Rate limit exceeded for {client_ip}: {str(err)}")
            # Return proper RateLimitExceededError
            if isinstance(err, RateLimitExceededError):
                return Fail(err)
            return Fail(RateLimitExceededError(str(err)))
        logger.debug("Rate limit check passed")

        # Find user by username
        logger.info(f"Finding user: {credentials.username}")
        user_result = await find_user_by_username(credentials.username)
        if user_result.is_err:
            logger.error("User not found")
            await log_failed_login_attempt(
                username=credentials.username,
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent"),
                error="User not found",
            )
            return Fail(AuthenticationError("Incorrect username or password"))

        user = user_result.unwrap()
        logger.info("User found")

        # Verify password
        logger.info("Verifying password...")
        hashed_pwd = user.get("hashed_password") or user.get("password")  # Legacy fallback
        if not hashed_pwd:
            logger.error("No hashed_password or password field found!")
            return Fail(AuthenticationError("User account is corrupted. Please contact support."))

        # Verify password with comprehensive error handling
        password_valid = False
        try:
            password_valid = verify_password(credentials.password, hashed_pwd)
        except Exception as e:
            logger.error(f"Password verification raised exception: {type(e).__name__}: {str(e)}")
            password_valid = False

        if not password_valid:
            logger.error("Password verification failed")
            await log_failed_login_attempt(
                username=credentials.username,
                ip_address=client_ip,
                user_agent=request.headers.get("user-agent"),
                error="Invalid password",
            )
            return Fail(AuthenticationError("Incorrect username or password"))

        # Auto-migrate legacy cleartext password field to hashed_password
        if "password" in user and "hashed_password" not in user:
            try:
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {
                        "$set": {"hashed_password": get_password_hash(credentials.password)},
                        "$unset": {"password": ""},
                    },
                )
                logger.info("User password field migrated to hashed_password")
            except Exception as migrate_err:
                logger.warning(f"Failed to migrate legacy password field: {str(migrate_err)}")

        logger.info("Password verified successfully")

        # Check if user is active
        if not user.get("is_active", True):
            logger.error("User account is deactivated")
            return Fail(AuthorizationError("Account is deactivated. Please contact support."))

        logger.info("Generating tokens...")
        # Generate tokens
        tokens_result = await generate_auth_tokens(user, client_ip, request)
        if tokens_result.is_err:
            logger.error(f"Token generation failed: {tokens_result}")
            return tokens_result

        tokens = tokens_result.unwrap()
        logger.info("Tokens generated successfully")

        # Log successful login
        await log_successful_login(user, client_ip, request)

        # Reset failed login attempts counter
        await cache_service.delete("login_attempts", client_ip)

        logger.info("=== LOGIN SUCCESS ===")
        # Prepare response - @result_to_response decorator will wrap this in ApiResponse
        return Ok(
            {
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
        )
    except Exception as e:
        logger.error("=== LOGIN EXCEPTION ===")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Exception message: {str(e)}")
        logger.error("Traceback:", exc_info=True)
        return Fail(e)


# Helper functions for login
async def check_rate_limit(ip_address: str) -> Result[None, Exception]:
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


async def find_user_by_username(username: str) -> Result[Dict[str, Any], Exception]:
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
    user: Dict[str, Any], ip_address: str, request: Request
) -> Result[Dict[str, Any], Exception]:
    """Generate access and refresh tokens with error handling."""
    try:
        # Generate access token
        access_token_expires = timedelta(minutes=getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 15))
        access_token = create_access_token({"sub": user["username"], "role": user.get("role", "staff")})

        # Generate refresh token using service
        refresh_payload = {"sub": user["username"], "role": user.get("role", "staff")}
        refresh_token = refresh_token_service.create_refresh_token(refresh_payload)
        refresh_token_expires = datetime.utcnow() + timedelta(days=getattr(settings, "REFRESH_TOKEN_EXPIRE_DAYS", 30))

        # Store refresh token via service
        await refresh_token_service.store_refresh_token(refresh_token, user["username"], refresh_token_expires)

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


async def log_successful_login(user: Dict[str, Any], ip_address: str, request: Request) -> None:
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


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    from backend.auth.permissions import get_user_permissions

    return {
        "username": current_user["username"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "permissions": get_user_permissions(current_user),
        "is_active": current_user.get("is_active", True),
    }


@api_router.post("/auth/refresh", response_model=ApiResponse[TokenResponse])
@result_to_response(success_status=200)
async def refresh_token(request: Request) -> Result[Dict[str, Any], Exception]:
    """
    Refresh access token using refresh token.

    Request body should contain: {"refresh_token": "uuid-string"}
    """
    try:
        body = await request.json()
        refresh_token = body.get("refresh_token")

        if not refresh_token:
            return Fail(ValidationError("Refresh token is required"))

        # Find refresh token in database
        token_doc = await db.refresh_tokens.find_one({"token": refresh_token, "is_revoked": False})

        if not token_doc:
            return Fail(AuthenticationError("Invalid or expired refresh token"))

        # Check if token is expired
        if token_doc["expires_at"] < datetime.utcnow():
            return Fail(AuthenticationError("Refresh token has expired"))

        # Get user
        user = await db.users.find_one({"_id": token_doc["user_id"]})
        if not user:
            return Fail(AuthenticationError("User not found"))

        if not user.get("is_active", True):
            return Fail(AuthorizationError("Account is deactivated"))

        # Generate new access token
        access_token = create_access_token({"sub": user["username"]})

        # Update last_used_at for refresh token
        await db.refresh_tokens.update_one(
            {"token": refresh_token}, {"$set": {"last_used_at": datetime.utcnow()}}
        )

        # Return new tokens
        return Ok(
            {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": 900,  # 15 minutes
                "refresh_token": refresh_token,  # Same refresh token
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
        )
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return Fail(e)


@api_router.post("/auth/logout")
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Logout user by revoking their refresh token.

    Request body should contain: {"refresh_token": "uuid-string"}
    """
    try:
        body = await request.json()
        refresh_token = body.get("refresh_token")

        if refresh_token:
            # Revoke the refresh token
            await db.refresh_tokens.update_one(
                {"token": refresh_token, "user_id": current_user["_id"]},
                {"$set": {"is_revoked": True, "revoked_at": datetime.utcnow()}},
            )

        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(status_code=500, detail="Logout failed")


# Session routes
@api_router.post("/sessions", response_model=Session)
async def create_session(
    request: Request,
    session_data: SessionCreate,
    current_user: dict = Depends(get_current_user),
):
    # Input validation and sanitization
    warehouse = session_data.warehouse.strip()
    if not warehouse:
        raise HTTPException(status_code=400, detail="Warehouse name cannot be empty")
    if len(warehouse) < 2:
        raise HTTPException(status_code=400, detail="Warehouse name must be at least 2 characters")
    if len(warehouse) > 100:
        raise HTTPException(status_code=400, detail="Warehouse name must be less than 100 characters")
    # Sanitize warehouse name (remove potentially dangerous characters)
    warehouse = warehouse.replace('<', '').replace('>', '').replace('"', '').replace("'", '')
    
    session = Session(
        warehouse=warehouse,
        staff_user=current_user["username"],
        staff_name=current_user["full_name"],
    )
    await db.sessions.insert_one(session.model_dump())

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


@api_router.get("/sessions", response_model=Dict[str, Any])
async def get_sessions(
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
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
    session_ids: List[str], current_user: dict = Depends(get_current_user)
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
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/sessions/bulk/reconcile")
async def bulk_reconcile_sessions(
    session_ids: List[str], current_user: dict = Depends(get_current_user)
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
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/sessions/bulk/export")
async def bulk_export_sessions(
    session_ids: List[str],
    format: str = "excel",
    current_user: dict = Depends(get_current_user),
):
    """Bulk export sessions (supervisor only)"""
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        sessions = []
        for session_id in session_ids:
            session = await db.sessions.find_one({"id": session_id})
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
        raise HTTPException(status_code=500, detail=str(e))


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
        by_date = await db.sessions.aggregate(date_pipeline).to_list(None)
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
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/sessions/{session_id}")
async def get_session_by_id(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific session by ID"""
    try:
        session = await db.sessions.find_one({"id": session_id})

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Check permissions
        if current_user["role"] != "supervisor" and session.get("staff_user") != current_user["username"]:
            raise HTTPException(status_code=403, detail="Access denied")

        return Session(**session)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/variance-reasons")
async def get_variance_reasons(
    current_user: dict = Depends(get_current_user),
):
    """Get list of variance reasons"""
    # Return common variance reasons
    return {
        "reasons": [
            {"id": "damaged", "label": "Damaged"},
            {"id": "expired", "label": "Expired"},
            {"id": "theft", "label": "Theft"},
            {"id": "misplaced", "label": "Misplaced"},
            {"id": "data_entry_error", "label": "Data Entry Error"},
            {"id": "supplier_shortage", "label": "Supplier Shortage"},
            {"id": "other", "label": "Other"},
        ]
    }



# ERP Item routes
@api_router.get("/erp/items/barcode/{barcode}")
async def get_item_by_barcode(barcode: str, current_user: dict = Depends(get_current_user)):
    # Try cache first
    cached = await cache_service.get("items", barcode)
    if cached:
        return ERPItem(**cached)

    # Check if SQL Server is configured
    config = await db.erp_config.find_one({})

    # Establish connection if not connected yet
    if config and config.get("use_sql_server", False):
        if not sql_connector.test_connection():
            # Try to establish connection using config
            try:
                host = config.get("host") or os.getenv("SQL_SERVER_HOST")
                port = config.get("port") or int(os.getenv("SQL_SERVER_PORT", 1433))
                database = config.get("database") or os.getenv("SQL_SERVER_DATABASE")
                user = config.get("user") or os.getenv("SQL_SERVER_USER")
                password = config.get("password") or os.getenv("SQL_SERVER_PASSWORD")

                if host and database:
                    sql_connector.connect(host, port, database, user, password)
            except Exception as e:
                logger.warning(f"Failed to establish SQL Server connection: {str(e)}")

    if config and config.get("use_sql_server", False) and sql_connector.test_connection():
        # Fetch from SQL Server (Polosys ERP)
        try:
            # Normalize barcode for 6-digit manual barcodes
            normalized_barcode = barcode.strip()
            barcode_variations = [normalized_barcode]

            # If barcode is numeric, try 6-digit format variations
            if normalized_barcode.isdigit():
                # Pad to 6 digits if less than 6
                if len(normalized_barcode) < 6:
                    padded = normalized_barcode.zfill(6)
                    barcode_variations.append(padded)
                    logger.info(
                        f"Trying padded 6-digit barcode: {padded} (from {normalized_barcode})"
                    )

                # Try exact 6-digit format
                if len(normalized_barcode) != 6:
                    # If more than 6 digits, try trimming leading zeros
                    trimmed = normalized_barcode.lstrip("0")
                    if trimmed and len(trimmed) <= 6:
                        padded_trimmed = trimmed.zfill(6)
                        barcode_variations.append(padded_trimmed)
                        logger.info(
                            f"Trying trimmed 6-digit barcode: {padded_trimmed} (from {normalized_barcode})"
                        )

            # Try each barcode variation
            item = None
            tried_barcodes = []
            for barcode_variant in barcode_variations:
                tried_barcodes.append(barcode_variant)
                item = sql_connector.get_item_by_barcode(barcode_variant)
                if item:
                    logger.info(
                        f"Found item with barcode variant: {barcode_variant} (original: {barcode})"
                    )
                    # Keep original barcode in response
                    item["barcode"] = normalized_barcode
                    break

            if not item:
                error = get_error_message("ERP_ITEM_NOT_FOUND", {"barcode": barcode})
                logger.warning(
                    f"Item not found in ERP: barcode={barcode}, tried variations: {tried_barcodes}"
                )
                raise HTTPException(
                    status_code=error["status_code"],
                    detail={
                        "message": error["message"],
                        "detail": f"{error['detail']} Barcode: {barcode}. Tried variations: {', '.join(tried_barcodes)}",
                        "code": error["code"],
                        "category": error["category"],
                        "barcode": barcode,
                        "tried_variations": tried_barcodes,
                    },
                )

            # Ensure all required fields exist with defaults
            item_data = {
                "item_code": item.get("item_code", ""),
                "item_name": item.get("item_name", ""),
                "barcode": item.get("barcode", barcode),
                "stock_qty": float(item.get("stock_qty", 0.0)),
                "mrp": float(item.get("mrp", 0.0)),
                "category": item.get("category", "General"),
                "subcategory": item.get("subcategory", ""),
                "warehouse": item.get("warehouse", "Main"),
                "uom_code": item.get("uom_code", ""),
                "uom_name": item.get("uom_name", ""),
                "floor": item.get("floor", ""),
                "rack": item.get("rack", ""),
            }

            # Cache for 1 hour
            await cache_service.set("items", barcode, item_data, ttl=3600)
            logger.info(f"Item fetched from ERP: {item_data.get('item_code')} (barcode: {barcode})")

            return ERPItem(**item_data)
        except HTTPException:
            raise
        except Exception as e:
            error = get_error_message("ERP_QUERY_FAILED", {"barcode": barcode, "error": str(e)})
            logger.error(f"ERP query error for barcode {barcode}: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=error["status_code"],
                detail={
                    "message": error["message"],
                    "detail": f"{error['detail']} Barcode: {barcode}. Error: {str(e)}",
                    "code": error["code"],
                    "category": error["category"],
                    "barcode": barcode,
                },
            )
    else:
        # Fallback to MongoDB cache
        item = await db.erp_items.find_one({"barcode": barcode})
        if not item:
            error = get_error_message("DB_ITEM_NOT_FOUND", {"barcode": barcode})
            logger.warning(f"Item not found in MongoDB cache: barcode={barcode}")
            raise HTTPException(
                status_code=error["status_code"],
                detail={
                    "message": error["message"],
                    "detail": f"{error['detail']} Barcode: {barcode}. Note: ERP system is not configured, using cached data.",
                    "code": error["code"],
                    "category": error["category"],
                    "barcode": barcode,
                    "source": "mongodb_cache",
                },
            )

        # Cache for 1 hour
        await cache_service.set("items", barcode, item, ttl=3600)
        logger.debug(f"Item fetched from MongoDB cache: barcode={barcode}")

        return ERPItem(**item)


@api_router.post("/erp/items/{item_code}/refresh-stock")
async def refresh_item_stock(
    request: Request, item_code: str, current_user: dict = Depends(get_current_user)
):
    """
    Refresh item stock from ERP and update MongoDB
    Fetches latest stock quantity from SQL Server and updates MongoDB
    """
    # Check if SQL Server is configured
    config = await db.erp_config.find_one({})

    # Establish connection if not connected yet
    if config and config.get("use_sql_server", False):
        if not sql_connector.test_connection():
            # Try to establish connection using config
            try:
                host = config.get("host") or os.getenv("SQL_SERVER_HOST")
                port = config.get("port") or int(os.getenv("SQL_SERVER_PORT", 1433))
                database = config.get("database") or os.getenv("SQL_SERVER_DATABASE")
                user = config.get("user") or os.getenv("SQL_SERVER_USER")
                password = config.get("password") or os.getenv("SQL_SERVER_PASSWORD")

                if host and database:
                    sql_connector.connect(host, port, database, user, password)
            except Exception as e:
                logger.warning(f"Failed to establish SQL Server connection: {str(e)}")

    if config and config.get("use_sql_server", False) and sql_connector.test_connection():
        # Fetch from SQL Server (Polosys ERP)
        try:
            # Try by item code first
            item = sql_connector.get_item_by_code(item_code)

            # If not found by code, try to get from MongoDB first to get barcode
            if not item:
                mongo_item = await db.erp_items.find_one({"item_code": item_code})
                if mongo_item and mongo_item.get("barcode"):
                    item = sql_connector.get_item_by_barcode(mongo_item.get("barcode"))

            if not item:
                error = get_error_message("ERP_ITEM_NOT_FOUND", {"item_code": item_code})
                raise HTTPException(
                    status_code=error["status_code"],
                    detail={
                        "message": error["message"],
                        "detail": f"{error['detail']} Item Code: {item_code}",
                        "code": error["code"],
                        "category": error["category"],
                    },
                )

            # Prepare updated item data
            item_data = {
                "item_code": item.get("item_code", item_code),
                "item_name": item.get("item_name", ""),
                "barcode": item.get("barcode", ""),
                "stock_qty": float(item.get("stock_qty", 0.0)),
                "mrp": float(item.get("mrp", 0.0)),
                "category": item.get("category", "General"),
                "subcategory": item.get("subcategory", ""),
                "warehouse": item.get("warehouse", "Main"),
                "uom_code": item.get("uom_code", ""),
                "uom_name": item.get("uom_name", ""),
                "floor": item.get("floor", ""),
                "rack": item.get("rack", ""),
                "synced_at": datetime.utcnow(),
                "synced_from_erp": True,
                "last_erp_update": datetime.utcnow(),
            }

            # Update MongoDB
            await db.erp_items.update_one(
                {"item_code": item_code},
                {"$set": item_data, "$setOnInsert": {"created_at": datetime.utcnow()}},
                upsert=True,
            )

            # Clear cache
            await cache_service.delete("items", item_data.get("barcode", ""))

            logger.info(f"Stock refreshed from ERP: {item_code} - Stock: {item_data['stock_qty']}")

            return {
                "success": True,
                "item": ERPItem(**item_data),
                "message": f"Stock updated: {item_data['stock_qty']}",
            }

        except HTTPException:
            raise
        except Exception as e:
            error = get_error_message("ERP_CONNECTION_ERROR", {"error": str(e)})
            logger.error(f"Failed to refresh stock from ERP: {str(e)}")
            raise HTTPException(
                status_code=error["status_code"],
                detail={
                    "message": error["message"],
                    "detail": f"Failed to refresh stock: {str(e)}",
                    "code": error["code"],
                    "category": error["category"],
                },
            )
    else:
        # Fallback: Get from MongoDB
        item = await db.erp_items.find_one({"item_code": item_code})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        return {
            "success": True,
            "item": ERPItem(**item),
            "message": "Stock from MongoDB (ERP connection not available)",
        }


@api_router.get("/erp/items")
async def get_all_items(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
):
    """
    Get all items or search items
    - If search parameter is provided, search SQL Server or MongoDB
    - Otherwise, return all items from MongoDB
    """
    # If search query provided, search items
    if search and search.strip():
        search_term = search.strip()

        # Check if SQL Server is configured
        config = await db.erp_config.find_one({})

        # Establish connection if not connected yet
        if config and config.get("use_sql_server", False):
            if not sql_connector.test_connection():
                # Try to establish connection using config
                try:
                    host = config.get("host") or os.getenv("SQL_SERVER_HOST")
                    port = config.get("port") or int(os.getenv("SQL_SERVER_PORT", 1433))
                    database = config.get("database") or os.getenv("SQL_SERVER_DATABASE")
                    user = config.get("user") or os.getenv("SQL_SERVER_USER")
                    password = config.get("password") or os.getenv("SQL_SERVER_PASSWORD")

                    if host and database:
                        sql_connector.connect(host, port, database, user, password)
                except Exception as e:
                    logger.warning(f"Failed to establish SQL Server connection: {str(e)}")

        if config and config.get("use_sql_server", False) and sql_connector.test_connection():
            # Search in SQL Server (Polosys ERP)
            try:
                items = sql_connector.search_items(search_term)

                # Convert to ERPItem format and apply pagination
                result_items = []
                for item in items:
                    item_data = {
                        "item_code": item.get("item_code", ""),
                        "item_name": item.get("item_name", ""),
                        "barcode": item.get("barcode", ""),
                        "stock_qty": float(item.get("stock_qty", 0.0)),
                        "mrp": float(item.get("mrp", 0.0)),
                        "category": item.get("category", "General"),
                        "warehouse": item.get("warehouse", "Main"),
                        "uom_code": item.get("uom_code", ""),
                        "uom_name": item.get("uom_name", ""),
                    }
                    result_items.append(ERPItem(**item_data))

                # Apply client-side pagination for SQL results
                total = len(result_items)
                skip = (page - 1) * page_size
                paginated_items = result_items[skip : skip + page_size]

                return {
                    "items": paginated_items,
                    "pagination": {
                        "page": page,
                        "page_size": page_size,
                        "total": total,
                        "total_pages": (total + page_size - 1) // page_size,
                        "has_next": skip + page_size < total,
                        "has_prev": page > 1,
                    },
                }
            except Exception as e:
                logger.error(f"ERP search error: {str(e)}")
                # Fallback to MongoDB search
                pass

        # Fallback: Search in MongoDB
        items_cursor = db.erp_items.find(
            {
                "$or": [
                    {"item_name": {"$regex": search_term, "$options": "i"}},
                    {"item_code": {"$regex": search_term, "$options": "i"}},
                    {"barcode": {"$regex": search_term, "$options": "i"}},
                ]
            }
        )
        total = await db.erp_items.count_documents(
            {
                "$or": [
                    {"item_name": {"$regex": search_term, "$options": "i"}},
                    {"item_code": {"$regex": search_term, "$options": "i"}},
                    {"barcode": {"$regex": search_term, "$options": "i"}},
                ]
            }
        )
        skip = (page - 1) * page_size
        items = await items_cursor.skip(skip).limit(page_size).to_list(page_size)

        # Ensure all items have required fields with defaults
        normalized_items = []
        for item in items:
            if "category" not in item:
                item["category"] = "General"
            if "warehouse" not in item:
                item["warehouse"] = "Main"
            normalized_items.append(item)

        return {
            "items": [ERPItem(**item) for item in normalized_items],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
                "has_next": skip + page_size < total,
                "has_prev": page > 1,
            },
        }

    # No search: return all items from MongoDB with pagination
    total = await db.erp_items.count_documents({})
    skip = (page - 1) * page_size
    items_cursor = db.erp_items.find().sort("item_name", 1).skip(skip).limit(page_size)
    items = await items_cursor.to_list(page_size)

    return {
        "items": [ERPItem(**item) for item in items],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": skip + page_size < total,
            "has_prev": page > 1,
        },
    }


@api_router.get("/items/search")
async def search_items_compatibility(
    query: Optional[str] = Query(None, description="Search term (legacy param 'query')"),
    search: Optional[str] = Query(None, description="Alternate search param"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user),
):
    """
    Compatibility endpoint for legacy clients that call `/api/items/search?query=...`.
    Reuses the new `/api/erp/items?search=...` implementation.
    """
    search_term = (query or search or "").strip()
    if not search_term:
        raise HTTPException(
            status_code=400,
            detail="Missing search term. Provide ?query= or ?search= parameter.",
        )

    return await get_all_items(
        search=search_term,
        current_user=current_user,
        page=page,
        page_size=page_size,
    )


# Helper function to detect high-risk corrections
def detect_risk_flags(erp_item: dict, line_data: CountLineCreate, variance: float) -> List[str]:
    """Detect high-risk correction patterns"""
    risk_flags = []

    # Get values
    erp_qty = erp_item.get("stock_qty", 0)
    counted_qty = line_data.counted_qty
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
    session = await db.sessions.find_one({"id": line_data.session_id})
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

    result = await db.count_lines.insert_one(count_line)

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
        stats = await db.count_lines.aggregate(pipeline).to_list(1)
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
    request: Optional[Request] = None,
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
    request: Optional[Request] = None,
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
    filter_query: Dict[str, Any] = {"session_id": session_id}

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


@api_router.put("/count-lines/{line_id}/approve")
async def approve_count_line(
    line_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Approve a count line variance."""
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    try:
        result = await db.count_lines.update_one(
            {"_id": ObjectId(line_id)},
            {
                "$set": {
                    "status": "APPROVED",
                    "approval_status": "approved",
                    "approved_by": current_user["username"],
                    "approved_at": datetime.utcnow(),
                    "verified": True,
                    "verified_by": current_user["username"],
                    "verified_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Count line not found")
            
        return {"success": True, "message": "Count line approved"}
    except Exception as e:
        logger.error(f"Error approving count line {line_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.put("/count-lines/{line_id}/reject")
async def reject_count_line(
    line_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Reject a count line (request recount)."""
    if current_user["role"] not in ["supervisor", "admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
        
    try:
        result = await db.count_lines.update_one(
            {"_id": ObjectId(line_id)},
            {
                "$set": {
                    "status": "REJECTED",
                    "approval_status": "rejected",
                    "rejected_by": current_user["username"],
                    "rejected_at": datetime.utcnow(),
                    "verified": False
                }
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Count line not found")
            
        return {"success": True, "message": "Count line rejected"}
    except Exception as e:
        logger.error(f"Error rejecting count line {line_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/count-lines/check/{session_id}/{item_code}")
async def check_item_counted(
    session_id: str,
    item_code: str,
    current_user: dict = Depends(get_current_user),
):
    """Check if an item has already been counted in the session"""
    try:
        # Find all count lines for this item in this session
        cursor = db.count_lines.find({
            "session_id": session_id,
            "item_code": item_code
        })
        count_lines = await cursor.to_list(length=None)
        
        # Convert ObjectId to string
        for line in count_lines:
            line["_id"] = str(line["_id"])
            
        return {
            "already_counted": len(count_lines) > 0,
            "count_lines": count_lines
        }
    except Exception as e:
        logger.error(f"Error checking item count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/count-lines/session/{session_id}")
async def get_count_lines_route(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    verified: Optional[bool] = Query(None, description="Filter by verification status"),
):
    return await get_count_lines(
        session_id,
        current_user,
        page=page,
        page_size=page_size,
        verified=verified,
    )

# Register api_router AFTER all routes have been defined
app.include_router(api_router, prefix="/api")  # Main API endpoints with auth, sessions, items, count-lines


# Run the server if executed directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info",
        access_log=True
    )
