from typing import Any, Optional

# Global service instances
# These are initialized during the lifespan startup event
scheduled_export_service: Optional[Any] = None
sync_conflicts_service: Optional[Any] = None
monitoring_service: Optional[Any] = None
database_health_service: Optional[Any] = None
auto_sync_manager: Optional[Any] = None
enterprise_router: Optional[Any] = None
init_enrichment_api: Optional[Any] = None
enrichment_router: Optional[Any] = None

# Constants
ENTERPRISE_AVAILABLE = False

# Core Services
cache_service: Optional[Any] = None
rate_limiter: Optional[Any] = None
concurrent_handler: Optional[Any] = None
activity_log_service: Optional[Any] = None
error_log_service: Optional[Any] = None
refresh_token_service: Optional[Any] = None
batch_operations: Optional[Any] = None
migration_manager: Optional[Any] = None

# Enterprise Services (previously app.state)
enterprise_audit_service: Optional[Any] = None
enterprise_security_service: Optional[Any] = None
feature_flag_service: Optional[Any] = None
data_governance_service: Optional[Any] = None
