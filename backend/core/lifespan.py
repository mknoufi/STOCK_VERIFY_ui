# ruff: noqa: E402
# flake8: noqa: E402

import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Generic, Optional, TypeVar, cast

from fastapi import FastAPI
from fastapi.security import HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel

# Add project root to path for direct execution (debugging)
# This allows the file to be run directly for testing/debugging
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))


from backend.api import legacy_routes
from backend.api.enhanced_item_api import init_enhanced_api

# API Initialization
from backend.api.erp_api import init_erp_api
from backend.api.item_verification_api import init_verification_api
from backend.api.metrics_api import set_monitoring_service
from backend.api.sync_management_api import set_change_detection_service
from backend.api.sync_status_api import set_auto_sync_manager
from backend.auth.dependencies import init_auth_dependencies
from backend.config import settings
from backend.core import globals as g
from backend.db.indexes import create_indexes
from backend.db.initialization import init_default_users
from backend.db.migrations import MigrationManager
from backend.db.runtime import set_client, set_db

# Services
from backend.services.activity_log import ActivityLogService

# Auto-sync manager
from backend.services.auto_sync_manager import AutoSyncManager
from backend.services.batch_operations import BatchOperationsService
from backend.services.cache_service import CacheService
from backend.services.database_health import DatabaseHealthService
from backend.services.database_optimizer import DatabaseOptimizer
from backend.services.error_log import ErrorLogService
from backend.services.errors import DatabaseError
from backend.services.lock_manager import get_lock_manager
from backend.services.mdns_service import start_mdns, stop_mdns
from backend.services.monitoring_service import MonitoringService
from backend.services.pubsub_service import get_pubsub_service
from backend.services.rate_limiter import ConcurrentRequestHandler, RateLimiter
from backend.services.redis_service import close_redis, init_redis
from backend.services.refresh_token import RefreshTokenService
from backend.services.runtime import set_cache_service, set_refresh_token_service
from backend.services.scheduled_export_service import ScheduledExportService
from backend.services.sync_conflicts_service import SyncConflictsService
from backend.sql_server_connector import SQLServerConnector
from backend.utils.port_detector import PortDetector, save_backend_info

# Enterprise Imports
try:
    from backend.api.enrichment_api import init_enrichment_api
    from backend.services.enrichment_service import EnrichmentService
except ImportError:
    EnrichmentService = None  # type: ignore
    init_enrichment_api = None  # type: ignore

try:
    from backend.services.data_governance import DataGovernanceService
    from backend.services.enterprise_audit import EnterpriseAuditService
    from backend.services.enterprise_security import EnterpriseSecurityService
    from backend.services.feature_flags import FeatureFlagService

    g.ENTERPRISE_AVAILABLE = True
except ImportError:
    g.ENTERPRISE_AVAILABLE = False

# Utils
from backend.utils.logging_config import setup_logging
from backend.utils.tracing import init_tracing

# Logger setup
logger = logging.getLogger("stock-verify")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

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


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[dict[str, Optional[Any]]] = None

    @classmethod
    def success_response(cls, data: T):
        return cls(success=True, data=data)

    @classmethod
    def error_response(cls, error: dict[str, Any]):
        return cls(success=False, error=error)


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

    # Start mDNS service
    try:
        logger.info("🌐 Starting mDNS service...")
        # Use PORT env var if set (by PortDetector), otherwise settings
        mdns_port = int(os.getenv("PORT", getattr(settings, "PORT", 8001)))
        await start_mdns(port=mdns_port)
        logger.info(f"✓ mDNS service started (stock-verify.local on port {mdns_port})")
    except Exception as e:
        logger.warning(f"⚠️ mDNS service failed to start: {str(e)}")

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
        await init_default_users(db)
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
    except Exception as e:
        logger.warning(f"Auto-sync manager initialization failed: {str(e)}")
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

    # Initialize enrichment service
    if EnrichmentService is not None and init_enrichment_api is not None:
        try:
            enrichment_svc = EnrichmentService(db)
            init_enrichment_api(enrichment_svc)
            logger.info("✓ Enrichment service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize enrichment service: {str(e)}")

    # Initialize enterprise services
    if g.ENTERPRISE_AVAILABLE:
        try:
            # Enterprise Audit Service
            app.state.enterprise_audit = EnterpriseAuditService(db)
            await app.state.enterprise_audit.initialize()
            logger.info("✓ Enterprise audit service initialized")
        except Exception as e:
            app.state.enterprise_audit = None
            logger.warning(f"Enterprise audit service not available: {str(e)}")

        try:
            # Enterprise Security Service
            app.state.enterprise_security = EnterpriseSecurityService(db)
            await app.state.enterprise_security.initialize()
            logger.info("✓ Enterprise security service initialized")
        except Exception as e:
            app.state.enterprise_security = None
            logger.warning(f"Enterprise security service not available: {str(e)}")

        try:
            # Feature Flags Service
            app.state.feature_flags = FeatureFlagService(db)
            await app.state.feature_flags.initialize()
            logger.info("✓ Feature flags service initialized")
        except Exception as e:
            app.state.feature_flags = None
            logger.warning(f"Feature flags service not available: {str(e)}")

        try:
            # Data Governance Service
            app.state.data_governance = DataGovernanceService(db)
            await app.state.data_governance.initialize()
            logger.info("✓ Data governance service initialized")
        except Exception as e:
            app.state.data_governance = None
            logger.warning(f"Data governance service not available: {str(e)}")
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
    except Exception as e:
        logger.error(f"Failed to initialize sync conflicts service: {str(e)}")

    try:
        # Set monitoring service for metrics API
        set_monitoring_service(monitoring_service)
        logger.info("✓ Monitoring service connected to metrics API")
    except Exception as e:
        logger.error(f"Failed to set monitoring service: {str(e)}")

    try:
        # Initialize ERP API
        init_erp_api(db, cache_service)
        logger.info("✓ ERP API initialized")
    except Exception as e:
        logger.error(f"Failed to initialize ERP API: {str(e)}")

    try:
        # Initialize Enhanced Item API
        init_enhanced_api(db, cache_service, monitoring_service, sql_connector)
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

    # Inject services into globals and legacy routes module
    # This allows the legacy inline routes to function without the original server.py

    # Core Services
    g.db = db
    legacy_routes.db = db

    g.cache_service = cache_service
    legacy_routes.cache_service = cache_service

    g.rate_limiter = rate_limiter
    legacy_routes.rate_limiter = rate_limiter

    g.concurrent_handler = concurrent_handler
    legacy_routes.concurrent_handler = concurrent_handler

    g.activity_log_service = activity_log_service
    legacy_routes.activity_log_service = activity_log_service

    g.error_log_service = error_log_service
    legacy_routes.error_log_service = error_log_service

    g.refresh_token_service = refresh_token_service
    legacy_routes.refresh_token_service = refresh_token_service

    g.batch_operations = batch_operations
    legacy_routes.batch_operations = batch_operations

    g.migration_manager = migration_manager
    legacy_routes.migration_manager = migration_manager

    # Functional Services
    g.scheduled_export_service = scheduled_export_service
    legacy_routes.scheduled_export_service = scheduled_export_service

    g.sync_conflicts_service = sync_conflicts_service
    legacy_routes.sync_conflicts_service = sync_conflicts_service

    g.monitoring_service = monitoring_service
    legacy_routes.monitoring_service = monitoring_service

    g.database_health_service = database_health_service
    legacy_routes.database_health_service = database_health_service

    g.auto_sync_manager = auto_sync_manager
    legacy_routes.auto_sync_manager = auto_sync_manager

    if g.ENTERPRISE_AVAILABLE:
        g.enterprise_audit_service = getattr(app.state, "enterprise_audit", None)
        legacy_routes.enterprise_audit_service = g.enterprise_audit_service

        g.enterprise_security_service = getattr(app.state, "enterprise_security", None)
        legacy_routes.enterprise_security_service = g.enterprise_security_service

    logger.info("✓ Global services injected into legacy routes")

    # Save backend port info (replaces deprecated on_event("startup"))
    try:
        port_str = os.getenv("PORT", str(getattr(settings, "PORT", 8001)))
        port = int(port_str)
    except Exception:
        port = 8001

    try:
        local_ip = PortDetector.get_local_ip()

        # Check for SSL certificates to determine protocol
        # project_root is defined at top of file as backend/
        repo_root = project_root.parent
        default_key = repo_root / "nginx" / "ssl" / "privkey.pem"
        default_cert = repo_root / "nginx" / "ssl" / "fullchain.pem"

        ssl_keyfile = os.getenv("SSL_KEYFILE", str(default_key))
        ssl_certfile = os.getenv("SSL_CERTFILE", str(default_cert))
        use_ssl = os.path.exists(ssl_keyfile) and os.path.exists(ssl_certfile)
        protocol = "https" if use_ssl else "http"

        save_backend_info(port, local_ip, protocol)
    except Exception as e:
        logger.error(f"Error saving backend port info: {e}")

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

    # Stop mDNS service
    try:
        await stop_mdns()
        logger.info("✓ mDNS service stopped")
    except Exception as e:
        logger.error(f"Error stopping mDNS service: {str(e)}")

    shutdown_duration = time.time() - shutdown_start
    logger.info(f"✓ Application shutdown complete (took {shutdown_duration:.2f}s)")
