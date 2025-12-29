"""
Enterprise API Router
Exposes enterprise-grade features via REST API
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from backend.auth.dependencies import get_current_user, require_admin

logger = logging.getLogger(__name__)

enterprise_router = APIRouter(prefix="/enterprise", tags=["Enterprise"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================


class IPListEntry(BaseModel):
    """IP list entry request"""

    ip_address: str
    list_type: str = Field(..., pattern="^(whitelist|blacklist)$")
    reason: Optional[str] = None
    expires_hours: Optional[int] = None


class FeatureFlagRequest(BaseModel):
    """Feature flag creation/update request"""

    key: str
    name: str
    description: Optional[str] = None
    state: str = "disabled"
    percentage: int = Field(default=0, ge=0, le=100)
    allowed_users: list[str] = Field(default_factory=list)
    allowed_roles: list[str] = Field(default_factory=list)


class DataSubjectRequestCreate(BaseModel):
    """GDPR data subject request"""

    request_type: str = Field(..., pattern="^(access|erasure|rectification|portability)$")
    subject_id: str
    subject_email: Optional[str] = None
    notes: Optional[str] = None


class RetentionPolicyRequest(BaseModel):
    """Retention policy request"""

    collection_name: str
    retention_days: int = Field(..., ge=1, le=3650)
    archive_before_delete: bool = True
    description: Optional[str] = None


class UnlockAccountRequest(BaseModel):
    """Account unlock request"""

    username: str


# ============================================================================
# AUDIT ENDPOINTS
# ============================================================================


@enterprise_router.get("/audit/logs")
async def get_audit_logs(
    request: Request,
    event_type: Optional[str] = None,
    username: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    skip: int = Query(default=0, ge=0),
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Get audit logs with filtering"""
    audit_service = request.app.state.enterprise_audit
    if not audit_service:
        raise HTTPException(503, "Audit service not available")

    # Parse dates
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None

    result = await audit_service.search(
        actor_username=username, start_date=start, end_date=end, limit=limit, skip=skip
    )

    return result


@enterprise_router.get("/audit/verify-integrity")
async def verify_audit_integrity(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Verify audit log integrity (tamper detection)"""
    audit_service = request.app.state.enterprise_audit
    if not audit_service:
        raise HTTPException(503, "Audit service not available")

    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None

    return await audit_service.verify_integrity(start, end)


@enterprise_router.get("/audit/compliance-report")
async def get_compliance_report(
    request: Request,
    days: int = Query(default=30, ge=1, le=365),
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Generate compliance audit report"""
    audit_service = request.app.state.enterprise_audit
    if not audit_service:
        raise HTTPException(503, "Audit service not available")

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    return await audit_service.generate_compliance_report(start_date, end_date)


# ============================================================================
# SECURITY ENDPOINTS
# ============================================================================


@enterprise_router.get("/security/summary")
async def get_security_summary(
    request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Get security status summary"""
    security_service = request.app.state.enterprise_security
    if not security_service:
        raise HTTPException(503, "Security service not available")

    return await security_service.get_security_summary()


@enterprise_router.get("/security/ip-lists")
async def get_ip_lists(
    request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Get IP whitelist and blacklist"""
    security_service = request.app.state.enterprise_security
    if not security_service:
        raise HTTPException(503, "Security service not available")

    return await security_service.get_ip_lists()


@enterprise_router.post("/security/ip-list")
async def add_to_ip_list(
    entry: IPListEntry, request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Add IP to whitelist or blacklist"""
    security_service = request.app.state.enterprise_security
    if not security_service:
        raise HTTPException(503, "Security service not available")

    from backend.services.enterprise_security import IPListType

    list_type = IPListType.WHITELIST if entry.list_type == "whitelist" else IPListType.BLACKLIST
    expires_at = (
        datetime.utcnow() + timedelta(hours=entry.expires_hours) if entry.expires_hours else None
    )

    success = await security_service.add_to_ip_list(
        entry.ip_address,
        list_type,
        entry.reason,
        current_user.get("username"),
        expires_at,
    )

    if not success:
        raise HTTPException(500, "Failed to add IP to list")

    return {"status": "success", "ip": entry.ip_address, "list": entry.list_type}


@enterprise_router.delete("/security/ip-list/{ip_address}")
async def remove_from_ip_list(
    ip_address: str,
    request: Request,
    list_type: str = Query(..., pattern="^(whitelist|blacklist)$"),
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Remove IP from list"""
    security_service = request.app.state.enterprise_security
    if not security_service:
        raise HTTPException(503, "Security service not available")

    from backend.services.enterprise_security import IPListType

    lt = IPListType.WHITELIST if list_type == "whitelist" else IPListType.BLACKLIST
    success = await security_service.remove_from_ip_list(ip_address, lt)

    return {"status": "success" if success else "not_found"}


@enterprise_router.get("/security/locked-accounts")
async def get_locked_accounts(
    request: Request, current_user: dict = Depends(require_admin)
) -> list[dict[str, Any]]:
    """Get all currently locked accounts"""
    security_service = request.app.state.enterprise_security
    if not security_service:
        raise HTTPException(503, "Security service not available")

    return await security_service.get_locked_accounts()


@enterprise_router.post("/security/unlock-account")
async def unlock_account(
    body: UnlockAccountRequest,
    request: Request,
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Manually unlock a locked account"""
    security_service = request.app.state.enterprise_security
    if not security_service:
        raise HTTPException(503, "Security service not available")

    success = await security_service.unlock_account(body.username, current_user.get("username"))

    return {"status": "success" if success else "failed"}


@enterprise_router.get("/security/events")
async def get_security_events(
    request: Request,
    limit: int = Query(default=100, le=500),
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: dict = Depends(require_admin),
) -> list[dict[str, Any]]:
    """Get recent security events"""
    security_service = request.app.state.enterprise_security
    if not security_service:
        raise HTTPException(503, "Security service not available")

    return await security_service.get_security_events(
        limit=limit, event_type=event_type, severity=severity
    )


@enterprise_router.get("/security/sessions/{user_id}")
async def get_user_sessions(
    user_id: str, request: Request, current_user: dict = Depends(require_admin)
) -> list[dict[str, Any]]:
    """Get all active sessions for a user"""
    security_service = request.app.state.enterprise_security
    if not security_service:
        raise HTTPException(503, "Security service not available")

    return await security_service.get_user_sessions(user_id)


@enterprise_router.delete("/security/sessions/{user_id}")
async def terminate_user_sessions(
    user_id: str, request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Terminate all sessions for a user"""
    security_service = request.app.state.enterprise_security
    if not security_service:
        raise HTTPException(503, "Security service not available")

    count = await security_service.terminate_all_sessions(user_id)
    return {"terminated_sessions": count}


# ============================================================================
# FEATURE FLAGS ENDPOINTS
# ============================================================================


@enterprise_router.get("/features")
async def get_feature_flags(
    request: Request, current_user: dict = Depends(get_current_user)
) -> list[dict[str, Any]]:
    """Get all feature flags"""
    feature_service = request.app.state.feature_flags
    if not feature_service:
        raise HTTPException(503, "Feature flag service not available")

    flags = await feature_service.get_all_flags()
    return [f.model_dump() for f in flags]


@enterprise_router.get("/features/enabled")
async def get_enabled_features(
    request: Request, current_user: dict = Depends(get_current_user)
) -> list[str]:
    """Get all enabled features for current user"""
    feature_service = request.app.state.feature_flags
    if not feature_service:
        raise HTTPException(503, "Feature flag service not available")

    return await feature_service.get_enabled_flags_for_user(
        user_id=current_user.get("sub"),
        username=current_user.get("username"),
        role=current_user.get("role"),
    )


@enterprise_router.get("/features/{key}")
async def check_feature(
    key: str, request: Request, current_user: dict = Depends(get_current_user)
) -> dict[str, Any]:
    """Check if a feature is enabled for current user"""
    feature_service = request.app.state.feature_flags
    if not feature_service:
        raise HTTPException(503, "Feature flag service not available")

    enabled = await feature_service.is_enabled(
        key,
        user_id=current_user.get("sub"),
        username=current_user.get("username"),
        role=current_user.get("role"),
    )

    return {"key": key, "enabled": enabled}


@enterprise_router.post("/features")
async def create_feature_flag(
    flag: FeatureFlagRequest,
    request: Request,
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Create a new feature flag"""
    feature_service = request.app.state.feature_flags
    if not feature_service:
        raise HTTPException(503, "Feature flag service not available")

    created = await feature_service.create_flag(
        key=flag.key,
        name=flag.name,
        description=flag.description,
        created_by=current_user.get("username"),
        state=flag.state,
        percentage=flag.percentage,
        allowed_users=flag.allowed_users,
        allowed_roles=flag.allowed_roles,
    )

    return created.model_dump()


@enterprise_router.patch("/features/{key}")
async def update_feature_flag(
    key: str,
    updates: dict[str, Any],
    request: Request,
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Update a feature flag"""
    feature_service = request.app.state.feature_flags
    if not feature_service:
        raise HTTPException(503, "Feature flag service not available")

    updated = await feature_service.update_flag(
        key, updated_by=current_user.get("username"), **updates
    )

    if not updated:
        raise HTTPException(404, "Feature flag not found")

    return updated.model_dump()


@enterprise_router.post("/features/{key}/enable")
async def enable_feature(
    key: str, request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Enable a feature flag"""
    feature_service = request.app.state.feature_flags
    if not feature_service:
        raise HTTPException(503, "Feature flag service not available")

    success = await feature_service.enable_flag(key, current_user.get("username"))
    if not success:
        raise HTTPException(404, "Feature flag not found")

    return {"key": key, "enabled": True}


@enterprise_router.post("/features/{key}/disable")
async def disable_feature(
    key: str, request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Disable a feature flag"""
    feature_service = request.app.state.feature_flags
    if not feature_service:
        raise HTTPException(503, "Feature flag service not available")

    success = await feature_service.disable_flag(key, current_user.get("username"))
    if not success:
        raise HTTPException(404, "Feature flag not found")

    return {"key": key, "enabled": False}


@enterprise_router.delete("/features/{key}")
async def delete_feature_flag(
    key: str, request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Delete a feature flag"""
    feature_service = request.app.state.feature_flags
    if not feature_service:
        raise HTTPException(503, "Feature flag service not available")

    success = await feature_service.delete_flag(key)
    if not success:
        raise HTTPException(404, "Feature flag not found")

    return {"status": "deleted", "key": key}


# ============================================================================
# DATA GOVERNANCE ENDPOINTS
# ============================================================================


@enterprise_router.get("/governance/inventory")
async def get_data_inventory(
    request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Get data inventory with classifications"""
    governance_service = request.app.state.data_governance
    if not governance_service:
        raise HTTPException(503, "Data governance service not available")

    return await governance_service.get_data_inventory()


@enterprise_router.get("/governance/compliance-report")
async def get_governance_compliance_report(
    request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Get data governance compliance report"""
    governance_service = request.app.state.data_governance
    if not governance_service:
        raise HTTPException(503, "Data governance service not available")

    return await governance_service.get_compliance_report()


@enterprise_router.get("/governance/retention-policies")
async def get_retention_policies(
    request: Request, current_user: dict = Depends(require_admin)
) -> list[dict[str, Any]]:
    """Get all data retention policies"""
    governance_service = request.app.state.data_governance
    if not governance_service:
        raise HTTPException(503, "Data governance service not available")

    policies = await governance_service.get_retention_policies()
    return [p.model_dump() for p in policies]


@enterprise_router.post("/governance/retention-policies")
async def set_retention_policy(
    policy: RetentionPolicyRequest,
    request: Request,
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Set or update a retention policy"""
    governance_service = request.app.state.data_governance
    if not governance_service:
        raise HTTPException(503, "Data governance service not available")

    from backend.services.data_governance import DataCategory, RetentionPolicy

    rp = RetentionPolicy(
        category=DataCategory.OPERATIONAL,
        collection_name=policy.collection_name,
        retention_days=policy.retention_days,
        archive_before_delete=policy.archive_before_delete,
        description=policy.description,
    )

    success = await governance_service.set_retention_policy(rp)
    if not success:
        raise HTTPException(500, "Failed to set retention policy")

    return {"status": "success", "policy": rp.model_dump()}


@enterprise_router.post("/governance/apply-retention")
async def apply_retention_policies(
    request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Apply retention policies (delete expired data)"""
    governance_service = request.app.state.data_governance
    if not governance_service:
        raise HTTPException(503, "Data governance service not available")

    return await governance_service.apply_retention_policies()


# GDPR Data Subject Requests


@enterprise_router.post("/governance/data-requests")
async def create_data_request(
    body: DataSubjectRequestCreate,
    request: Request,
    current_user: dict = Depends(require_admin),
) -> dict[str, Any]:
    """Create a GDPR data subject request"""
    governance_service = request.app.state.data_governance
    if not governance_service:
        raise HTTPException(503, "Data governance service not available")

    request_id = await governance_service.create_data_subject_request(
        request_type=body.request_type,
        subject_id=body.subject_id,
        subject_email=body.subject_email,
        notes=body.notes,
    )

    return {"request_id": request_id, "status": "pending"}


@enterprise_router.get("/governance/data-requests")
async def get_pending_data_requests(
    request: Request, current_user: dict = Depends(require_admin)
) -> list[dict[str, Any]]:
    """Get pending GDPR data subject requests"""
    governance_service = request.app.state.data_governance
    if not governance_service:
        raise HTTPException(503, "Data governance service not available")

    return await governance_service.get_pending_requests()


@enterprise_router.post("/governance/data-requests/{request_id}/process")
async def process_data_request(
    request_id: str, request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Process a GDPR data subject request"""
    governance_service = request.app.state.data_governance
    if not governance_service:
        raise HTTPException(503, "Data governance service not available")

    # Get request details
    req_details = await governance_service.get_request_status(request_id)
    if not req_details:
        raise HTTPException(404, "Request not found")

    if req_details["request_type"] == "access":
        data = await governance_service.process_access_request(
            request_id, current_user.get("username")
        )
        return {"status": "completed", "data": data}

    elif req_details["request_type"] == "erasure":
        results = await governance_service.process_erasure_request(
            request_id, current_user.get("username")
        )
        return {"status": "completed", "deleted": results}

    else:
        raise HTTPException(
            400,
            f"Request type '{req_details['request_type']}' requires manual processing",
        )


# ============================================================================
# CIRCUIT BREAKER ENDPOINTS
# ============================================================================


@enterprise_router.get("/circuit-breakers")
async def get_circuit_breakers(
    request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Get status of all circuit breakers"""
    from backend.services.circuit_breaker import circuit_breaker_registry

    return circuit_breaker_registry.get_all_status()


# ============================================================================
# METRICS ENDPOINTS
# ============================================================================


@enterprise_router.get("/metrics")
async def get_enterprise_metrics(
    request: Request, current_user: dict = Depends(require_admin)
) -> dict[str, Any]:
    """Get enterprise metrics"""
    from backend.services.observability import metrics

    return await metrics.get_metrics()


@enterprise_router.get("/metrics/prometheus")
async def get_prometheus_metrics(request: Request, current_user: dict = Depends(require_admin)):
    """Get metrics in Prometheus format"""
    from fastapi.responses import PlainTextResponse

    from backend.services.observability import metrics

    return PlainTextResponse(content=metrics.to_prometheus(), media_type="text/plain")
