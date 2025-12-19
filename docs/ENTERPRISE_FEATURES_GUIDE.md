# Enterprise Features Guide

Stock Verification System - Enterprise Grade Features

## Overview

This guide documents all enterprise-grade features added to the Stock Verification System, providing compliance-ready security, observability, and governance capabilities.

---

## 🔐 Enterprise Security

**Service:** `backend/services/enterprise_security.py`
**API:** `/api/enterprise/security/*`

### Features

#### 1. IP Whitelisting/Blacklisting
Control access at the IP level with time-based expiration.

```python
# Add IP to whitelist
POST /api/enterprise/security/ip-list
{
    "ip_address": "192.168.1.100",
    "list_type": "whitelist",
    "reason": "Trusted office IP",
    "expires_hours": 720  # Optional: auto-expire after 30 days
}

# Remove IP from list
DELETE /api/enterprise/security/ip-list/192.168.1.100?list_type=blacklist
```

#### 2. Brute Force Protection
Automatic account lockout after failed login attempts.

- Default: 5 failed attempts → 15-minute lockout
- Escalating lockouts for repeat offenders
- Auto-blacklist after 3 lockouts within 24 hours

```python
# View locked accounts
GET /api/enterprise/security/locked-accounts

# Manually unlock an account
POST /api/enterprise/security/unlock-account
{"username": "user@example.com"}
```

#### 3. Session Management
Control concurrent sessions per user.

```python
# View user sessions
GET /api/enterprise/security/sessions/{user_id}

# Terminate all user sessions (force logout)
DELETE /api/enterprise/security/sessions/{user_id}
```

#### 4. Security Events
Monitor security-related activities.

```python
# Get recent security events
GET /api/enterprise/security/events?limit=100&severity=high

# Get security summary
GET /api/enterprise/security/summary
```

### Configuration

Environment variables for security service:

```env
# Brute force protection
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15

# Session limits
MAX_CONCURRENT_SESSIONS=5

# IP filtering mode: "whitelist" or "blacklist"
IP_FILTER_MODE=blacklist
```

---

## 📋 Enterprise Audit

**Service:** `backend/services/enterprise_audit.py`
**API:** `/api/enterprise/audit/*`

### Features

#### 1. Immutable Audit Trail
All security and data events are logged with hash-chain integrity.

- Tamper detection via cryptographic hash chain
- Compliance-ready for SOC 2, ISO 27001, GDPR

```python
# Search audit logs
GET /api/enterprise/audit/logs?username=admin&start_date=2025-01-01&limit=100

# Verify audit integrity (tamper detection)
GET /api/enterprise/audit/verify-integrity?start_date=2025-01-01
```

#### 2. Compliance Reports
Generate audit reports for compliance requirements.

```python
# Generate compliance report (last 30 days)
GET /api/enterprise/audit/compliance-report?days=30
```

### Event Types

| Category | Events |
|----------|--------|
| Authentication | LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE, MFA_ENABLE/DISABLE |
| Data Access | READ, CREATE, UPDATE, DELETE, EXPORT, BULK_OPERATION |
| System | CONFIG_CHANGE, BACKUP, RESTORE, MIGRATION |
| Security | IP_BLOCKED, RATE_LIMITED, PERMISSION_DENIED, SESSION_TERMINATED |

### Audit Log Schema

```json
{
    "event_id": "audit_abc123",
    "timestamp": "2025-12-09T10:30:00Z",
    "event_type": "DATA_UPDATE",
    "actor": {
        "user_id": "user_123",
        "username": "admin",
        "role": "admin",
        "ip_address": "192.168.1.100"
    },
    "resource": {
        "type": "count_line",
        "id": "line_456"
    },
    "action": "update",
    "details": {"field": "quantity", "old": 10, "new": 15},
    "hash": "sha256:abc123...",
    "previous_hash": "sha256:xyz789..."
}
```

---

## 🚩 Feature Flags

**Service:** `backend/services/feature_flags.py`
**API:** `/api/enterprise/features/*`

### Features

#### 1. Dynamic Feature Toggling
Enable/disable features without code deployment.

```python
# List all feature flags
GET /api/enterprise/features

# Check if feature is enabled for current user
GET /api/enterprise/features/{key}

# Get all enabled features for current user
GET /api/enterprise/features/enabled
```

#### 2. Gradual Rollouts
Roll out features to a percentage of users.

```python
# Create feature with 20% rollout
POST /api/enterprise/features
{
    "key": "new_dashboard",
    "name": "New Dashboard Design",
    "description": "Redesigned dashboard with new charts",
    "state": "enabled",
    "percentage": 20
}
```

#### 3. Targeted Rollouts
Enable features for specific users or roles.

```python
# Create feature for beta testers
POST /api/enterprise/features
{
    "key": "beta_export",
    "name": "Beta Export Feature",
    "state": "enabled",
    "allowed_users": ["user1", "user2"],
    "allowed_roles": ["admin", "manager"]
}
```

#### 4. Feature Management

```python
# Enable a feature
POST /api/enterprise/features/{key}/enable

# Disable a feature
POST /api/enterprise/features/{key}/disable

# Update feature settings
PATCH /api/enterprise/features/{key}
{"percentage": 50, "allowed_roles": ["admin"]}

# Delete a feature flag
DELETE /api/enterprise/features/{key}
```

### Default Enterprise Flags

| Key | Description | Default |
|-----|-------------|---------|
| `enterprise_audit` | Enable detailed audit logging | Enabled |
| `enterprise_security` | Enable advanced security features | Enabled |
| `data_governance` | Enable GDPR compliance features | Enabled |
| `advanced_analytics` | Enable advanced analytics dashboard | Disabled |
| `bulk_operations` | Enable bulk data operations | Enabled (admin only) |

---

## 📊 Enterprise Observability

**Service:** `backend/services/observability.py`
**API:** `/api/enterprise/metrics/*`

### Features

#### 1. Structured Logging
JSON-formatted logs with context.

```python
# Log format
{
    "timestamp": "2025-12-09T10:30:00Z",
    "level": "INFO",
    "service": "stock-verify-api",
    "request_id": "req_abc123",
    "trace_id": "trace_xyz",
    "message": "User logged in",
    "extra": {"user_id": "123", "ip": "192.168.1.1"}
}
```

#### 2. Distributed Tracing
Track requests across services.

```python
# Trace context is automatically propagated
# Headers: X-Request-ID, X-Trace-ID, X-Correlation-ID
```

#### 3. Metrics Collection

```python
# Get all metrics
GET /api/enterprise/metrics

# Get Prometheus-format metrics
GET /api/enterprise/metrics/prometheus
```

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests |
| `http_request_duration_seconds` | Histogram | Request latency |
| `active_users` | Gauge | Currently active users |
| `database_queries_total` | Counter | Total database queries |
| `cache_hits_total` | Counter | Cache hit count |
| `cache_misses_total` | Counter | Cache miss count |

---

## 🏛️ Data Governance

**Service:** `backend/services/data_governance.py`
**API:** `/api/enterprise/governance/*`

### Features

#### 1. Data Classification
Classify data by sensitivity level.

| Category | Description | Examples |
|----------|-------------|----------|
| PERSONAL | User identifiable data | Name, email, phone |
| SENSITIVE | High-security data | Passwords, tokens |
| OPERATIONAL | Business data | Counts, items |
| AUDIT | Compliance data | Logs, events |

```python
# Get data inventory with classifications
GET /api/enterprise/governance/inventory
```

#### 2. Retention Policies
Automatic data lifecycle management.

```python
# List retention policies
GET /api/enterprise/governance/retention-policies

# Set retention policy
POST /api/enterprise/governance/retention-policies
{
    "collection_name": "activity_logs",
    "retention_days": 90,
    "archive_before_delete": true,
    "description": "Keep activity logs for 90 days"
}

# Apply retention policies (delete expired data)
POST /api/enterprise/governance/apply-retention
```

#### 3. GDPR Data Subject Requests
Handle access, erasure, and portability requests.

```python
# Create data subject request
POST /api/enterprise/governance/data-requests
{
    "request_type": "access",  # access, erasure, rectification, portability
    "subject_id": "user_123",
    "subject_email": "user@example.com"
}

# Get pending requests
GET /api/enterprise/governance/data-requests

# Process a request
POST /api/enterprise/governance/data-requests/{request_id}/process
```

#### 4. Compliance Reports

```python
# Get compliance report
GET /api/enterprise/governance/compliance-report
```

---

## ⚡ Circuit Breaker

**Service:** `backend/services/circuit_breaker.py`

### Features

Prevent cascading failures with automatic circuit breaker pattern.

#### States
- **CLOSED:** Normal operation, requests pass through
- **OPEN:** Failures exceeded threshold, requests fail fast
- **HALF_OPEN:** Testing if service recovered

#### Usage in Code

```python
from backend.services.circuit_breaker import with_circuit_breaker

@with_circuit_breaker("external_api", failure_threshold=5, recovery_timeout=30)
async def call_external_api():
    # If this fails 5 times, circuit opens for 30 seconds
    return await external_service.fetch_data()
```

#### Monitoring

```python
# Get all circuit breaker statuses
GET /api/enterprise/circuit-breakers
```

---

## 🚀 Deployment Configuration

### Environment Variables

```env
# ============ ENTERPRISE FEATURES ============

# Security
ENTERPRISE_SECURITY_ENABLED=true
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
MAX_CONCURRENT_SESSIONS=5
IP_FILTER_MODE=blacklist

# Audit
ENTERPRISE_AUDIT_ENABLED=true
AUDIT_RETENTION_DAYS=365
AUDIT_HASH_ALGORITHM=sha256

# Feature Flags
FEATURE_FLAGS_ENABLED=true
FEATURE_FLAGS_CACHE_TTL=60

# Data Governance
DATA_GOVERNANCE_ENABLED=true
GDPR_COMPLIANCE_MODE=true
DEFAULT_RETENTION_DAYS=365

# Observability
STRUCTURED_LOGGING=true
LOG_LEVEL=INFO
METRICS_ENABLED=true
TRACING_ENABLED=true
```

### MongoDB Collections

Enterprise features use these collections:

| Collection | Purpose |
|------------|---------|
| `enterprise_audit_logs` | Immutable audit trail |
| `security_ip_lists` | IP whitelist/blacklist |
| `security_locked_accounts` | Locked account records |
| `security_sessions` | Active user sessions |
| `security_events` | Security event log |
| `feature_flags` | Feature flag definitions |
| `retention_policies` | Data retention rules |
| `data_subject_requests` | GDPR requests |
| `data_archive` | Archived data before deletion |

---

## 📋 API Quick Reference

### Security Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/enterprise/security/summary` | Security status |
| GET | `/api/enterprise/security/ip-lists` | IP lists |
| POST | `/api/enterprise/security/ip-list` | Add IP |
| DELETE | `/api/enterprise/security/ip-list/{ip}` | Remove IP |
| GET | `/api/enterprise/security/locked-accounts` | Locked accounts |
| POST | `/api/enterprise/security/unlock-account` | Unlock account |
| GET | `/api/enterprise/security/events` | Security events |
| GET | `/api/enterprise/security/sessions/{user_id}` | User sessions |
| DELETE | `/api/enterprise/security/sessions/{user_id}` | Terminate sessions |

### Audit Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/enterprise/audit/logs` | Search audit logs |
| GET | `/api/enterprise/audit/verify-integrity` | Verify integrity |
| GET | `/api/enterprise/audit/compliance-report` | Generate report |

### Feature Flags Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/enterprise/features` | List all flags |
| GET | `/api/enterprise/features/enabled` | User's enabled flags |
| GET | `/api/enterprise/features/{key}` | Check feature |
| POST | `/api/enterprise/features` | Create flag |
| PATCH | `/api/enterprise/features/{key}` | Update flag |
| POST | `/api/enterprise/features/{key}/enable` | Enable flag |
| POST | `/api/enterprise/features/{key}/disable` | Disable flag |
| DELETE | `/api/enterprise/features/{key}` | Delete flag |

### Data Governance Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/enterprise/governance/inventory` | Data inventory |
| GET | `/api/enterprise/governance/compliance-report` | Compliance report |
| GET | `/api/enterprise/governance/retention-policies` | List policies |
| POST | `/api/enterprise/governance/retention-policies` | Set policy |
| POST | `/api/enterprise/governance/apply-retention` | Apply policies |
| POST | `/api/enterprise/governance/data-requests` | Create GDPR request |
| GET | `/api/enterprise/governance/data-requests` | Pending requests |
| POST | `/api/enterprise/governance/data-requests/{id}/process` | Process request |

### Metrics Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/enterprise/metrics` | All metrics |
| GET | `/api/enterprise/metrics/prometheus` | Prometheus format |
| GET | `/api/enterprise/circuit-breakers` | Circuit breaker status |

---

## 🔒 Security Considerations

1. **All enterprise endpoints require authentication**
2. **Admin-only endpoints require `role: admin`**
3. **Audit logs are immutable** - use hash chain verification
4. **Session tokens are encrypted** in storage
5. **IP lists support CIDR notation** for subnet blocking
6. **GDPR requests are logged** in audit trail

---

## 📈 Monitoring Recommendations

1. **Set up alerts** for:
   - Circuit breaker state changes
   - Multiple failed login attempts
   - IP blacklist additions
   - Audit integrity failures

2. **Export metrics** to Prometheus/Grafana:
   ```
   GET /api/enterprise/metrics/prometheus
   ```

3. **Review security events** daily:
   ```
   GET /api/enterprise/security/events?severity=high
   ```

4. **Generate compliance reports** monthly:
   ```
   GET /api/enterprise/audit/compliance-report?days=30
   ```

---

*Last updated: December 2025*
