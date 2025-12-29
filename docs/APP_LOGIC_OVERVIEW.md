# App Logic Overview

Purpose: Explain how the Stock Verification System starts, authenticates, moves data through core workflows, and where to change behavior safely.
Audience: Engineers, support, QA; assumes familiarity with FastAPI, MongoDB, and the existing API surface.
Scope: Backend behavior (FastAPI + MongoDB + SQL Server read-only), aligned with FR-001..FR-008 in specs/004-app-logic-docs/spec.md.

> **Document Roles**:
>
> - **This document** (`APP_LOGIC_OVERVIEW.md`): **Descriptive** — describes actual runtime behavior, data flows, and implementation details. Use for debugging, onboarding, and understanding how the system works.
> - **[API_CONTRACTS.md](API_CONTRACTS.md)**: **Normative** — defines the target API contract, response envelopes, and standards. Use for API design decisions and client implementation guidance.
>
> When they conflict, this document reflects *what is*, while `API_CONTRACTS.md` reflects *what should be*.

## How to Use This Document

- Start here for system behavior; jump to the sections matching FR-001..FR-008.
- Use specs/004-app-logic-docs/quickstart.md for run/validate steps and cross-references.
- For formal contracts, see [docs/API_CONTRACTS.md](API_CONTRACTS.md); this document reflects runtime behavior and calls out gaps.

## How to Validate Against /api/docs

- Start the backend (see specs/004-app-logic-docs/quickstart.md for commands and ports).
- Open <http://localhost:8001/api/docs> to confirm routes, auth requirements, and response envelopes.
- Cross-check sections below against the OpenAPI surface and note any drift.

---

## FR-001 System Startup & Readiness

### Canonical Entrypoint

- **Runtime**: `uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload`
- **Docker**: `docker-compose.yml` runs `uvicorn backend.server:app` on port **8001**
- **Manual start**: `./start_app.sh` (macOS) spawns backend in Terminal tab

### Startup Sequence

1. **Config load**: `backend/config.py` loads env vars and validates secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET` must be set)
2. **Logging setup**: `setup_logging()` configures app-wide logging from `settings.LOG_LEVEL`
3. **Tracing init** (optional): `init_tracing()` if OpenTelemetry is enabled
4. **MongoDB connection**: `AsyncIOMotorClient` connects to `settings.MONGO_URL`, uses DB `settings.DB_NAME`
   - Pool settings: maxPoolSize=100, minPoolSize=10, serverSelectionTimeoutMS=5000
5. **Database optimizer**: Applies connection optimizations (non-pytest only)
6. **SQL Server pool** (optional): `EnhancedSQLServerConnectionPool` if configured
7. **Services init**: Cache (Redis optional), rate limiter, monitoring, scheduled exports
8. **Auth dependencies**: `init_auth_dependencies()` sets up JWT secret/algorithm
9. **Router registration**: All API routers registered with prefixes (see API Mounting below)
10. **Indexes**: `create_indexes()` ensures MongoDB indexes exist
11. **Migrations**: `MigrationManager` runs pending migrations
12. **Lifespan startup**: `@asynccontextmanager lifespan` finalizes services

### Readiness Indicators

- **Health check**: `GET /health` or `GET /api/health` returns `{"status": "healthy", ...}`
- **Blocking failures**: Missing `JWT_SECRET`/`JWT_REFRESH_SECRET` → startup fails immediately
- **Logs**: Look for `"✓ Phase 1-3 upgrade routers registered"` to confirm full startup

### Expected Ports

| Context | Port | Notes |
|---------|------|-------|
| Backend (default) | 8001 | API server |
| Expo dev | 8081, 19000-19002, 19006 | React Native dev tools |
| Docker frontend | 3000 | Web build |
| MongoDB | 27017 | Default Mongo port |

---

## FR-002 Authentication & Access Control

### JWT Bearer Authentication

- **Protected routes**: All `/api/*` endpoints require `Authorization: Bearer <token>` (except health/auth endpoints)
- **Dependency**: `Depends(get_current_user)` in `backend/auth/dependencies.py`
- **Secret**: `settings.JWT_SECRET` (validated at startup)
- **Algorithm**: `settings.JWT_ALGORITHM` (default: HS256)

### Token Lifecycle

| Token Type | Expiry (default) | Config Key |
|------------|------------------|------------|
| Access Token | 15 minutes | `ACCESS_TOKEN_EXPIRE_MINUTES` |
| Refresh Token | 30 days | `REFRESH_TOKEN_EXPIRE_DAYS` |

**Issue flow** (`POST /api/auth/login`):

1. Rate limit check (configurable via `RATE_LIMIT_ENABLED`)
2. User lookup by username in MongoDB `users` collection
3. Password verify (Argon2 or bcrypt)
4. Generate access + refresh tokens via `RefreshTokenService`
5. Store refresh token in DB; return both tokens

**Refresh flow** (`POST /api/auth/refresh`):

1. Validate refresh token signature
2. Check token exists and not revoked in DB
3. Issue new access token

### Common Rejection Reasons

| HTTP Status | Reason |
|-------------|--------|
| 401 `UNAUTHORIZED` | Missing or invalid token |
| 401 `TOKEN_EXPIRED` | JWT expired |
| 401 `INVALID_CREDENTIALS` | Bad username/password |
| 403 `INSUFFICIENT_PERMISSIONS` | Role not allowed |
| 429 `RATE_LIMITED` | Too many login attempts |

### Public Endpoints (no auth required)

- `GET /health`, `GET /api/health` — health checks
- `POST /api/auth/login`, `POST /api/auth/register` — auth flows
- `GET /api/docs`, `GET /api/openapi.json` — OpenAPI docs

---

## FR-003 Core Stock Verification Workflow

The system supports a structured verification workflow: **Session → Item Lookup → Verification/Count → Variance → Sync → Close**.

### 3.1 Sessions (Create/List/Active)

**Router**: `backend/api/session_management_api.py` → `/api/sessions`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sessions` | GET | List sessions (paginated, filtered by status/user) |
| `/api/sessions` | POST | Create new session |
| `/api/sessions/active` | GET | Get currently active session |
| `/api/sessions/{id}` | GET | Get session details |
| `/api/sessions/{id}/heartbeat` | POST | Renew session lock + user presence |

**Session lifecycle**:

```text
OPEN → ACTIVE (heartbeat) → COMPLETED/CLOSED
         ↓
       PAUSED (optional)
```

**Key behaviors**:

- Session requires `warehouse` (cannot be empty)
- Staff users see only their own sessions; supervisors see all
- Heartbeat renews rack locks (TTL-based) and user presence
- `SessionDetail` tracks `item_count`, `verified_count`, `started_at`, `last_heartbeat`

**Side effects**:

- Creates entry in `sessions` collection (MongoDB)
- May acquire rack locks via `LockManager` (Redis)

---

### 3.2 Item Lookup (ERP Flow)

**Router**: `backend/api/enhanced_item_api.py` → `/api/v2/erp/items`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/erp/items/barcode/{barcode}/enhanced` | GET | Lookup item by barcode with caching |
| `/api/v2/erp/items/search/advanced` | GET | Advanced search with filters |

**Barcode validation** (performance-critical):

1. Input normalized via `_normalize_barcode_input()` from `erp_api.py`
2. Valid prefixes: `51`, `52`, `53` (6-digit numeric rule for ERP items)
3. Lookup strategy: Cache → MongoDB `erp_items` → 404

**Response includes**:

```json
{
  "item": { "item_code": "...", "item_name": "...", "barcode": "...", ... },
  "metadata": { "source": "mongodb|cache", "response_time_ms": 12.5, ... }
}
```

**Performance notes**:

- Caching enabled via `cache_service.set_async()` on successful lookups
- Monitoring via `MonitoringService.track_request()`
- Force source override available (`?force_source=mongodb`)

---

### 3.3 Item Verification Flow

**Router**: `backend/api/item_verification_api.py` → `/api/v2/erp/items`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/erp/items/{item_code}/verify` | PATCH | Mark item verified with qty/condition |
| `/api/v2/erp/items/{item_code}/update-master` | PATCH | Update MRP, price, category |
| `/api/v2/erp/items/variances` | GET | List items with variances |
| `/api/v2/erp/items/export/csv` | GET | Export filtered items as CSV |

**VerificationRequest fields**:

| Field | Type | Description |
|-------|------|-------------|
| `verified` | bool | Verification status |
| `verified_qty` | float | Counted quantity |
| `damaged_qty` | float | Damaged quantity |
| `item_condition` | string | "Good", "Damaged", etc. |
| `serial_number` | string | Optional serial |
| `session_id` | string | Linking session |
| `notes` | string | Optional notes |

**Side effects**:

- Updates `erp_items` collection: sets `verified`, `verified_at`, `verified_by`
- May create variance record if quantity differs from expected
- Logs action to audit trail

---

### 3.4 Offline Sync (Batch + Heartbeat)

**Router**: `backend/api/sync_batch_api.py` → `/api/sync`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sync/batch` | POST | Submit offline queue records |
| `/api/sync/heartbeat` | POST | Device presence/health check |

**BatchSyncRequest structure**:

```python
{
  "records": [...],       # Modern structured records
  "operations": [...],    # Legacy offline payload (backward compat)
  "batch_id": "uuid"      # Client tracking ID
}
```

**Conflict types detected**:

| Type | Description |
|------|-------------|
| `duplicate_serial` | Serial number already exists |
| `invalid_data` | Validation failed (missing fields, bad format) |
| `lock_conflict` | Rack/resource locked by another user |
| `session_closed` | Target session no longer active |

**Response shape**:

```json
{
  "ok": ["record_id_1", "record_id_2"],
  "conflicts": [{ "client_record_id": "...", "conflict_type": "...", "message": "..." }],
  "errors": [...],
  "processing_time_ms": 45.2,
  "total_records": 10
}
```

**Services involved**:

- `SyncConflictsService` — conflict detection and storage
- `LockManager` — rack lock validation
- `circuit_breaker` — resilience pattern for external calls
- `batch_rate_limiter` — throttling protection

---

### 3.5 Reporting & Exports

**Routers**:

- `backend/api/reporting_api.py` → `/api/reports`
- `backend/api/report_generation_api.py` → `/api/reports`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/reports/query/preview` | POST | Preview aggregation results |
| `/api/reports/snapshots` | POST | Create snapshot from query |
| `/api/reports/snapshots` | GET | List snapshots |
| `/api/reports/snapshots/{id}/export` | GET | Export snapshot data |
| `/api/reports/compare` | POST | Compare two snapshots |

**Report types** (from `report_generation_api.py`):

| Report | Description | Source Collection |
|--------|-------------|-------------------|
| `stock_summary` | Stock levels and verification status | `erp_items` |
| `variance_report` | Discrepancies between expected/counted | `verification_records` |
| `user_activity` | User actions and productivity | `audit_logs` |
| `session_history` | Session details and outcomes | `verification_sessions` |
| `audit_trail` | Complete system action log | `audit_logs` |

**Export formats**: `json`, `csv`, `xlsx`

**Filter options**:

- `date_from`, `date_to` — date range
- `warehouse`, `floor`, `category` — location/category filters
- `user_id`, `status` — user and status filters

**"No data" scenarios**:

- Empty collection for date range → returns `{"data": [], "summary": {...}}`
- Check `summary.total_records` before processing

---

### 3.6 Troubleshooting Flow

| Symptom | Likely Subsystem | Starting Point |
|---------|------------------|----------------|
| Login fails repeatedly | Auth / Rate limiting | `backend/api/auth.py`, check `RATE_LIMIT_ENABLED` |
| Session not found | Session management | `backend/api/session_management_api.py`, verify session status |
| Barcode returns 404 | ERP item lookup | `backend/api/enhanced_item_api.py`, check normalization rules |
| Verification doesn't save | Verification API | `backend/api/item_verification_api.py`, check auth + session_id |
| Sync conflicts | Offline sync | `backend/api/sync_batch_api.py`, review conflict types |
| Report empty | Reporting | `backend/api/report_generation_api.py`, check date filters |
| Slow barcode lookup | Caching | Check `cache_service` init, Redis availability |
| Rack lock timeout | Lock manager | `backend/services/lock_manager.py`, Redis TTL settings |

## FR-004 Key Data Objects & Lifecycles

### 4.1 MongoDB Collections (Operational Store)

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User accounts, auth credentials | `username`, `hashed_password`, `pin_hash`, `role` |
| `sessions` | Stock verification sessions | `warehouse`, `status`, `staff_user`, `started_at`, `closed_at` |
| `erp_items` | Cached ERP item master data | `item_code`, `barcode`, `stock_qty`, `verified`, `variance` |
| `count_lines` | Individual count/verification records | `session_id`, `item_code`, `counted_qty`, `damaged_qty` |
| `verification_records` | Completed verification history | `item_code`, `verified_qty`, `verified_by`, `verified_at` |
| `audit_logs` | User action audit trail | `user_id`, `action`, `resource_type`, `timestamp` |
| `sync_conflicts` | Offline sync conflict records | `client_record_id`, `conflict_type`, `resolved` |
| `sync_metadata` | Sync job status and timestamps | `last_sync_at`, `status`, `total_synced` |

### 4.2 Session Lifecycle

```text
┌───────────┐   create   ┌────────────┐   heartbeat   ┌────────────┐
│           │ ─────────► │            │ ─────────────► │            │
│   (new)   │            │    OPEN    │               │   ACTIVE   │
│           │            │            │ ◄───────────── │            │
└───────────┘            └────────────┘   claim rack   └────────────┘
                                │                            │
                                │ close/timeout              │ close
                                ▼                            ▼
                         ┌────────────┐              ┌────────────┐
                         │   CLOSED   │              │   CLOSED   │
                         └────────────┘              └────────────┘
```

**Status values**: `OPEN` → `ACTIVE` (via heartbeat/rack claim) → `CLOSED`

**Legacy**: `RECONCILE` status mapped to `ACTIVE` internally (backward compat).

### 4.3 ERPItem Lifecycle

```text
SQL Server (ERP)     ──sync──►     MongoDB (erp_items)
   │                                    │
   └─ read-only source                 └─ operational cache + verification state
```

**Verification state fields on `erp_items`**:

| Field | Description |
|-------|-------------|
| `verified` | bool — has item been verified? |
| `verified_by` | User ID who verified |
| `verified_at` | Timestamp of verification |
| `verified_qty` | Counted quantity |
| `variance` | Difference from `stock_qty` |
| `damaged_qty` | Damaged items counted |
| `item_condition` | "Good", "Damaged", etc. |

### 4.4 CountLine Record

Each scan/count creates a `count_line` document:

```python
{
    "_id": ObjectId,
    "session_id": "uuid",
    "item_code": "ABC123",
    "counted_qty": 10.0,
    "damaged_qty": 2.0,
    "floor_no": "1",
    "rack_no": "A5",
    "serial_numbers": ["SN001", "SN002"],
    "variance_reason": "miscount",
    "photo_base64": "...",       # Optional photo proof
    "created_by": "user_id",
    "created_at": datetime
}
```

### 4.4.1 CountLine Lifecycle

```text
┌─────────────┐   scan/count   ┌─────────────┐   sync batch   ┌─────────────┐
│             │ ─────────────► │             │ ─────────────► │             │
│   (draft)   │                │   QUEUED    │                │  SUBMITTED  │
│   offline   │                │   offline   │                │   online    │
└─────────────┘                └─────────────┘                └─────────────┘
                                      │                              │
                                      │ validation                   │ rollup
                                      │ error                        │ complete
                                      ▼                              ▼
                               ┌─────────────┐               ┌─────────────┐
                               │   FAILED    │               │  FINALIZED  │
                               │  (conflict) │               │  (in report)│
                               └─────────────┘               └─────────────┘
```

**State values**: `draft` → `queued` → `submitted` → `finalized` (or `failed`)

**Validation rules**:

- If `variance != 0`, then `variance_reason` is required
- `session_id` must reference an active session
- `item_code` must exist in `erp_items`

### 4.5 Audit Log Entry

All significant user actions logged via `AuditAction` enum:

| Category | Actions |
|----------|---------|
| Auth | `LOGIN`, `LOGIN_PIN`, `LOGOUT`, `CHANGE_PIN`, `CHANGE_PASSWORD` |
| Session | `SESSION_START`, `SESSION_END`, `SESSION_CLAIM_RACK`, `SESSION_RELEASE_RACK` |
| Item | `ITEM_SCAN`, `ITEM_VERIFY`, `ITEM_UPDATE`, `ITEM_SEARCH` |
| Sync | `SYNC_START`, `SYNC_COMPLETE`, `SYNC_ERROR` |
| Report | `REPORT_GENERATE`, `REPORT_EXPORT` |
| Admin | `USER_CREATE`, `USER_UPDATE`, `USER_DELETE`, `USER_DEACTIVATE` |

**Schema** (`backend/core/schemas/audit_log.py`):

```python
{
    "user_id": "...",
    "username": "...",
    "action": "ITEM_VERIFY",
    "resource_type": "item",
    "resource_id": "ABC123",
    "details": {...},
    "ip_address": "192.168.1.100",
    "timestamp": datetime
}
```

### 4.6 Store Authority

| Data Type | Authoritative Store | Notes |
|-----------|---------------------|-------|
| Item master (name, price, category) | SQL Server (ERP) | Read-only; synced to MongoDB |
| Verification state | MongoDB | Written by verification API |
| Session data | MongoDB | Created/updated by session API |
| User accounts | MongoDB | Managed by auth module |
| Audit trail | MongoDB | Append-only log |

### 4.7 Sample End-to-End Trace

This trace follows a complete verification workflow from login to report:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: AUTHENTICATION                                                     │
│  POST /api/auth/login {username, password}                                  │
│  └─► MongoDB.users → verify Argon2 hash → return {access_token, user}       │
│      State: users.last_login updated; audit_logs += LOGIN                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 2: START SESSION                                                      │
│  POST /api/sessions/ {label, type}                                          │
│  └─► MongoDB.sessions.insert({status: "OPEN", count_lines: 0})              │
│      State: New session document created; audit_logs += SESSION_START       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 3: SCAN ITEM (may be offline)                                         │
│  GET /api/items/barcode/{barcode}                                           │
│  └─► MongoDB.erp_items (or SQL Server fallback) → return item details       │
│      If offline: lookup from local cache, queue for later sync              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 4: RECORD COUNT LINE                                                  │
│  POST /api/count-lines {session_id, item_code, counted_qty, variance_reason}│
│  └─► MongoDB.count_lines.insert({status: "queued"})                         │
│      Validation: If variance > 0, variance_reason required                  │
│      State: count_lines document created; session.count updated             │
│      audit_logs += ITEM_VERIFY                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 5: OFFLINE SYNC (if applicable)                                       │
│  POST /api/sync/batch {operations: [...]}                                   │
│  └─► BatchSyncService validates each operation                              │
│      On success: count_lines.status → "submitted"                           │
│      On conflict: sync_conflicts.insert({...}); status → "failed"           │
│      State: sync_metadata updated with last_sync timestamp                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 6: CLOSE SESSION                                                      │
│  POST /api/sessions/{id}/close                                              │
│  └─► session.status → "CLOSED"; session.completed_at = now()                │
│      All count_lines.status → "finalized"                                   │
│      State: Session immutable; audit_logs += SESSION_END                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  STEP 7: GENERATE REPORT                                                    │
│  POST /api/reports/generate {session_id, format: "xlsx"}                    │
│  └─► Aggregate count_lines by session → compute variances → export file     │
│      State: reports collection updated; audit_logs += REPORT_GENERATE       │
│      Returns: {report_id, download_url}                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data state summary at each step:**

| Step | Collection Changed | Key Fields Updated |
|------|-------------------|--------------------|
| 1 | users, audit_logs | `last_login`, new audit entry |
| 2 | sessions, audit_logs | New session doc with `status: OPEN` |
| 3 | (read only) | None - lookup only |
| 4 | count_lines, sessions, audit_logs | New count_line, session `count++` |
| 5 | count_lines, sync_metadata, sync_conflicts | `status: submitted`, sync timestamp |
| 6 | sessions, count_lines, audit_logs | `status: CLOSED`, lines finalized |
| 7 | reports, audit_logs | New report doc, download link |

## FR-005 Offline Sync & Conflict Handling

### 5.1 Overview

Mobile clients queue operations offline and batch-submit when connectivity resumes. The sync system validates, detects conflicts, and applies changes atomically where possible.

### 5.2 Batch Submission Flow

```text
Mobile Queue  ──POST /api/sync/batch──►  BatchSyncService
     │                                        │
     │                                   ┌────┴────┐
     │                                   │ Validate │
     │                                   └────┬────┘
     │                                        │
     │                          ┌─────────────┼─────────────┐
     │                          ▼             ▼             ▼
     │                       SUCCESS      CONFLICT        ERROR
     │                          │             │             │
     │                          ▼             ▼             ▼
     │                     Apply to DB   Store conflict   Return error
     │                                        │
     └────────◄────Response { ok, conflicts, errors }─────────┘
```

### 5.3 Request/Response Structure

**Request** (`BatchSyncRequest`):

```python
{
    "records": [                     # Modern structured records
        {
            "client_record_id": "uuid",
            "operation": "count_update",
            "entity_type": "count_line",
            "payload": {...}
        }
    ],
    "operations": [...],             # Legacy format (backward compat)
    "batch_id": "uuid"               # Client tracking ID
}
```

**Response** (`BatchSyncResponse`):

```python
{
    "ok": ["record_id_1", ...],              # Successfully applied
    "conflicts": [                           # Conflicts detected
        {
            "client_record_id": "...",
            "conflict_type": "duplicate_serial",
            "message": "Serial SN001 already exists",
            "server_value": {...}            # Current server state
        }
    ],
    "errors": ["record_id_3: validation failed"],
    "processing_time_ms": 45.2,
    "total_records": 10
}
```

### 5.4 Conflict Types

| Type | Cause | Resolution |
|------|-------|------------|
| `duplicate_serial` | Serial number already recorded | Client must choose new serial or override |
| `lock_conflict` | Rack/item locked by another user | Wait for lock release or contact admin |
| `session_closed` | Target session no longer active | Create new session or select active one |
| `invalid_data` | Validation failed (missing fields, bad format) | Client must fix and resubmit |
| `version_conflict` | Record modified since client snapshot | Merge or override decision |

### 5.5 Conflict Storage

Conflicts are stored in `sync_conflicts` collection for later review:

```python
{
    "_id": ObjectId,
    "batch_id": "uuid",
    "client_record_id": "uuid",
    "conflict_type": "duplicate_serial",
    "message": "...",
    "client_value": {...},
    "server_value": {...},
    "resolved": False,
    "resolved_by": None,
    "resolved_at": None,
    "created_at": datetime
}
```

### 5.6 Telemetry & Diagnostics

- **Metrics tracked**: `sync_batch_total`, `sync_conflicts_total`, `sync_processing_time_ms`
- **Logging**: All batch submissions logged with `batch_id`, user, record count
- **Circuit breaker**: External service calls (ERP) protected by `circuit_breaker` pattern
- **Rate limiting**: `batch_rate_limiter` prevents abuse (configurable via env)

## FR-006 Reporting & Analytics

### 6.1 Available Reports

| Report Type | Description | Key Inputs | Answers |
|-------------|-------------|------------|---------|
| `stock_summary` | Current stock levels and verification status | `warehouse`, `category`, `verified` filter | "How much stock do we have? What's verified?" |
| `variance_report` | Discrepancies between expected and counted | `date_from`, `date_to`, `threshold` | "Where are the major variances?" |
| `user_activity` | User actions and productivity metrics | `user_id`, `date_range` | "Who did what? How productive?" |
| `session_history` | Session details and outcomes | `warehouse`, `status`, `date_range` | "What sessions ran? Results?" |
| `audit_trail` | Complete system action log | `action`, `user_id`, `date_range` | "What happened when?" |

### 6.2 Query & Snapshot Pattern

1. **Preview**: `POST /api/reports/query/preview` — test query without saving
2. **Create snapshot**: `POST /api/reports/snapshots` — save query results for later
3. **List snapshots**: `GET /api/reports/snapshots` — retrieve saved snapshots
4. **Export**: `GET /api/reports/snapshots/{id}/export?format=csv` — download data
5. **Compare**: `POST /api/reports/compare` — diff two snapshots

### 6.3 Export Formats

| Format | Use Case |
|--------|----------|
| `json` | API integration, programmatic access |
| `csv` | Excel/spreadsheet import, data analysis |
| `xlsx` | Direct Excel with formatting |

### 6.4 Filter Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `date_from` | datetime | Start of date range (UTC) |
| `date_to` | datetime | End of date range (UTC) |
| `warehouse` | string | Filter by warehouse code |
| `floor` | string | Filter by floor |
| `category` | string | Filter by item category |
| `user_id` | string | Filter by user who performed action |
| `status` | string | Filter by session/verification status |
| `verified` | bool | Filter verified/unverified items |

### 6.5 "No Data" Scenarios

**Symptom**: Report returns empty or `{"data": [], "summary": {"total_records": 0}}`

**Common causes**:

1. **Date range too narrow** — expand `date_from`/`date_to`
2. **Wrong warehouse** — verify warehouse code exists
3. **No matching status** — check status filter value
4. **Data not synced yet** — run ERP sync if items missing

**Troubleshooting**:

```bash
# Check if data exists
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8001/api/reports/query/preview" \
  -d '{"report_type": "stock_summary", "filters": {}}'
```

### 6.6 Scheduling & Performance

- **No built-in scheduler** — use external cron/task runner for scheduled reports
- **Large exports**: Reports with >10,000 rows may timeout; use pagination or narrower filters
- **Caching**: Report results cached for 5 minutes by default (configurable)
- **Background generation**: Not currently supported; all reports synchronous

## FR-007 Where to Change Behavior

### 7.1 Common Change Intents

| Intent | Primary Module | Supporting Files | Tests/Config |
|--------|----------------|------------------|--------------|
| Barcode validation rules | `backend/api/erp_api.py` (`_normalize_barcode_input`) | `enhanced_item_api.py` | `tests/api/test_erp_api.py` |
| Variance thresholds | `backend/api/item_verification_api.py` | `config.py` (if configurable) | Update variance tests |
| Session status rules | `backend/api/session_management_api.py` | `backend/api/schemas.py` | `tests/api/test_session_api.py` |
| Sync conflict handling | `backend/api/sync_batch_api.py` | `services/sync_conflicts_service.py` | `tests/services/test_sync.py` |
| Report types/filters | `backend/api/report_generation_api.py` | `reporting_api.py` | Endpoint tests |
| Auth token expiry | `backend/config.py` | `backend/api/auth.py` | Integration tests |
| Rate limiting | `backend/config.py` | `middleware/rate_limit.py` | Load tests |
| ERP sync schedule | External cron | `scripts/sync_erp_full.py` | N/A |

### 7.2 Change Checklist

When modifying any workflow:

1. **Read existing tests** for the module
2. **Check config.py** for related settings
3. **Verify API contracts** in `docs/API_CONTRACTS.md`
4. **Update OpenAPI** if response shape changes
5. **Run affected tests**: `pytest backend/tests/ -k <module_name> -v`
6. **Check frontend impact**: Search `frontend/` for API calls to changed endpoint

### 7.3 Guardrails

| Module | Guardrails |
|--------|------------|
| Auth | Never weaken password requirements; always hash credentials |
| Barcode | Maintain 6-digit numeric rule for ERP items; test edge cases |
| Session | Preserve backward compat for `RECONCILE` → `ACTIVE` mapping |
| Sync | Keep conflict types stable; don't remove existing types |
| Reports | Ensure empty results return valid structure, not errors |

## FR-008 Compatibility & Pitfalls

### 8.1 Compatibility Layers

This system has evolved through multiple phases, creating compatibility layers that must be understood:

#### Dual Session Collections

| Collection | Purpose | Usage |
|------------|---------|-------|
| `sessions` | Operational session storage | Original session API (`session_api.py`) |
| `verification_sessions` | Verification-oriented data | Newer verification flows (`session_management_api.py`) |

**Guidance**: New code should use `verification_sessions` via `session_management_api.py`. Both collections are kept in sync for backward compatibility.

#### Legacy Payload Shapes

| Field | Legacy | Current | Notes |
|-------|--------|---------|-------|
| Sync batch array | `operations` | `records` | Both accepted; `records` preferred |
| Session status | `RECONCILE` | `ACTIVE` | Normalizer converts automatically |
| Item lookup response | Flat object | Nested with cache metadata | V2 API adds wrapper fields |

#### Mixed Response Envelopes

The API uses multiple response patterns simultaneously:

```python
# Pattern 1: Direct model (most endpoints)
return Session(...)

# Pattern 2: Paginated response
return PaginatedResponse(items=[...], total=100, page=1, page_size=20)

# Pattern 3: ApiResponse wrapper (some newer endpoints)
return ApiResponse(success=True, data={...})

# Pattern 4: Dict with success field (legacy)
return {"success": True, "data": {...}}
```

### 8.2 Legacy & Overlapping Routes

#### Active Overlapping Routes

| Route Pattern | Handlers | Notes |
|---------------|----------|-------|
| `/api/sessions` | `session_api.py` + `session_management_api.py` | Management API is preferred |
| `/api/erp/items` | `erp_api.py` (v1) + `enhanced_item_api.py` (v2) | V2 has caching/monitoring |
| `/api/sync` | `sync_api.py` + `sync_batch_api.py` | Batch API is primary |
| `/health` + `/api/health` | Dual-mounted `health_router` | Both work; use `/health` for probes |

#### Legacy Routes File (Not Mounted)

`backend/api/legacy_routes.py` contains unmounted legacy functions:

- Auth functions (`create_access_token`, `refresh_token`, `logout`)
- Session CRUD (`create_session`, `get_sessions`, `bulk_close_sessions`)
- Count line operations (`create_count_line`, `verify_stock`, `unverify_stock`)
- Analytics (`get_sessions_analytics`)

**Status**: These are NOT registered in `server.py` and are kept for reference/migration only.

### 8.3 Legacy Behaviors

| Legacy Pattern | Current Behavior | Migration Path |
|----------------|------------------|----------------|
| `RECONCILE` session status | Mapped to `ACTIVE` internally | Check `reconciled_at` for reconciliation state |
| `/api/sessions` (legacy) | Still works, routed to `session_api.py` | Prefer `session_management_api.py` endpoints |
| `operations` in sync batch | Supported for backward compat | Use `records` array for new clients |
| Unwrapped response models | Many endpoints return raw Pydantic | Check OpenAPI for actual shape |

### 8.2 Overlapping Routes

| Route Pattern | Handlers | Notes |
|---------------|----------|-------|
| `/api/sessions` | `session_api.py` + `session_management_api.py` | Management API is preferred |
| `/api/erp/items` | `erp_api.py` (v1) + `enhanced_item_api.py` (v2) | V2 has caching/monitoring |
| `/api/sync` | `sync_api.py` + `sync_batch_api.py` | Batch API is primary |
| `/health` + `/api/health` | Dual-mounted | Both work; use `/health` for probes |

### 8.3 Response Envelope Inconsistencies

**Target** (`API_CONTRACTS.md`):

```json
{"success": true, "data": {...}, "timestamp": "...", "request_id": "..."}
```

**Reality**: Mixed patterns exist:

- `PaginatedResponse[T]` — has `items`, `total`, `page`, `page_size`
- Direct model return — e.g., `Session`, `SessionDetail`
- `ApiResponse[T]` — wrapper with `success`, `data`, `error`

**Guidance**: Check `/api/docs` OpenAPI for actual response schema.

### 8.4 Known Sharp Edges

| Issue | Symptoms | Mitigation |
|-------|----------|------------|
| Auth token expiry | 401 on valid user | Implement refresh flow; check `exp` claim |
| Invalid session states | Session not found after status change | Verify `OPEN`/`ACTIVE`/`CLOSED` only |
| Missing variance metadata | Variance report empty | Ensure `variance_reason` set on count lines |
| Duplicate serial conflicts | Sync batch fails | Pre-check serials before submission |
| No-data reports | Empty export file | Check filters; verify data exists for range |
| Rack lock timeout | Can't access rack | Check Redis TTL; wait or contact admin |
| Barcode not found | 404 on valid barcode | Check normalization rules; verify ERP sync |

### 8.5 Compatibility Guidance

When modifying flows:

1. **Don't break existing clients** — add new fields; don't remove or rename
2. **Version carefully** — `/api/v2/...` for breaking changes
3. **Test legacy paths** — ensure `operations` sync format still works
4. **Check frontend** — mobile app may cache old behavior
5. **Document changes** — update `CHANGELOG.md` and this file

### 8.6 Where to Change Behavior Safely

This mapping shows where specific behaviors are defined and how to modify them safely:

| Behavior | Primary Location | Config/Override | Change Risk |
|----------|-----------------|-----------------|-------------|
| **Barcode validation** | `backend/api/erp_api.py` (`_normalize_barcode_input`) | — | Medium: affects all lookups |
| **Barcode prefixes** | `_normalize_barcode_input` (valid: 51, 52, 53) | — | High: ERP-dependent |
| **Variance rules** | `backend/api/legacy_routes.py` + `sync_batch_api.py` | — | Medium: requires `variance_reason` if variance > 0 |
| **Session lifecycle** | `backend/api/session_management_api.py` | Status enum | Low: add states, don't remove |
| **Session types** | `Session` model (`STANDARD`, `BLIND`, `STRICT`) | — | Low: additive |
| **Sync batch size** | `config.py` or inline constants | `SYNC_BATCH_SIZE` env | Low: performance tuning |
| **Sync conflict rules** | `backend/api/sync_batch_api.py` (`_validate_operation`) | — | Medium: affects conflict detection |
| **Rate limiting** | `backend/config.py` | `RATE_LIMIT_*` env vars | Low: operational |
| **JWT expiry** | `backend/config.py` | `ACCESS_TOKEN_EXPIRE_MINUTES` | Low: auth timing |
| **Report formats** | `backend/api/report_generation_api.py` | — | Low: additive |
| **Audit actions** | `backend/core/schemas/audit_log.py` (`AuditAction` enum) | — | Low: additive |
| **CORS origins** | `backend/server.py` | `CORS_ALLOW_ORIGINS` env | Low: operational |
| **Item cache TTL** | `backend/api/enhanced_item_api.py` | — | Low: performance |

**Safe change patterns**:

- ✅ Add new enum values (session types, audit actions)
- ✅ Add new optional fields to request/response models
- ✅ Add new API endpoints under existing prefixes
- ✅ Increase limits or timeouts via environment variables

**Risky change patterns**:

- ⚠️ Changing barcode normalization (breaks existing scans)
- ⚠️ Removing or renaming response fields (breaks clients)
- ⚠️ Changing session state machine (breaks workflows)
- ⚠️ Modifying sync conflict logic (affects data integrity)

---

## API Mounting & Prefixing (Reference)

Most routers mount under `/api`. Key patterns:

| Router | Prefix | Notes |
|--------|--------|-------|
| `auth_router` | `/api` | Login, register, refresh |
| `items_router` | `/api/v2/erp/items` | Enhanced item lookup (V2) |
| `session_mgmt_router` | `/api/sessions` | Session management |
| `verification_router` | (own prefix) | Item verification |
| `sync_batch_router` | `/api/sync` | Batch sync |
| `reporting_router` | `/api/reports` | Reports/exports |
| `health_router` | `/health` + `/api` | Health checks (dual mount) |
| `enterprise_router` | `/api` | Enterprise features (if available) |
| `v2_router` | (loaded dynamically) | API v2 endpoints |

**No `/api/v1` prefix**: Routes use `/api/...` directly; `/api/v2/...` exists only for specific item/verification flows.

---

## Response Envelope Reality Check

**Contract goal** (from `docs/API_CONTRACTS.md`):

```json
{"success": true, "data": {...}, "timestamp": "...", "request_id": "..."}
```

**Actual behavior**: Many endpoints return unwrapped Pydantic models directly (e.g., `PaginatedResponse[...]`, `Session`, lists).

**Guidance**: Treat `API_CONTRACTS.md` as the target standard; this document describes *current runtime behavior*. Check OpenAPI at `/api/docs` for actual response shapes.
