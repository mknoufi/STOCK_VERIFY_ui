# STOCK VERIFY - GOVERNANCE & MODERNIZATION ROADMAP

## PHASE 1 — GOVERNANCE & CONTROL (Immediate | Non-Negotiable)

### 1. Authentication & Role Authority
- [x] Centralize authentication guard at root level
- [x] Enforce single role-to-route resolver (no duplicated logic)
- [x] Remove per-screen auth checks inside staff flows
- [x] Introduce “Operational Modes”:
    - Live Audit (locked, no overrides)
    - Routine Verification
    - Training / Demo
- **Business Impact:** Zero role leakage, predictable behavior under audit pressure.

### 2. API Contract & Data Discipline
- [ ] Normalize identifiers (id only, no session_id)
- [ ] Normalize session states (OPEN | ACTIVE | CLOSED)
- [ ] Version all payloads (payload_version, client_version)
- [ ] Enforce backend re-validation for strict/blind modes
- **Business Impact:** Eliminate silent inconsistencies and future breakage.

## PHASE 2 — SESSION & WORKFLOW HARDENING (High Priority)

### 3. Session Lifecycle Ownership
- [ ] Extract session creation & validation into SessionService
- [ ] Introduce session ownership locking (staff-bound)
- [ ] Supervisor-only reassignment rights
- [ ] Visual ownership badge on UI
- **Business Impact:** Accountability, reduced disputes, clean audit trails.

### 4. Scan Workflow Stabilization
- [ ] Declare Scan Screen feature freeze
- [ ] Move new scan behavior behind feature flags
- [ ] Document scan confidence & deduplication logic
- [ ] Introduce backend kill-switches:
    - Disable scanning
    - Disable overrides
    - Force offline-only mode
- **Business Impact:** Protect the most critical workflow from regression.

## PHASE 3 — AUDIT, TRACEABILITY & COMPLIANCE (Critical)

### 5. Immutable Audit Logging
- [ ] Log all MRP overrides (user, time, old/new value)
- [ ] Log category/subcategory corrections
- [ ] Log damage quantities & non-returnable flags
- [ ] Log serial corrections & deletions
- **Rule:** Approved records are immutable; corrections create revisions.
- **Business Impact:** Audit-grade trust, zero ambiguity.

### 6. Variance Intelligence (Lightweight Analytics)
- [ ] Flag repeat variance SKUs
- [ ] Flag repeated rack-level discrepancies
- [ ] Highlight chronic damage patterns
- **Business Impact:** Moves system from counting → insight.

## PHASE 4 — UX GOVERNANCE & STAFF EFFICIENCY

### 7. Appearance & UX Policy
- [ ] Lock layout density and color contrast
- [ ] Allow limited personalization:
    - Dark/Light
    - Motion reduction
    - Text scaling (bounded)
- [ ] Progressive disclosure on Item Detail:
    - Hide advanced fields by default
    - Reveal only on variance/damage/strict mode
- **Business Impact:** Faster staff throughput, consistent audit visuals.

### 8. Visual Progress & Trust Signals
- [ ] Rack completion confirmation animation
- [ ] Session completion summary card
- [ ] Show sync status clearly:
    - Saved locally
    - Synced to server
    - Reviewed by supervisor
- **Business Impact:** Reduces anxiety, increases staff confidence.

## PHASE 5 — SUPERVISOR & MANAGEMENT VISIBILITY

### 9. Real-Time Oversight
- [ ] Live floor/rack heatmap (static initially acceptable)
- [ ] Color-coded status (not started / active / complete / high variance)
- [ ] Session ownership visibility
- **Business Impact:** Fewer calls, instant operational clarity.

### 10. Reporting & Exports
- [ ] Add export intent (CSV/PDF hooks)
- [ ] Prepare daily summary snapshot:
    - Items scanned
    - Variances
    - Damages
    - Pending approvals
- **Business Impact:** Management-ready reporting without manual work.

## PHASE 6 — PLATFORM MATURITY & RISK MANAGEMENT

### 11. Feature Flag Discipline
- [ ] Centralize feature flag definitions
- [ ] Move from screen-level to field-level flags
- [ ] Document purpose + blast radius per flag
- **Business Impact:** Safe experimentation, zero surprise outages.

### 12. Error, Recovery & Support Readiness
- [ ] Classify errors (recoverable / actionable / fatal)
- [ ] Standardize retry vs alert behavior
- [ ] Attach context IDs for support tracing
- **Business Impact:** Faster incident resolution, lower support load.

---

## FINAL EXECUTIVE POSITION
Feature development is no longer the priority.
Control, auditability, and predictability are.
Completing Phase 1–4 elevates this system to enterprise audit-grade.
Phases 5–6 transform it into a management intelligence platform.
