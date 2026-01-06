# Standard Questions for SC-001 & SC-002 Validation

**Purpose**: Validate that a reviewer can answer these questions using `docs/APP_LOGIC_OVERVIEW.md` alone, without reading source code.

**Success Criteria**:
- **SC-001**: A new engineer can explain the end-to-end stock verification workflow after reading the documentation in under 30 minutes.
- **SC-002**: For a defined set of 10 standard "how does this work?" questions, reviewers can answer at least 9 correctly using the documentation alone.

---

## Questions

### Q1: System Startup (FR-001)
**Question**: What are the 3 blocking failures that will prevent the backend from starting successfully?

**Expected Answer**:
1. Missing `JWT_SECRET` environment variable
2. Missing `JWT_REFRESH_SECRET` environment variable
3. MongoDB connection failure (cannot reach `MONGO_URL`)

**Location in Doc**: FR-001 "Startup Sequence" and "Readiness Indicators"

---

### Q2: Authentication (FR-002)
**Question**: How long does an access token remain valid by default, and what happens when it expires?

**Expected Answer**:
- Access token: 15 minutes (default via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- When expired: Client must use refresh token (30-day validity) to obtain new access token via `POST /api/auth/refresh`

**Location in Doc**: FR-002 "Token Lifecycle" table

---

### Q3: Session Lifecycle (FR-003, FR-004)
**Question**: What are the valid state transitions for a stock verification session?

**Expected Answer**:
- `OPEN` → `ACTIVE` → `CLOSED`
- Legacy `RECONCILE` status maps to `ACTIVE`

**Location in Doc**: FR-004 "Session State Transitions" and data-model.md

---

### Q4: Item Lookup Flow (FR-003)
**Question**: When a user scans a barcode, which system is queried first, and what happens if the item is not found?

**Expected Answer**:
1. First check: MongoDB `erp_items` collection (cached/synced data)
2. If not found: Query SQL Server ERP (read-only) via `enhanced_item_api.py`
3. Cache result in MongoDB for future lookups
4. If still not found: Return 404 error

**Location in Doc**: FR-003 "Item Lookup (ERP Flow)" subsection

---

### Q5: Variance Handling (FR-003)
**Question**: When is a `variance_reason` required for a count line?

**Expected Answer**:
When `counted_qty` differs from system/expected quantity, `variance_reason` field becomes required (validation enforced by `CountLineCreate` schema)

**Location in Doc**: FR-003 "Item Verification Flow" and data-model.md CountLine validation rules

---

### Q6: Offline Sync Conflicts (FR-005)
**Question**: Name 3 types of conflicts that can occur during offline batch synchronization and how they are resolved.

**Expected Answer** (any 3 of 5):
1. **Duplicate serial**: Same serial number submitted multiple times → reject duplicate, keep first
2. **Locked resource**: Rack/session locked by another user → reject operation, notify user
3. **Invalid quantity**: Negative or non-numeric quantity → reject record, log validation error
4. **Conflicting records**: Same item counted twice with different values → flag for supervisor review
5. **Replayed operations**: Duplicate submission of same batch → idempotency check, skip duplicates

**Location in Doc**: FR-005 "Offline Sync & Conflict Handling" with conflict types table

---

### Q7: Data Source of Truth (FR-004)
**Question**: For operational stock verification data (sessions, count lines, variances), which database is the authoritative source of truth?

**Expected Answer**:
MongoDB is the authoritative source for operational state. SQL Server is read-only ERP source (never written to by this system).

**Location in Doc**: FR-004 "Source of Truth" section (4.6)

---

### Q8: Reporting Options (FR-006)
**Question**: What are the 5 available report types, and what format options exist for export?

**Expected Answer**:
- Report types: (1) Session summary, (2) Variance analysis, (3) Item verification status, (4) User activity, (5) Audit trail
- Export formats: JSON, CSV, XLSX

**Location in Doc**: FR-006 "Reporting & Analytics" with report types table

---

### Q9: Change Location Guide (FR-007)
**Question**: If you need to modify barcode validation rules (e.g., allow 8-digit barcodes), which module should you change?

**Expected Answer**:
`backend/api/erp_api.py` or `backend/api/enhanced_item_api.py` - contains `_normalize_barcode_input` function with validation logic (6-digit numeric, prefixes 51/52/53)

**Location in Doc**: FR-007 "Where to Change Behavior" table mapping change intents to modules

---

### Q10: Compatibility & Sharp Edges (FR-008)
**Question**: Why do two MongoDB collections store session data (`sessions` and `verification_sessions`), and what risk does this create?

**Expected Answer**:
- Dual collections exist for compatibility: `sessions` (operational) and `verification_sessions` (verification-oriented mirror)
- Risk: Data can become inconsistent between collections if updates don't write to both
- Mitigation: Use session service layer that writes to both collections

**Location in Doc**: FR-008 "Compatibility Layers" section (8.1) and data-model.md Session notes

---

## Scoring

- **Pass threshold**: 9 out of 10 correct (90%)
- **Time limit**: 30 minutes to read documentation + answer questions
- **Resources allowed**: Only `docs/APP_LOGIC_OVERVIEW.md` and `specs/004-app-logic-docs/` folder
- **Resources NOT allowed**: Source code, running backend, external documentation

---

## Validation Procedure

1. Select 3-5 reviewers (mix of new engineers and experienced maintainers)
2. Provide only the documentation (no source code access)
3. Set 30-minute timer
4. Have reviewers answer questions in writing
5. Score answers against expected answers (allow reasonable variations)
6. Record: pass/fail per question, total time taken, reviewer feedback
7. Target: ≥80% of reviewers score 9/10 or better
