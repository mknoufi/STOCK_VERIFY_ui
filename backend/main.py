from fastapi import FastAPI

# Router imports
from backend.api import auth, supervisor_pin
from backend.api.admin_control_api import admin_control_router
from backend.api.admin_dashboard_api import admin_dashboard_router
from backend.api.auth import router as auth_router
from backend.api.dynamic_fields_api import dynamic_fields_router
from backend.api.dynamic_reports_api import dynamic_reports_router
from backend.api.enhanced_item_api import enhanced_item_router as items_router
from backend.api.erp_api import router as erp_router
from backend.api.exports_api import exports_router
from backend.api.health import health_router, info_router
from backend.api.item_verification_api import verification_router
from backend.api.legacy_routes import api_router
from backend.api.logs_api import router as logs_router
from backend.api.mapping_api import router as mapping_router
from backend.api.metrics_api import metrics_router
from backend.api.permissions_api import permissions_router
from backend.api.rack_api import router as rack_router
from backend.api.report_generation_api import report_generation_router
from backend.api.reporting_api import router as reporting_router
from backend.api.security_api import security_router
from backend.api.self_diagnosis_api import self_diagnosis_router
from backend.api.session_management_api import router as session_mgmt_router
from backend.api.sync_batch_api import router as sync_batch_router
from backend.api.sync_conflicts_api import sync_conflicts_router
from backend.api.sync_management_api import sync_management_router
from backend.api.sync_status_api import sync_router
from backend.api.variance_api import router as variance_router
from backend.config import settings
from backend.core.lifespan import lifespan
from backend.middleware.setup import setup_middleware
from backend.utils.tracing import instrument_fastapi_app

# Create FastAPI app
app = FastAPI(
    title=getattr(settings, "APP_NAME", "Stock Count API"),
    description="Stock counting and ERP sync API",
    version=getattr(settings, "APP_VERSION", "1.0.0"),
    lifespan=lifespan,
)

# Attach OpenTelemetry tracing
try:
    instrument_fastapi_app(app)
except Exception:
    pass

# Setup Middleware
setup_middleware(app)

# Register routers
app.include_router(health_router)  # Health check endpoints at /health/*
app.include_router(health_router, prefix="/api")  # Alias for frontend compatibility
app.include_router(info_router)  # Version check and info endpoints at /api/*
app.include_router(permissions_router, prefix="/api")  # Permissions management
app.include_router(mapping_router)  # Database mapping endpoints via mapping_api
app.include_router(exports_router, prefix="/api")  # Export functionality

app.include_router(auth_router, prefix="/api")
app.include_router(items_router)  # Enhanced item API

app.include_router(metrics_router, prefix="/api")  # Metrics and monitoring
app.include_router(sync_router, prefix="/api")  # Sync status
app.include_router(sync_management_router, prefix="/api")  # Sync management
app.include_router(self_diagnosis_router)  # Self diagnosis

app.include_router(security_router)  # Security dashboard (has its own prefix)
app.include_router(verification_router)
app.include_router(erp_router, prefix="/api")  # ERP endpoints
app.include_router(variance_router, prefix="/api")  # Variance reasons and trends
app.include_router(admin_control_router)  # Admin control endpoints
app.include_router(dynamic_fields_router)  # Dynamic fields management
app.include_router(dynamic_reports_router)  # Dynamic reports

app.include_router(logs_router, prefix="/api")  # Error and Activity logs

app.include_router(sync_batch_router)  # Batch sync API (has prefix /api/sync)
app.include_router(rack_router)  # Rack management (has prefix /api/racks)
app.include_router(session_mgmt_router)  # Session management (has prefix /api/sessions)
app.include_router(reporting_router)  # Reporting API (has prefix /api/reports)
app.include_router(admin_dashboard_router, prefix="/api")  # Admin Dashboard API
app.include_router(report_generation_router, prefix="/api")  # Report Generation API

app.include_router(sync_conflicts_router, prefix="/api")  # Sync conflicts feature

app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(supervisor_pin.router, prefix="/api", tags=["Supervisor"])

# Legacy routes (inline routes migrated from server.py)
app.include_router(api_router, prefix="/api")
