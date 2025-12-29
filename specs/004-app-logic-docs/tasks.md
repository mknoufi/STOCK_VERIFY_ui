---

description: "Task list for App Logic Documentation"

---

# Tasks: App Logic Documentation

**Input**: Design documents from `specs/004-app-logic-docs/`
**Prerequisites**: `specs/004-app-logic-docs/plan.md` (required), `specs/004-app-logic-docs/spec.md` (required), plus available docs: `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Not code-level unit tests (documentation-only deliverable). **Validation** tasks in Phase 7 verify success criteria through reviewer testing and surveys.

**Organization**: Tasks are grouped by user story so each story is independently reviewable.

## Format: `- [ ] T### [P?] [US?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US#]**: User story label for traceability
- Include exact file paths in every task

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish doc location, structure, and review checklist.

- [x] T001 Decide the long-lived location for the "App Logic Overview" doc (default to `docs/APP_LOGIC_OVERVIEW.md`) and record decision in `specs/004-app-logic-docs/research.md`
- [x] T002 [P] Create initial `docs/APP_LOGIC_OVERVIEW.md` with a section skeleton matching FR-001..FR-008 from `specs/004-app-logic-docs/spec.md`
- [x] T003 [P] Add a "How to validate against `/api/docs`" section in `docs/APP_LOGIC_OVERVIEW.md` (mirror + link to `specs/004-app-logic-docs/quickstart.md`)
- [x] T004 Update `specs/004-app-logic-docs/quickstart.md` to point readers to `docs/APP_LOGIC_OVERVIEW.md` as the primary output (if T001 chooses that location)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Ensure documentation is grounded in actual running behavior and aligned with project constitution.

- [x] T005 Verify canonical backend entrypoint and ports by checking `backend/server.py`, `docker-compose.yml`, and `start_app.sh`; summarize in `docs/APP_LOGIC_OVERVIEW.md`
- [x] T006 Verify API mounting/prefixing by checking `backend/main.py` and router includes; summarize versioning/prefix rules in `docs/APP_LOGIC_OVERVIEW.md`
- [x] T007 [P] Confirm authentication mechanism and token lifecycle by checking `backend/api/auth.py` (and any auth deps under `backend/api/auth/`); document in `docs/APP_LOGIC_OVERVIEW.md`
- [x] T008 [P] Confirm error shape conventions and any deviations by checking `docs/API_CONTRACTS.md` and representative routers; document "contract vs reality" guidance in `docs/APP_LOGIC_OVERVIEW.md`
- [x] T009 Run `.specify/scripts/bash/update-agent-context.sh copilot` and ensure constitution gates still pass; note results in `specs/004-app-logic-docs/plan.md`
- [x] T010 Re-run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and record the output blob in `specs/004-app-logic-docs/quickstart.md`

**Checkpoint**: ✅ Foundation ready — user story documentation can be completed.

---

## Phase 3: User Story 1 — Understand System Flow (Priority: P1) 🎯 MVP

**Goal**: A single structured document explaining startup → auth → core workflow, plus troubleshooting.

**Independent Test**: A reviewer can answer startup/auth/workflow questions using `docs/APP_LOGIC_OVERVIEW.md` only.

### Implementation for User Story 1

- [x] T011 [US1] Write “System Startup & Readiness” section in `docs/APP_LOGIC_OVERVIEW.md` using evidence from `backend/server.py`, `backend/config.py`, and `backend/main.py`
- [x] T012 [US1] Write “Authentication & Authorization” section in `docs/APP_LOGIC_OVERVIEW.md` using evidence from `backend/api/auth.py` and auth dependencies (JWT + RBAC)
- [x] T013 [P] [US1] Write “Sessions: create/list/active” workflow subsection in `docs/APP_LOGIC_OVERVIEW.md` using `backend/api/session_management_api.py` and `specs/004-app-logic-docs/contracts/existing-apis.md`
- [x] T014 [P] [US1] Write “Item lookup (ERP) flow” subsection in `docs/APP_LOGIC_OVERVIEW.md` using `backend/api/enhanced_item_api.py` and `specs/004-app-logic-docs/contracts/existing-apis.md`
- [x] T015 [P] [US1] Write “Item verification flow” subsection in `docs/APP_LOGIC_OVERVIEW.md` using `backend/api/item_verification_api.py` and `specs/004-app-logic-docs/contracts/existing-apis.md`
- [x] T016 [P] [US1] Write “Offline sync (batch + heartbeat)” subsection in `docs/APP_LOGIC_OVERVIEW.md` using `backend/api/sync_batch_api.py` and `specs/004-app-logic-docs/contracts/existing-apis.md`
- [x] T017 [P] [US1] Write “Reporting & exports” subsection in `docs/APP_LOGIC_OVERVIEW.md` using `backend/api/reporting_api.py`, `backend/api/report_generation_api.py`, and `specs/004-app-logic-docs/contracts/existing-apis.md`
- [x] T018 [US1] Add a “Troubleshooting flow” table in `docs/APP_LOGIC_OVERVIEW.md` mapping symptoms → subsystem → starting files/routes (auth/session/item/sync/reporting)

**Checkpoint**: ✅ US1 is complete and independently reviewable.

---

## Phase 4: User Story 2 — Map Data and Decisions (Priority: P2)

**Goal**: Document key entities, relationships, and lifecycle transitions.

**Independent Test**: A reviewer can trace the sample workflow and identify expected data state at each step.

### Implementation for User Story 2

- [x] T019 [US2] Add a “Source of Truth” section in `docs/APP_LOGIC_OVERVIEW.md` (MongoDB operational state vs SQL Server ERP read-only), aligned with `specs/004-app-logic-docs/research.md`
- [x] T020 [P] [US2] Add an “Entities & Collections” section in `docs/APP_LOGIC_OVERVIEW.md` based on `specs/004-app-logic-docs/data-model.md` (sessions, count_lines, verification_records/logs, variances, serials, sync_conflicts, audit logs)
- [x] T021 [US2] Add “State transitions” diagrams or bullet flows in `docs/APP_LOGIC_OVERVIEW.md` for Session and Count Line lifecycles (Created → Active → Closed; Draft/Queued → Submitted → Finalized)
- [x] T022 [US2] Add a “Sample end-to-end trace” subsection in `docs/APP_LOGIC_OVERVIEW.md` (start session → scan item → verify/count → variance reason → sync → report)
- [x] T023 [P] [US2] Cross-check the entity section against live router behavior by sampling relevant endpoints listed in `specs/004-app-logic-docs/contracts/existing-apis.md` and adjusting `docs/APP_LOGIC_OVERVIEW.md` accordingly
- [x] T024 [US2] Update `specs/004-app-logic-docs/data-model.md` if any mismatches are discovered during T023 (keep it as the stable conceptual model)

**Checkpoint**: US2 is complete and independently reviewable.

---

## Phase 5: User Story 3 — Explain Compatibility and Known Pitfalls (Priority: P3)

**Goal**: Document compatibility layers, sharp edges, and safe-change guidance.

**Independent Test**: A reviewer can assess whether a proposed change risks breaking legacy behavior.

### Implementation for User Story 3

- [x] T025 [US3] Add a “Compatibility layers” section in `docs/APP_LOGIC_OVERVIEW.md` (dual session collections, legacy payload shapes, mixed response envelopes), aligned with `specs/004-app-logic-docs/research.md`
- [x] T026 [P] [US3] Identify and document legacy/overlapping routes by checking `backend/api/legacy_routes.py` (if present) and router registrations in `backend/main.py`; summarize in `docs/APP_LOGIC_OVERVIEW.md`
- [x] T027 [US3] Add a “Known pitfalls & sharp edges” checklist in `docs/APP_LOGIC_OVERVIEW.md` (auth expiry, session state invalid, missing variance metadata, duplicate serial conflicts, no-data reports)
- [x] T028 [US3] Add a “Where to change behavior safely” mapping section in `docs/APP_LOGIC_OVERVIEW.md` (barcode validation, variance rules, session rules, sync rules, reporting)
- [x] T029 [US3] Update `specs/004-app-logic-docs/contracts/existing-apis.md` with an explicit “compat notes” subsection if any endpoints are known to be legacy/duplicate

**Checkpoint**: US3 is complete and independently reviewable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and consistency checks.

- [x] T030 [P] Add cross-links between `docs/APP_LOGIC_OVERVIEW.md` and `docs/API_CONTRACTS.md` clarifying which is normative vs descriptive
- [x] T031 Run a final “docs reality check” by comparing `docs/APP_LOGIC_OVERVIEW.md` against `http://localhost:8001/api/docs` and update any drift
- [x] T032 Ensure `specs/004-app-logic-docs/plan.md` reflects completion status and that gates remain PASS after final edits
- [x] T033 Run `make ci` (or at minimum `make lint`) to ensure documentation edits didn’t break formatting/tooling assumptions

---
## Phase 7: Success Criteria Validation

**Purpose**: Validate that success criteria SC-001..SC-004 are met through concrete artifacts and stakeholder review.

- [ ] T034 [P] [US1] Validate SC-001 & SC-002: Have 3-5 reviewers (new engineers preferred) complete `specs/004-app-logic-docs/validation/standard-questions.md` within 30 minutes using only documentation; record results and verify ≥90% pass rate (9/10 questions correct)
- [ ] T035 [P] [US2] Validate SC-003: Conduct baseline time measurement (without docs) and post-documentation measurement using `specs/004-app-logic-docs/validation/incident-scenarios.md` with 5 support engineers; verify ≥50% time reduction
- [ ] T036 [All] Validate SC-004: Distribute `specs/004-app-logic-docs/validation/review-survey-template.md` to 10-20 stakeholders; collect responses; verify ≥80% rate documentation as "Clear" (4) or "Very Clear" (5)

**Checkpoint**: All success criteria validated with concrete data.

---
## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Phase 1 completion; blocks all user stories
- **User Stories (Phase 3–5)**: Depend on Foundational phase completion
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on US2/US3
- **US2 (P2)**: No hard dependency on US1, but easier if US1 sections exist
- **US3 (P3)**: No hard dependency on US1/US2

Recommended completion order (by priority): US1 → US2 → US3.

---

## Parallel Execution Examples

### Setup / Foundational

- Run in parallel:
  - T002 (create doc skeleton)
  - T003 (validation section)
  - T007 (auth confirmation)
  - T008 (error shape confirmation)

### US1

- Run in parallel:
  - T013 (sessions subsection)
  - T014 (item lookup subsection)
  - T015 (verification subsection)
  - T016 (sync subsection)
  - T017 (reporting subsection)

---

## Implementation Strategy

### MVP (US1 only)

1. Complete Phase 1 + Phase 2
2. Complete Phase 3 (US1)
3. Stop and validate: reviewer can answer the independent test questions using `docs/APP_LOGIC_OVERVIEW.md` only

### Incremental Delivery

- Add US2 (data/lifecycle) once US1 is validated
- Add US3 (compatibility/pitfalls) last
