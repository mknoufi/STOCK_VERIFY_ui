# ruff: noqa: E402

import json
import logging
import os
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional, TypeVar, cast

import jwt
import uvicorn
from bson import ObjectId
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request

# Add project root to path for direct execution (debugging)
# This allows the file to be run directly for testing/debugging
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.api import auth, supervisor_pin  # noqa: E402
from backend.api.admin_control_api import admin_control_router  # noqa: E402
from backend.api.admin_dashboard_api import admin_dashboard_router  # noqa: E402
from backend.api.auth import router as auth_router  # noqa: E402
from backend.api.dynamic_fields_api import dynamic_fields_router  # noqa: E402
from backend.api.dynamic_reports_api import dynamic_reports_router  # noqa: E402
from backend.api.enhanced_item_api import (  # noqa: E402
    enhanced_item_router as items_router,
)
from backend.api.enhanced_item_api import init_enhanced_api  # noqa: E402
from backend.api.erp_api import init_erp_api  # noqa: E402
from backend.api.erp_api import router as erp_router  # noqa: E402
from backend.api.exports_api import exports_router  # noqa: E402
from backend.api.health import health_router, info_router  # noqa: E402
from backend.api.item_verification_api import (  # noqa: E402
    init_verification_api,
    verification_router,
)
from backend.api.locations_api import router as locations_router  # noqa: E402
from backend.api.logs_api import router as logs_router  # noqa: E402
from backend.api.mapping_api import router as mapping_router  # noqa: E402
from backend.api.metrics_api import metrics_router, set_monitoring_service  # noqa: E402

# New feature API routers
from backend.api.permissions_api import permissions_router  # noqa: E402
from backend.api.preferences_api import router as preferences_router  # noqa: E402
from backend.api.rack_api import router as rack_router  # noqa: E402
from backend.api.report_generation_api import report_generation_router  # noqa: E402
from backend.api.reporting_api import router as reporting_router  # noqa: E402
from backend.api.schemas import (  # noqa: E402
    ApiResponse,
    CountLineCreate,
    Session,
    SessionCreate,
    TokenResponse,
)
from backend.api.search_api import router as search_router  # noqa: E402
from backend.api.security_api import security_router  # noqa: E402
from backend.api.self_diagnosis_api import self_diagnosis_router  # noqa: E402
from backend.api.session_management_api import (  # noqa: E402
    router as session_mgmt_router,
)

# Phase 1-3: New Upgrade APIs
from backend.api.sync_batch_api import router as sync_batch_router  # noqa: E402

# New feature services
from backend.api.sync_conflicts_api import sync_conflicts_router  # noqa: E402
from backend.api.sync_management_api import (  # noqa: E402
    set_change_detection_service,
    sync_management_router,
)
from backend.api.sync_status_api import set_auto_sync_manager, sync_router  # noqa: E402
from backend.api.user_settings_api import router as user_settings_router  # noqa: E402
from backend.api.variance_api import router as variance_router  # noqa: E402
from backend.api.websocket_api import router as websocket_router  # noqa: E402
from backend.auth.dependencies import init_auth_dependencies  # noqa: E402
from backend.config import settings  # noqa: E402
from backend.db.indexes import create_indexes  # noqa: E402
from backend.db.migrations import MigrationManager  # noqa: E402
from backend.db.runtime import set_client, set_db  # noqa: E402
from backend.error_messages import get_error_message  # noqa: E402
from backend.services.activity_log import ActivityLogService  # noqa: E402
from backend.services.batch_operations import BatchOperationsService  # noqa: E402
from backend.services.cache_service import CacheService  # noqa: E402

# Production services
# from backend.services.connection_pool import SQLServerConnectionPool  # Legacy pool removed
from backend.services.database_health import DatabaseHealthService  # noqa: E402
from backend.services.database_optimizer import DatabaseOptimizer  # noqa: E402
from backend.services.error_log import ErrorLogService  # noqa: E402
from backend.services.errors import (  # noqa: E402
    AuthenticationError,
    AuthorizationError,
    DatabaseError,
    NotFoundError,
    RateLimitExceededError,
    ValidationError,
)
from backend.services.lock_manager import get_lock_manager  # noqa: E402
from backend.services.monitoring_service import MonitoringService  # noqa: E402
from backend.services.pubsub_service import get_pubsub_service  # noqa: E402
from backend.services.rate_limiter import (  # noqa: E402
    ConcurrentRequestHandler,
    RateLimiter,
)

# Phase 1-3: New Services
from backend.services.redis_service import close_redis, init_redis  # noqa: E402
from backend.services.refresh_token import RefreshTokenService  # noqa: E402
from backend.services.runtime import (  # noqa: E402
    set_cache_service,
    set_refresh_token_service,
)
from backend.services.scheduled_export_service import (  # noqa: E402
    ScheduledExportService,
)
from backend.services.sync_conflicts_service import SyncConflictsService  # noqa: E402
from backend.sql_server_connector import SQLServerConnector  # noqa: E402

# Utils
from backend.utils.api_utils import result_to_response  # noqa: E402
from backend.utils.api_utils import sanitize_for_logging  # noqa: E402; noqa: E402
from backend.utils.auth_utils import get_password_hash  # noqa: E402
from backend.utils.logging_config import setup_logging  # noqa: E402
from backend.utils.port_detector import PortDetector  # noqa: E402
from backend.utils.result import Fail, Ok, Result  # noqa: E402
from backend.utils.tracing import init_tracing, instrument_fastapi_app  # noqa: E402

# Initialize a fallback logger early so optional import blocks can log safely
logger = logging.getLogger("stock-verify")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# Import optional services
try:
    from backend.api.enrichment_api import enrichment_router, init_enrichment_api
    from backend.services.enrichment_service import EnrichmentService
except ImportError:
    EnrichmentService = None  # type: ignore

# Import enterprise services (optional - for enterprise features)
try:
    from backend.api.enterprise_api import enterprise_router
    from backend.services.data_governance import DataGovernanceService
    from backend.services.enterprise_audit import EnterpriseAuditService
    from backend.services.enterprise_security import EnterpriseSecurityService
    from backend.services.feature_flags import FeatureFlagService

    ENTERPRISE_AVAILABLE = True
except ImportError as e:
    ENTERPRISE_AVAILABLE = False
    enterprise_router = None  # type: ignore
    logger.info(f"Enterprise features not available: {e}")
    init_enrichment_api = None  # type: ignore # noqa: F811
    enrichment_router = None  # type: ignore # noqa: F811

# Global service instances
scheduled_export_service = None
sync_conflicts_service = None

# Setup logging
logger = setup_logging(
    log_level=settings.LOG_LEVEL,
    log_format=settings.LOG_FORMAT,
    log_file=settings.LOG_FILE or "app.log",
    app_name=settings.APP_NAME,
)

# Initialize tracing (optional, env-gated). This only configures the
# tracer provider and exporter; FastAPI is instrumented later once the
# app instance is created.
try:
    init_tracing()
except Exception:
    # Never break startup due to tracing
    pass

T = TypeVar("T")
E = TypeVar("E", bound=Exception)
R = TypeVar("R")


RUNNING_UNDER_PYTEST = "pytest" in sys.modules

ROOT_DIR = Path(__file__).parent

# Setup basic logging first (before config to catch config errors)
if not RUNNING_UNDER_PYTEST:
    logging.basicConfig(level=logging.INFO)
else:
    logging.getLogger().setLevel(logging.INFO)
logger = logging.getLogger(__name__)


# Note: sanitize_for_logging and create_safe_error_response are imported from backend.utils.api_utils (line 73)


# Load configuration with validation
# Note: settings already imported at top of file (line 68)
# Configuration validation happens during import


# Only define fallback Settings if settings is None
# Removed insecure local Settings fallback. All configuration must come from backend.config


# settings is guaranteed from backend.config


# MongoDB connection with optimization
mongo_url = settings.MONGO_URL
# Normalize trailing slash (avoid accidental DB name in URL)
mongo_url = mongo_url.rstrip("/")
# Do not append pool options to URL; keep them in client options only

mongo_client_options: dict[str, Any] = {
    "maxPoolSize": 100,
    "minPoolSize": 10,
    "maxIdleTimeMS": 45000,
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 20000,
    "socketTimeoutMS": 20000,
    "retryWrites": True,
    "retryReads": True,
}

client: AsyncIOMotorClient = AsyncIOMotorClient(
    mongo_url,
    **mongo_client_options,  # type: ignore
)
# Use DB_NAME from settings (database name should not be in URL for this setup)
db = client[settings.DB_NAME]

# Database optimizer
if not RUNNING_UNDER_PYTEST:
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
SECRET_KEY: str = cast(str, settings.JWT_SECRET)
ALGORITHM = settings.JWT_ALGORITHM
security = HTTPBearer(auto_error=False)

# Initialize production services
# Enhanced Connection pool (if using SQL Server)
connection_pool: Any = None
if (
    not RUNNING_UNDER_PYTEST
    and getattr(settings, "USE_CONNECTION_POOL", True)
    and settings.SQL_SERVER_HOST
    and settings.SQL_SERVER_DATABASE
):
    try:
        # Try to use enhanced connection pool first
        from backend.services.enhanced_connection_pool import (
            EnhancedSQLServerConnectionPool,
        )

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
    except ImportError as e:
        logging.error(f"Failed to import enhanced connection pool: {str(e)}")
        # Raise error since we don't have a fallback anymore
        raise e
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
from backend.services.auto_sync_manager import AutoSyncManager  # noqa: E402

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
async def lifespan(app: FastAPI):  # noqa: C901
    # Startup
    logger.info("🚀 Starting StockVerify application...")

    # Initialize runtime globals
    set_client(client)
    set_db(db)
    set_cache_service(cache_service)
    set_refresh_token_service(refresh_token_service)

    # Phase 1: Initialize Redis and related services
    redis_service = None
    pubsub_service = None
    try:
        logger.info("📦 Phase 1: Initializing Redis services...")
        redis_service = await init_redis()
        logger.info("✓ Redis service initialized")

        # Start Pub/Sub service
        pubsub_service = get_pubsub_service(redis_service)
        await pubsub_service.start()
        logger.info("✓ Pub/Sub service started")

        # Initialize lock manager (will be used by APIs)
        get_lock_manager(redis_service)
        logger.info("✓ Lock manager initialized")

    except Exception as e:
        logger.warning(f"⚠️ Redis services not available: {str(e)}")
        logger.warning("Multi-user locking and real-time updates will be disabled")

    # Create MongoDB indexes
    try:
        logger.info("📊 Creating MongoDB indexes...")
        index_results = await create_indexes(db)
        total_indexes = sum(index_results.values())
        logger.info(
            f"✓ MongoDB indexes created: {total_indexes} total across {len(index_results)} collections"
        )
    except Exception as e:
        logger.warning(f"⚠️ Index creation warning: {str(e)}")

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
        # MongoDB connection failed - check if we're in development mode
        error_type = type(e).__name__
        logger.error(f"❌ MongoDB is required but unavailable ({error_type}): {e}")

        # In development, allow app to run without MongoDB
        if os.getenv("ENVIRONMENT", "development").lower() in ["development", "dev"]:
            logger.warning(
                "⚠️ Running in DEVELOPMENT mode without MongoDB - some features may be limited"
            )
        else:
            logger.error(
                "Application cannot start without MongoDB. Please ensure MongoDB is running."
            )
            raise SystemExit(
                f"MongoDB is required but unavailable ({error_type}). Please start MongoDB and try again."
            ) from e

    # Initialize default users
    try:
        await init_default_users()
        logger.info("OK: Default users initialized")
    except Exception as e:
        logger.warning(
            f"Could not initialize default users (may be due to MongoDB unavailability): {str(e)}"
        )

    # Run migrations
    try:
        await migration_manager.ensure_indexes()
        await migration_manager.run_migrations()
        logger.info("OK: Migrations completed")
    except DatabaseError as e:
        logger.warning(
            f"Database error during migrations (may be due to MongoDB unavailability): {str(e)}"
        )
    except Exception as e:
        # Catch-all for migration errors (index creation failures, etc.)
        logger.warning(f"Migration error (may be due to MongoDB unavailability): {str(e)}")

    # Initialize auto-sync manager (monitors SQL Server and auto-syncs when available)
    global auto_sync_manager
    try:
        sql_configured = bool(getattr(sql_connector, "config", None))
        auto_sync_manager = AutoSyncManager(
            sql_connector=sql_connector,
            mongo_db=db,
            sync_interval=getattr(settings, "ERP_SYNC_INTERVAL", 3600),
            check_interval=30,  # Check connection every 30 seconds
            enabled=sql_configured,
        )

        if sql_configured:
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
        else:
            logger.info("Auto-sync manager disabled: SQL Server not configured")

        # Register with API router
        set_auto_sync_manager(auto_sync_manager)
    except Exception:
        logger.warning("Auto-sync manager initialization failed", exc_info=True)
        auto_sync_manager = None

    # Start ERP sync service (full sync) - legacy, kept for backward compatibility
    # if erp_sync_service:
    #     try:
    #         erp_sync_service.start()
    #         logger.info("✓ ERP sync service started")
    #     except Exception as e:
    #         logger.error(f"Failed to start ERP sync service: {str(e)}")

    # Change detection sync service is fully disabled for testing

    # Start database health monitoring
    try:
        database_health_service.start()
        logger.info("OK: Database health monitoring started")
    except Exception:
        logger.exception("Failed to start database health monitoring")

    # Initialize cache
    try:
        await cache_service.initialize()
        cache_stats = await cache_service.get_stats()
        logger.info(f"OK: Cache service initialized: {cache_stats.get('backend', 'unknown')}")
    except Exception:
        logger.warning("Cache service error", exc_info=True)

    # Initialize auth dependencies for routers (avoid circular imports)
    try:
        init_auth_dependencies(db, SECRET_KEY, ALGORITHM)
        logger.info("OK: Auth dependencies initialized")
    except Exception:
        logger.exception("Failed to initialize auth dependencies")

    # Initialize new feature services
    global scheduled_export_service, sync_conflicts_service
    try:
        # Scheduled export service
        scheduled_export_service = ScheduledExportService(db)
        scheduled_export_service.start()
        logger.info("✓ Scheduled export service started")
    except Exception:
        logger.exception("Failed to start scheduled export service")

    # Initialize enrichment service
    if EnrichmentService is not None and init_enrichment_api is not None:
        try:
            enrichment_svc = EnrichmentService(db)
            init_enrichment_api(enrichment_svc)
            logger.info("✓ Enrichment service initialized")
        except Exception:
            logger.exception("Failed to initialize enrichment service")

    # Initialize enterprise services
    if ENTERPRISE_AVAILABLE:
        try:
            # Enterprise Audit Service
            app.state.enterprise_audit = EnterpriseAuditService(db)
            await app.state.enterprise_audit.initialize()
            logger.info("✓ Enterprise audit service initialized")
        except Exception:
            app.state.enterprise_audit = None
            logger.warning("Enterprise audit service not available", exc_info=True)

        try:
            # Enterprise Security Service
            app.state.enterprise_security = EnterpriseSecurityService(db)
            await app.state.enterprise_security.initialize()
            logger.info("✓ Enterprise security service initialized")
        except Exception:
            app.state.enterprise_security = None
            logger.warning("Enterprise security service not available", exc_info=True)

        try:
            # Feature Flags Service
            app.state.feature_flags = FeatureFlagService(db)
            await app.state.feature_flags.initialize()
            logger.info("✓ Feature flags service initialized")
        except Exception:
            app.state.feature_flags = None
            logger.warning("Feature flags service not available", exc_info=True)

        try:
            # Data Governance Service
            app.state.data_governance = DataGovernanceService(db)
            await app.state.data_governance.initialize()
            logger.info("✓ Data governance service initialized")
        except Exception:
            app.state.data_governance = None
            logger.warning("Data governance service not available", exc_info=True)
    else:
        # Set None for enterprise services if not available
        app.state.enterprise_audit = None
        app.state.enterprise_security = None
        app.state.feature_flags = None
        app.state.data_governance = None

    try:
        # Sync conflicts service
        sync_conflicts_service = SyncConflictsService(db)
        logger.info("✓ Sync conflicts service initialized")
    except Exception:
        logger.exception("Failed to initialize sync conflicts service")

    try:
        # Set monitoring service for metrics API
        set_monitoring_service(monitoring_service)
        logger.info("✓ Monitoring service connected to metrics API")
    except Exception:
        logger.exception("Failed to set monitoring service")

    try:
        # Initialize ERP API
        init_erp_api(db, cache_service)
        logger.info("✓ ERP API initialized")
    except Exception as e:
        logger.error(f"Failed to initialize ERP API: {str(e)}")

    try:
        # Initialize Enhanced Item API
        init_enhanced_api(db, cache_service, monitoring_service)
        logger.info("✓ Enhanced Item API initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Enhanced Item API: {str(e)}")

    try:
        # Initialize verification API
        init_verification_api(db, cache_service)
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
    # if erp_sync_service:
    #     services_running.append("ERP Sync")
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

    # Initialize search service
    try:
        from backend.db.runtime import get_db
        from backend.services.search_service import init_search_service

        database = get_db()
        init_search_service(database)
        logger.info("✓ Search service initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize search service: {e}")

    logger.info("OK: Application startup complete")

    yield

    # Shutdown with timeout handling
    logger.info("🛑 Shutting down application...")
    shutdown_start = time.time()
    shutdown_timeout = 30  # 30 seconds max for graceful shutdown

    shutdown_tasks = []

    # Stop sync services
    # if erp_sync_service is not None:
    #     erp_sync = erp_sync_service  # Type narrowing for Pyright

    #     async def stop_erp_sync():
    #         try:
    #             erp_sync.stop()
    #             logger.info("✓ ERP sync service stopped")
    #         except Exception as e:
    #             logger.error(f"Error stopping ERP sync service: {str(e)}")

    #     shutdown_tasks.append(stop_erp_sync())

    # Stop scheduled export service
    if scheduled_export_service:

        async def stop_export_service():
            try:
                await scheduled_export_service.stop()
                logger.info("✓ Scheduled export service stopped")
            except Exception as e:
                logger.error(f"Error stopping scheduled export service: {str(e)}")

        shutdown_tasks.append(stop_export_service())

    # Stop database health monitoring
    async def stop_health_monitoring():
        try:
            await database_health_service.stop()
            logger.info("✓ Database health monitoring stopped")
        except Exception as e:
            logger.error(f"Error stopping database health monitoring: {str(e)}")

    shutdown_tasks.append(stop_health_monitoring())

    # Stop auto-sync manager
    async def stop_auto_sync():
        if auto_sync_manager:
            try:
                await auto_sync_manager.stop()
                logger.info("✅ Auto-sync manager stopped")
            except Exception as e:
                logger.error(f"Error stopping auto-sync manager: {e}")

    shutdown_tasks.append(stop_auto_sync())

    # Phase 1: Stop Pub/Sub and Redis services
    async def stop_redis_services():
        try:
            if pubsub_service:
                await pubsub_service.stop()
                logger.info("✓ Pub/Sub service stopped")

            await close_redis()
            logger.info("✓ Redis connection closed")
        except Exception as e:
            logger.error(f"Error stopping Redis services: {str(e)}")

    shutdown_tasks.append(stop_redis_services())

    # Execute shutdown tasks with timeout
    try:
        import asyncio

        await asyncio.wait_for(
            asyncio.gather(*shutdown_tasks, return_exceptions=True),
            timeout=shutdown_timeout,
        )
    except TimeoutError:
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
            "CORS_ALLOW_ORIGINS not configured for non-development environment; requests may be blocked"
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    # Allow local network IPs for development (Expo Go, LAN access)
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?",
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
app.include_router(logs_router, prefix="/api")  # Error and Activity logs
app.include_router(locations_router)  # Locations (Zones/Warehouses)


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
    logger.debug(f"get_current_user called. SECRET_KEY={SECRET_KEY[:5]}...")
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
        logger.debug(f"get_current_user token: {token}")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.debug(f"get_current_user payload: {payload}")

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
async def logout(
    request: Request, current_user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
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
        staff_name=current_user["full_name"],
        type=session_data.type or "STANDARD",
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
        session = await db.sessions.find_one({"id": session_id})

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

    await db.count_lines.insert_one(count_line)

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
                    "verified_at": datetime.utcnow(),
                }
            },
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Count line not found")

        return {"success": True, "message": "Count line approved"}
    except Exception as e:
        logger.error(f"Error approving count line {line_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


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
                    "verified": False,
                }
            },
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Count line not found")

        return {"success": True, "message": "Count line rejected"}
    except Exception as e:
        logger.error(f"Error rejecting count line {line_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


@api_router.get("/count-lines/check/{session_id}/{item_code}")
async def check_item_counted(
    session_id: str,
    item_code: str,
    current_user: dict = Depends(get_current_user),
):
    """Check if an item has already been counted in the session"""
    try:
        # Find all count lines for this item in this session
        cursor = db.count_lines.find({"session_id": session_id, "item_code": item_code})
        count_lines = await cursor.to_list(length=None)

        # Convert ObjectId to string
        for line in count_lines:
            line["_id"] = str(line["_id"])

        return {"already_counted": len(count_lines) > 0, "count_lines": count_lines}
    except Exception as e:
        logger.error(f"Error checking item count: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) from e


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
app.include_router(
    api_router, prefix="/api"
)  # Main API endpoints with auth, sessions, items, count-lines


# Run the server if executed directly


def save_backend_info(port: int, local_ip: str) -> None:
    """Save backend port info to JSON files."""
    try:
        port_data = {
            "port": port,
            "ip": local_ip,
            "url": f"http://{local_ip}:{port}",
            "pid": os.getpid(),
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Save to backend_port.json in project root
        root_dir = Path(__file__).parent.parent
        with open(root_dir / "backend_port.json", "w") as f:
            json.dump(port_data, f)

        # Save to frontend/public/backend_port.json for Expo Web
        frontend_public = root_dir / "frontend" / "public"
        if frontend_public.exists():
            with open(frontend_public / "backend_port.json", "w") as f:
                json.dump(port_data, f)
            logger.info(f"Saved backend port info to {frontend_public / 'backend_port.json'}")

        logger.info(
            f"Saved backend info (IP: {local_ip}, Port: {port}) to {root_dir / 'backend_port.json'}"
        )
    except Exception as e:
        logger.warning(f"Failed to save backend port info: {e}")


@app.on_event("startup")
async def _write_backend_port_file_on_startup() -> None:
    """Write backend_port.json on startup.

    This keeps Expo's update-ip script in sync even when the backend is started via
    `uvicorn backend.server:app ...` (where the __main__ block does not run).
    """
    try:
        port = int(os.getenv("PORT") or getattr(settings, "PORT", 8001))
    except Exception:
        port = 8001

    try:
        local_ip = PortDetector.get_local_ip()
        save_backend_info(port, local_ip)
    except Exception as e:
        logger.error(f"Error in startup handler: {e}")


# Run the server if executed directly


# Run the server if executed directly
if __name__ == "__main__":
    # Get configured port as starting point
    start_port = int(getattr(settings, "PORT", os.getenv("PORT", 8001)))
    # Use PortDetector to find port and IP
    port = PortDetector.find_available_port(start_port, range(start_port, start_port + 10))
    local_ip = PortDetector.get_local_ip()

    # Save port to file for other services to discover
    save_backend_info(port, local_ip)

    logger.info(f"Starting server on port {port}...")
    uvicorn.run(
        "backend.server:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
        access_log=True,
    )
