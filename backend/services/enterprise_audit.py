"""
Enterprise Audit Service
Comprehensive audit logging for compliance (SOC 2, ISO 27001, GDPR)
Immutable audit trail with tamper detection
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


def _build_audit_search_query(
    event_types: Optional[list] = None,
    actor_username: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    severity: Optional[Any] = None,
    outcome: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> dict[str, Any]:
    """Build MongoDB query for audit log search."""
    query: dict[str, Any] = {}

    # Simple field mappings
    field_values = {
        "actor_username": actor_username,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "outcome": outcome,
        "correlation_id": correlation_id,
    }
    for field, value in field_values.items():
        if value:
            query[field] = value

    # Special handling for enums
    if event_types:
        query["event_type"] = {"$in": [et.value for et in event_types]}
    if severity:
        query["severity"] = severity.value

    # Date range
    _add_date_range_filter(query, "timestamp", start_date, end_date)

    return query


def _add_date_range_filter(
    query: dict[str, Any],
    field: str,
    start_date: Optional[datetime],
    end_date: Optional[datetime],
) -> None:
    """Add date range filter to query if dates provided."""
    if not start_date and not end_date:
        return
    date_filter: dict[str, datetime] = {}
    if start_date:
        date_filter["$gte"] = start_date
    if end_date:
        date_filter["$lte"] = end_date
    query[field] = date_filter


class AuditEventType(str, Enum):
    """Audit event categories"""

    # Authentication
    AUTH_LOGIN = "auth.login"
    AUTH_LOGOUT = "auth.logout"
    AUTH_LOGIN_FAILED = "auth.login_failed"
    AUTH_PASSWORD_CHANGE = "auth.password_change"
    AUTH_TOKEN_REFRESH = "auth.token_refresh"
    AUTH_SESSION_EXPIRED = "auth.session_expired"

    # Authorization
    AUTHZ_ACCESS_GRANTED = "authz.access_granted"
    AUTHZ_ACCESS_DENIED = "authz.access_denied"
    AUTHZ_ROLE_CHANGE = "authz.role_change"
    AUTHZ_PERMISSION_CHANGE = "authz.permission_change"

    # Data Operations
    DATA_CREATE = "data.create"
    DATA_READ = "data.read"
    DATA_UPDATE = "data.update"
    DATA_DELETE = "data.delete"
    DATA_EXPORT = "data.export"
    DATA_IMPORT = "data.import"

    # System Operations
    SYS_CONFIG_CHANGE = "sys.config_change"
    SYS_BACKUP = "sys.backup"
    SYS_RESTORE = "sys.restore"
    SYS_MAINTENANCE = "sys.maintenance"

    # Security Events
    SEC_RATE_LIMIT = "sec.rate_limit"
    SEC_SUSPICIOUS_ACTIVITY = "sec.suspicious_activity"
    SEC_IP_BLOCKED = "sec.ip_blocked"
    SEC_BRUTE_FORCE = "sec.brute_force"


class AuditSeverity(str, Enum):
    """Audit event severity levels"""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditEntry(BaseModel):
    """Immutable audit log entry"""

    id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: AuditEventType
    severity: AuditSeverity = AuditSeverity.INFO

    # Actor information
    actor_id: Optional[str] = None
    actor_username: Optional[str] = None
    actor_role: Optional[str] = None
    actor_ip: Optional[str] = None
    actor_user_agent: Optional[str] = None

    # Resource information
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    resource_name: Optional[str] = None

    # Event details
    action: str
    outcome: str = "success"  # success, failure, error
    details: dict[str, Any] = Field(default_factory=dict)

    # Change tracking (for updates)
    old_value: Optional[dict[str, Optional[Any]]] = None
    new_value: Optional[dict[str, Optional[Any]]] = None

    # Integrity
    previous_hash: Optional[str] = None
    entry_hash: Optional[str] = None

    # Compliance metadata
    correlation_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None


class EnterpriseAuditService:
    """
    Enterprise-grade audit service with:
    - Immutable audit trail
    - Hash chain for tamper detection
    - Compliance-ready reporting
    - Retention policies
    - Search and filtering
    """

    def __init__(
        self,
        mongo_db: AsyncIOMotorDatabase,
        retention_days: int = 365,
        enable_hash_chain: bool = True,
    ):
        self.db = mongo_db
        self.collection = mongo_db.enterprise_audit_logs
        self.retention_days = retention_days
        self.enable_hash_chain = enable_hash_chain
        self._last_hash: Optional[str] = None

    async def initialize(self):
        """Initialize indexes and load last hash"""
        # Create indexes for efficient querying
        await self.collection.create_index("timestamp")
        await self.collection.create_index("event_type")
        await self.collection.create_index("actor_username")
        await self.collection.create_index("resource_type")
        await self.collection.create_index("correlation_id")
        await self.collection.create_index([("timestamp", -1), ("_id", -1)])

        # Load last hash for chain continuity
        if self.enable_hash_chain:
            last_entry = await self.collection.find_one(
                sort=[("timestamp", -1), ("_id", -1)]
            )
            if last_entry:
                self._last_hash = last_entry.get("entry_hash")

        logger.info("Enterprise audit service initialized")

    def _compute_hash(self, entry: dict[str, Any], previous_hash: Optional[str]) -> str:
        """Compute SHA-256 hash for tamper detection"""
        data = {
            "timestamp": str(entry.get("timestamp")),
            "event_type": entry.get("event_type"),
            "actor_id": entry.get("actor_id"),
            "action": entry.get("action"),
            "resource_id": entry.get("resource_id"),
            "details": json.dumps(entry.get("details", {}), sort_keys=True),
            "previous_hash": previous_hash or "",
        }
        content = json.dumps(data, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()

    async def log(
        self,
        event_type: AuditEventType,
        action: str,
        actor_id: Optional[str] = None,
        actor_username: Optional[str] = None,
        actor_role: Optional[str] = None,
        actor_ip: Optional[str] = None,
        actor_user_agent: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        outcome: str = "success",
        severity: AuditSeverity = AuditSeverity.INFO,
        details: dict[str, Optional[Any]] = None,
        old_value: dict[str, Optional[Any]] = None,
        new_value: dict[str, Optional[Any]] = None,
        correlation_id: Optional[str] = None,
        session_id: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> str:
        """
        Create an immutable audit log entry

        Returns:
            Audit entry ID
        """
        try:
            entry = {
                "timestamp": datetime.utcnow(),
                "event_type": event_type.value,
                "severity": severity.value,
                "actor_id": actor_id,
                "actor_username": actor_username,
                "actor_role": actor_role,
                "actor_ip": actor_ip,
                "actor_user_agent": actor_user_agent,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "resource_name": resource_name,
                "action": action,
                "outcome": outcome,
                "details": details or {},
                "old_value": old_value,
                "new_value": new_value,
                "correlation_id": correlation_id,
                "session_id": session_id,
                "request_id": request_id,
            }

            # Add hash chain for tamper detection
            if self.enable_hash_chain:
                entry["previous_hash"] = self._last_hash
                entry["entry_hash"] = self._compute_hash(entry, self._last_hash)
                self._last_hash = str(entry["entry_hash"])

            result = await self.collection.insert_one(entry)

            # Log security-critical events
            if severity in [AuditSeverity.ERROR, AuditSeverity.CRITICAL]:
                logger.warning(
                    f"Security audit: {event_type.value} - {action} - {outcome} - "
                    f"User: {actor_username} - IP: {actor_ip}"
                )

            return str(result.inserted_id)

        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            # Audit failures should not break the application
            return ""

    async def search(
        self,
        event_types: list[AuditEventType] = None,
        actor_username: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        severity: AuditSeverity = None,
        outcome: Optional[str] = None,
        correlation_id: Optional[str] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> dict[str, Any]:
        """Search audit logs with filters"""
        query = _build_audit_search_query(
            event_types,
            actor_username,
            resource_type,
            resource_id,
            start_date,
            end_date,
            severity,
            outcome,
            correlation_id,
        )

        total = await self.collection.count_documents(query)
        cursor = (
            self.collection.find(query)
            .sort([("timestamp", -1)])
            .skip(skip)
            .limit(limit)
        )

        entries = []
        async for doc in cursor:
            doc["id"] = str(doc.pop("_id"))
            entries.append(doc)

        return {"total": total, "limit": limit, "skip": skip, "entries": entries}

    async def verify_integrity(
        self, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
    ) -> dict[str, Any]:
        """Verify hash chain integrity for tamper detection"""
        if not self.enable_hash_chain:
            return {"status": "disabled", "message": "Hash chain not enabled"}

        query: dict[str, Any] = {}
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date

        cursor = self.collection.find(query).sort([("timestamp", 1), ("_id", 1)])

        previous_hash = None
        valid_count = 0
        invalid_entries = []

        async for doc in cursor:
            expected_hash = self._compute_hash(doc, doc.get("previous_hash"))
            stored_hash = doc.get("entry_hash")

            if expected_hash != stored_hash:
                invalid_entries.append(
                    {
                        "id": str(doc["_id"]),
                        "timestamp": doc["timestamp"].isoformat(),
                        "reason": "hash_mismatch",
                    }
                )
            elif (
                doc.get("previous_hash") != previous_hash and previous_hash is not None
            ):
                invalid_entries.append(
                    {
                        "id": str(doc["_id"]),
                        "timestamp": doc["timestamp"].isoformat(),
                        "reason": "chain_broken",
                    }
                )
            else:
                valid_count += 1

            previous_hash = stored_hash

        return {
            "status": "valid" if not invalid_entries else "tampered",
            "total_verified": valid_count + len(invalid_entries),
            "valid_entries": valid_count,
            "invalid_entries": invalid_entries,
            "verified_at": datetime.utcnow().isoformat(),
        }

    async def generate_compliance_report(
        self, start_date: datetime, end_date: datetime, report_type: str = "summary"
    ) -> dict[str, Any]:
        """Generate compliance report for auditors"""
        pipeline: list[dict[str, Any]] = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {
                "$group": {
                    "_id": {
                        "event_type": "$event_type",
                        "outcome": "$outcome",
                        "severity": "$severity",
                    },
                    "count": {"$sum": 1},
                }
            },
        ]

        stats = {}
        async for doc in self.collection.aggregate(pipeline):
            key = doc["_id"]["event_type"]
            if key not in stats:
                stats[key] = {"success": 0, "failure": 0, "total": 0}

            stats[key]["total"] += doc["count"]
            if doc["_id"]["outcome"] == "success":
                stats[key]["success"] += doc["count"]
            else:
                stats[key]["failure"] += doc["count"]

        # Security events summary
        security_events = await self.collection.count_documents(
            {
                "timestamp": {"$gte": start_date, "$lte": end_date},
                "event_type": {"$regex": "^sec\\."},
            }
        )

        # Failed logins
        failed_logins = await self.collection.count_documents(
            {
                "timestamp": {"$gte": start_date, "$lte": end_date},
                "event_type": AuditEventType.AUTH_LOGIN_FAILED.value,
            }
        )

        # Access denials
        access_denials = await self.collection.count_documents(
            {
                "timestamp": {"$gte": start_date, "$lte": end_date},
                "event_type": AuditEventType.AUTHZ_ACCESS_DENIED.value,
            }
        )

        return {
            "report_type": report_type,
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "generated_at": datetime.utcnow().isoformat(),
            "summary": {
                "total_events": sum(s["total"] for s in stats.values()),
                "security_events": security_events,
                "failed_logins": failed_logins,
                "access_denials": access_denials,
            },
            "event_breakdown": stats,
            "integrity_status": await self.verify_integrity(start_date, end_date),
        }

    async def apply_retention_policy(self) -> dict[str, int]:
        """Delete audit logs older than retention period"""
        cutoff_date = datetime.utcnow() - timedelta(days=self.retention_days)

        # Archive before deletion (optional)
        # ... archival logic here ...

        result = await self.collection.delete_many({"timestamp": {"$lt": cutoff_date}})

        logger.info(
            f"Audit retention: deleted {result.deleted_count} entries older than {self.retention_days} days"
        )

        return {"deleted_count": result.deleted_count}
