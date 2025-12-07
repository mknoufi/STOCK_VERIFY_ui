# Task Backlog and Project Progress Tracker

## Backlog

### Frontend — UI/UX Upgrade
- [ ] Error Boundary wrapper for screens and navigation
  -- Context: Prevent full-app crashes; graceful fallback with retry
  -- Importance: High
  -- Dependencies: None
- [ ] Centralized loading states + skeletons
  -- Context: Consistent UX during async ops; disable actions to avoid duplicates
  -- Importance: High
  -- Dependencies: None
- [ ] Validation utilities + inline feedback
  -- Context: `validateBarcode`, `validateQuantity`, `validateDate`; block submit until valid; show helper text
  -- Importance: High
  -- Dependencies: None
- [ ] Scan UX enhancements
  -- Context: Debounce manual input; last scanned chips; clear scan vs type modes
  -- Importance: Medium
  -- Dependencies: Validation utilities
- [ ] Accessibility pass (ARIA, roles, focus states, keyboard nav)
  -- Context: Screen-reader support and keyboard accessibility for forms and modals
  -- Importance: Medium
  -- Dependencies: None
- [ ] Session persistence for Warehouse/Floor/Rack
  -- Context: Cache session locally; restore across restarts; quick switch UI
  -- Importance: Medium
  -- Dependencies: Storage utilities
- [ ] Performance improvements
  -- Context: Memoize handlers; lazy-load heavy modals; virtualize long lists
  -- Importance: Medium
  -- Dependencies: None

### Backend — API, Validations, Stability
- [ ] Tighten Pydantic validators on verification endpoints
  -- Context: Enforce `counted_qty >= 0`, `damage_qty >= 0`, serial count equals quantity, `YYYY-MM-DD` date format
  -- Importance: High
  -- Dependencies: None
- [ ] Configurable variance policy
  -- Context: Server-side thresholds; return structured `warning_code`, `message`, `nextActions` for UI
  -- Importance: High
  -- Dependencies: Config layer
- [ ] Idempotency keys for submissions
  -- Context: Prevent duplicates on retries/double taps
  -- Importance: High
  -- Dependencies: Redis or Mongo storage
- [ ] Rate limiting (per user/route)
  -- Context: Protect `/verify`, `/items/:id`; 429 with `retry_after`
  -- Importance: High
  -- Dependencies: Redis (recommended)
- [ ] Structured error envelopes
  -- Context: Standardize `{code, detail, hint, actionable}` responses
  -- Importance: Medium
  -- Dependencies: None
- [ ] Read caching (TTL) for hot item lookups
  -- Context: Faster responses for item_code; invalidate on update
  -- Importance: Medium
  -- Dependencies: Redis (preferred) or in-process cache

### Admin Web Panel — Control, Reports, Analysis
- [ ] Admin Panel scaffold
  -- Context: New `admin-panel/` React app with auth, routing, dashboard layout
  -- Importance: High
  -- Dependencies: Backend admin endpoints
- [ ] Auth & RBAC (Admin/Manager roles)
  -- Context: JWT with role claims; route/component guards
  -- Importance: High
  -- Dependencies: Backend auth claims
- [ ] Verification dashboard
  -- Context: Real-time counts; variance widgets; filters (warehouse, rack, date)
  -- Importance: High
  -- Dependencies: `/admin/metrics`, `/admin/variances`
- [ ] Variance analytics
  -- Context: Trend charts; top variances; per-user performance; export (CSV)
  -- Importance: High
  -- Dependencies: Aggregation endpoints
- [ ] Item & Session management
  -- Context: Search items; create/close sessions; corrections; audit logs
  -- Importance: Medium
  -- Dependencies: `/admin/sessions`, `/admin/items`
- [ ] Reports
  -- Context: Daily/weekly variance; user productivity; unresolved discrepancies; schedule/export
  -- Importance: Medium
  -- Dependencies: Reporting endpoints
- [ ] System health & observability
  -- Context: Service status; latency/error charts; rate limit hits; SLO widgets
  -- Importance: Medium
  -- Dependencies: `/health`, metrics endpoint (Prometheus)
- [ ] Admin settings
  -- Context: Variance thresholds, CORS origins, token lifetimes; safe apply with audit trail
  -- Importance: Medium
  -- Dependencies: Config endpoints

### Testing & QA
- [ ] Frontend tests (RTL): Scan → Submit flow
  -- Context: Validate inputs; variance confirm; success/error paths
  -- Importance: High
  -- Dependencies: Validation utilities, Error Boundary
- [ ] Backend tests: validators, variance policy, idempotency, rate limit
  -- Context: Ensure policy correctness and stability
  -- Importance: High
  -- Dependencies: Implementations above
- [ ] Admin Panel tests
  -- Context: Dashboard widgets; filters; RBAC route guards
  -- Importance: Medium
  -- Dependencies: Admin app scaffold

### Documentation & Developer Experience
- [ ] API docs updates
  -- Context: Error envelopes, 429 contract, variance warnings, admin endpoints
  -- Importance: Medium
  -- Dependencies: Backend updates
- [ ] Developer onboarding guide
  -- Context: Setup steps, env configs, test/lint flows, run commands
  -- Importance: Low
  -- Dependencies: None

## Current Status
- v2.1 stable; ScanScreen updated (6-digit code, photo simplified, variance confirm on mismatch).
- Session info displayed; scanning flow improved.

## Known Issues
- No token refresh; risk of abrupt logout mid-flow.
- Validation inconsistent; backend receives avoidable bad inputs.
- No idempotency on submissions; risk of duplicate counts.
- Accessibility gaps; limited keyboard/screen-reader support.
- Limited structured logging and metrics; weak observability.
