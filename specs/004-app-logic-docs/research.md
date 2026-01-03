# Research: App Logic Documentation

## Goal

Resolve technical-context unknowns and lock decisions needed to produce accurate, low-risk app-logic documentation.

## Findings (from repository)

### Decision: Primary runtime entrypoint
- Decision: Treat `uvicorn backend.server:app` as the canonical runtime entrypoint.
- Rationale: `docker-compose.yml` and repo run guides consistently reference `backend.server:app`.
- Alternatives considered:
  - `backend/main.py` as the entrypoint: present but not the primary deployment path.

### Decision: API prefixing and “versioning” reality
- Decision: Document the API as it exists today:
  - Most app endpoints are under `/api/...` (no `/api/v1` prefix in route definitions)
  - Some “newer” ERP/item flows live under `/api/v2/erp/items/...`
- Rationale: Router prefixes in the backend code use `/api/...` directly, with v2 used for specific item/verification routes.
- Alternatives considered:
  - Treat `/api/v1/...` as canonical: rejected because it does not match route prefixes used by the running app.

### Decision: Response envelope vs. actual response shapes
- Decision: Document the *current* runtime response shapes, and call out `docs/API_CONTRACTS.md` as a standard/goal rather than a guarantee.
- Rationale: Many endpoints return Pydantic models directly (e.g., `PaginatedResponse[...]`, `Session`, lists) rather than the `{success,data,...}` envelope.
- Alternatives considered:
  - Standardize and wrap all endpoints: rejected for this feature (docs-only scope; would be an implementation change).

### Decision: Source-of-truth for data
- Decision: Document MongoDB as the source of truth for application state and operational records; document SQL Server as read-only ERP source.
- Rationale: Repo constitution and copilot rules explicitly state Mongo is primary and SQL is read-only.
- Alternatives considered:
  - Writing operational updates back to SQL: rejected; violates system constraints.

### Decision: Authentication & authorization model
- Decision: Document JWT Bearer authentication on `/api/*` and role/permission gating for supervisor/admin-only behaviors.
- Rationale: Repo rules and dependency patterns show JWT + RBAC is mandatory.
- Alternatives considered:
  - Public endpoints: rejected; violates “Security First”.

### Decision: Core business flows to document (scope)
- Decision: Focus documentation on the “stock verification” lifecycle:
  - Sessions (create/list/active)
  - Counting (count lines, variance/justification, risk flags)
  - Item verification state updates + variance logs
  - Offline sync batch processing + conflict detection
  - Reporting/analytics endpoints and export behaviors
- Rationale: This aligns with the feature spec and directly reduces debugging time.
- Alternatives considered:
  - Document every router/service: rejected (too broad for MVP).

### Decision: Performance-sensitive areas
- Decision: Call out item lookup / barcode flows as performance-sensitive and document where caching is applied.
- Rationale: Constitution explicitly highlights low-latency, especially for barcode lookups.
- Alternatives considered:
  - Treat all routes equally: rejected; doesn’t meet performance guidance.

### Decision: Long-lived location for App Logic Overview
- Decision: Publish the App Logic Overview under `docs/APP_LOGIC_OVERVIEW.md` (long-lived, repo-visible to all roles) and keep `specs/004-app-logic-docs/` as working materials.
- Rationale: Docs/ is the durable home for team-facing documentation; aligns with T001 default location and keeps the overview discoverable outside the feature folder.
- Alternatives considered:
  - Keep overview only inside `specs/004-app-logic-docs/`: rejected because it hides the primary deliverable and reduces discoverability.

## Outputs to Produce

- `specs/004-app-logic-docs/data-model.md`: Entity relationships and lifecycle/state transitions.
- `specs/004-app-logic-docs/contracts/existing-apis.md`: Map existing API surfaces to user actions.
- `specs/004-app-logic-docs/quickstart.md`: How to use this documentation and how to validate it against the running app.

## Compatibility / Sharp Edges to Call Out

- **Duplicate / overlapping routers**: Some paths appear in multiple routers (e.g., reporting endpoints) and legacy routes exist under `backend.api.legacy_routes`.
- **Dual session representations**: Sessions are stored in `sessions`, with a compatibility mirror in `verification_sessions` for newer verification features.
- **Mixed contract patterns**: Some endpoints return `{"success": true, "data": ...}` while others return unwrapped models.

## Open Questions (for stakeholder review)

- Preferred “source of truth” documentation location for long-lived docs (keep under `docs/` vs. keep only in `specs/`).
- Do you want the overview to include frontend call paths (screens → API routes) or stay backend-centric?
---

## Question Resolutions

### Q1: Documentation Location
**Decision**: `docs/APP_LOGIC_OVERVIEW.md` (long-lived, discoverable)
**Rationale**: Task T001 selected `docs/` as the canonical location; working materials remain in `specs/004-app-logic-docs/` for traceability
**Date Resolved**: 2025-12-28 (Phase 1)

### Q2: Frontend Call Paths
**Decision**: Backend-centric approach (implicit)
**Rationale**: User stories US1-US3 focus on backend behavior (startup, auth, workflows, data model, compatibility); frontend paths not required for minimal disruption documentation goal
**Date Resolved**: 2025-12-29 (Phase 3 scope definition)
