# Incident Scenarios for SC-003 Validation

**Purpose**: Validate that support engineers can identify the correct owning subsystem for common incidents using `docs/APP_LOGIC_OVERVIEW.md` alone.

**Success Criteria**:
- **SC-003**: For a defined set of 5 common incidents, the time to identify the owning subsystem is reduced by at least 50% compared to a baseline without the documentation.

---

## Scenarios

### Scenario 1: "User cannot log in - keeps getting 401 Unauthorized"

**Reported Symptom**: 
Field staff member reports that login worked yesterday, but today they keep getting "Unauthorized" errors even with correct username/password.

**Expected Subsystem**: Authentication & Access Control (FR-002)

**Expected Starting Files**:
- `backend/api/auth.py` - login endpoint
- `backend/auth/dependencies.py` - JWT validation
- Check: Token expiry (15-min default), user account status (active/inactive), refresh token validity

**Reasoning Path** (from doc):
1. Check FR-002 "Authentication & Access Control"
2. Review "Common Rejection Reasons" table
3. Identify: expired token, inactive user, or missing refresh token
4. Follow "Token Lifecycle" section to understand flow

**Location in Doc**: FR-002 section, troubleshooting table in FR-003

---

### Scenario 2: "Session shows as OPEN but staff cannot add count lines"

**Reported Symptom**:
Supervisor started a verification session, but when staff members try to scan items and add counts, they get errors saying "Invalid session state."

**Expected Subsystem**: Session Management (FR-003, FR-004)

**Expected Starting Files**:
- `backend/api/session_management_api.py` - session state logic
- `backend/models/schemas.py` - Session status enum
- Check: Session status should be `ACTIVE`, not `OPEN`; session assignment to staff user

**Reasoning Path** (from doc):
1. Check FR-004 "Session State Transitions"
2. Identify: `OPEN` → must transition to `ACTIVE` before counting begins
3. Check FR-003 "Sessions: create/list/active" workflow
4. Verify: Session activation endpoint called, proper state transition

**Location in Doc**: FR-004 Session lifecycle diagram, FR-003 session workflow

---

### Scenario 3: "Offline sync batch failed with 'duplicate serial' errors"

**Reported Symptom**:
Field team worked offline for 2 days. When they synced, 50 records were rejected with "duplicate serial number" conflict. They claim they scanned each item only once.

**Expected Subsystem**: Offline Sync & Conflict Handling (FR-005)

**Expected Starting Files**:
- `backend/api/sync_batch_api.py` - batch submission logic
- `backend/services/sync_conflict_service.py` - conflict detection
- MongoDB collection: `item_serials` - serial tracking
- MongoDB collection: `sync_conflicts` - stored conflicts

**Reasoning Path** (from doc):
1. Check FR-005 "Offline Sync & Conflict Handling"
2. Review "5 conflict types" - identify "duplicate serial"
3. Check resolution: First submission wins, duplicates rejected
4. Investigate: Serial may have been submitted in earlier batch, or device offline queue replayed

**Location in Doc**: FR-005 conflict types table, batch submission flow diagram

---

### Scenario 4: "Variance report shows zero items but we counted 500 items"

**Reported Symptom**:
Team completed a full warehouse count (500+ items) with several variances. When supervisor generates variance report, it shows "No data available for selected period."

**Expected Subsystem**: Reporting & Analytics (FR-006)

**Expected Starting Files**:
- `backend/api/reporting_api.py` - report generation endpoints
- `backend/api/report_generation_api.py` - report data aggregation
- Check: Session finalized/closed, date filter range, warehouse filter, MongoDB collections populated

**Reasoning Path** (from doc):
1. Check FR-006 "Reporting & Analytics"
2. Review "No data troubleshooting" section
3. Check: Session status (must be `CLOSED`), filter mismatch (date/warehouse), rollup job completion
4. Verify: Count lines have `variance_reason` populated, session includes variance metadata

**Location in Doc**: FR-006 reporting section, "No data" troubleshooting table

---

### Scenario 5: "API returns 'Item not found' but item exists in ERP system"

**Reported Symptom**:
User scans barcode `520012345`, which exists in the ERP system (confirmed by warehouse manager checking SQL Server directly). But mobile app shows "Item not found" error.

**Expected Subsystem**: Item Lookup (ERP Flow) (FR-003)

**Expected Starting Files**:
- `backend/api/enhanced_item_api.py` - item lookup with caching
- `backend/api/erp_api.py` - barcode validation logic
- `backend/db_mapping_config.py` - SQL Server table/column mappings
- Check: Barcode format validation, SQL query, cache stale/missing, table mapping

**Reasoning Path** (from doc):
1. Check FR-003 "Item Lookup (ERP Flow)" subsection
2. Review barcode validation rules: 6-digit numeric, prefixes 51/52/53
3. Check: Does barcode pass `_normalize_barcode_input` validation?
4. If validation passes: Check SQL Server connection, table mapping, column names
5. Check: MongoDB `erp_items` cache, potential sync lag

**Location in Doc**: FR-003 item lookup flow, FR-007 "Where to Change Behavior" (barcode validation)

---

## Validation Procedure

### Baseline Measurement (No Documentation)

1. Select 5 support engineers (without access to documentation)
2. Present each scenario one at a time
3. Measure: Time to identify owning subsystem + starting files
4. Record: Average time per scenario, accuracy of subsystem identification

**Expected Baseline**: 10-15 minutes per scenario (need to grep code, trace imports, ask SMEs)

### Post-Documentation Measurement

1. Same 5 support engineers (after reading `docs/APP_LOGIC_OVERVIEW.md`)
2. Present scenarios again (or use new similar scenarios)
3. Measure: Time to identify owning subsystem using documentation only
4. Record: Average time per scenario, accuracy

**Target**: ≤7 minutes per scenario (50%+ reduction)

### Success Criteria

- At least **50% time reduction** compared to baseline
- At least **80% accuracy** in subsystem identification
- All engineers report documentation was "helpful" or better

---

## Scoring Matrix

| Metric | Baseline (No Docs) | Target (With Docs) | Success? |
|--------|-------------------|-------------------|----------|
| Avg time per scenario | 10-15 min | ≤7 min | 50%+ reduction |
| Subsystem accuracy | Variable | ≥80% | 4/5 correct |
| Starting files accuracy | Variable | ≥60% | 3/5 correct |
| User satisfaction | N/A | ≥80% "helpful" | Survey |

---

## Recording Template

```
Scenario #: [1-5]
Engineer: [Name/ID]
With Documentation: [Yes/No]
Time Taken: [mm:ss]
Subsystem Identified: [Name]
Correct?: [Yes/No]
Starting Files Listed: [Count]
Files Correct?: [Count]
Notes: [Free text]
```
