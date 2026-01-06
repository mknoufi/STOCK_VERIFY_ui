# Implementation Plan: App Logic Documentation

**Branch**: `004-app-logic-docs` | **Date**: 2025-12-28 | **Spec**: `specs/004-app-logic-docs/spec.md`
**Input**: Feature specification from `specs/004-app-logic-docs/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Produce a single, structured “App Logic Overview” (as documentation) that explains startup → auth → core stock verification workflow → offline sync → reporting, grounded in the actual FastAPI routes and MongoDB collections. Deliverables for this planning phase live under `specs/004-app-logic-docs/` (research, data model, existing API map, and quickstart).

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.10+ (backend), TypeScript (frontend; Expo/React Native)
**Primary Dependencies**: FastAPI, Motor (MongoDB), pyodbc (SQL Server read-only), Expo Router, Zustand, Axios, React Query
**Storage**: MongoDB (source of truth for app state), SQL Server (read-only ERP), optional Redis (cache/locks), frontend local storage (MMKV)
**Testing**: pytest (backend), Jest (frontend)
**Target Platform**: Mobile (iOS/Android via Expo) + backend API server (Uvicorn/Gunicorn)
**Project Type**: Mobile + API
**Performance Goals**: Low-latency barcode/item lookup; stable offline-first UX; avoid hot paths doing cross-system writes
**Constraints**: JWT everywhere on protected routes; strict RBAC; SQL Server is read-only; no wildcard CORS; documentation must reflect current behavior (including compatibility layers and any contract mismatches)
**Scale/Scope**: Enterprise field usage; offline + intermittent connectivity; multiple roles (staff/supervisor/admin)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md`:

- **Data Integrity**: PASS (documentation clarifies Mongo as source of truth; SQL remains read-only)
- **Security First**: PASS (documentation calls out JWT Bearer auth + RBAC on protected endpoints)
- **Minimal Disruption**: PASS (docs-only change; no runtime behavior changes)
- **Performance**: PASS (docs highlight performance-sensitive barcode/item lookup and caching/lock boundaries)
- **Quality Standards**: PASS (docs reference existing contract conventions and testing expectations)

### T009 Agent Context Update (2025-12-29)
```
✓ Updated GitHub Copilot context file
- Added language: Python 3.10+ (backend), TypeScript (frontend; Expo/React Native)
- Added framework: FastAPI, Motor (MongoDB), pyodbc (SQL Server read-only), Expo Router, Zustand, Axios, React Query
- Added database: MongoDB (source of truth), SQL Server (read-only ERP), optional Redis, MMKV
✓ Agent context update completed successfully
```

### Phase 3 Completion (US1 MVP) (2025-12-29)
```
✓ FR-003 Core Stock Verification Workflow documented:
  - 3.1 Sessions: create/list/active endpoints
  - 3.2 Item Lookup (ERP Flow) with barcode validation
  - 3.3 Item Verification Flow with VerificationRequest fields
  - 3.4 Offline Sync (Batch + Heartbeat) with conflict types
  - 3.5 Reporting & Exports with 5 report types
  - 3.6 Troubleshooting Flow table (symptom → subsystem → file)

✓ FR-004 Key Data Objects & Lifecycles documented:
  - MongoDB collections inventory (8 collections)
  - Session lifecycle diagram (OPEN → ACTIVE → CLOSED)
  - ERPItem verification state fields
  - CountLine record structure
  - AuditLog entry structure with action enum
  - Store authority mapping

✓ FR-005 Offline Sync & Conflict Handling documented:
  - Batch submission flow diagram
  - Request/Response structure
  - 5 conflict types with resolution guidance
  - Conflict storage schema
  - Telemetry & diagnostics hooks

✓ FR-006 Reporting & Analytics documented:
  - 5 report types with inputs/outputs
  - Query & Snapshot pattern (5-step)
  - Export formats (json/csv/xlsx)
  - Filter options table
  - "No data" troubleshooting
  - Scheduling & performance notes

✓ FR-007 Where to Change Behavior documented:
  - 8 common change intents mapped to modules
  - Change checklist (6 steps)
  - Guardrails per module

✓ FR-008 Compatibility & Pitfalls documented:
  - 4 legacy behaviors with migration paths
  - 4 overlapping routes documented
  - Response envelope inconsistencies noted
  - 7 known sharp edges with mitigations
  - Compatibility guidance (5 rules)

Tasks T011-T018 marked complete in tasks.md
```

## Project Structure

### Documentation (this feature)

```text
specs/004-app-logic-docs/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── api/
├── auth/
├── core/
├── db/
├── middleware/
├── models/
├── services/
├── tests/
├── main.py
└── server.py

frontend/
├── app/                 # expo-router file-based routes
├── src/
│   ├── components/
│   ├── services/
│   ├── store/
│   └── utils/
└── package.json

docs/
└── API_CONTRACTS.md
```

**Structure Decision**: Mobile + API. Documentation describes end-to-end behavior across the Expo client and the FastAPI backend, with MongoDB as the operational store and SQL Server as a read-only ERP source.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

---

## Phase 4 Completion Summary (US2 - Map Data and Decisions)

**Completed**: T019, T020, T021, T022, T023, T024

**Changes Made**:
1. **T019**: Source of Truth already documented in FR-004 section 4.6 - verified alignment with research.md
2. **T020**: Entities & Collections documented in FR-004 sections 4.1-4.5 - verified coverage
3. **T021**: Added CountLine lifecycle diagram (section 4.4.1) with states: draft → queued → submitted → finalized/failed
4. **T022**: Added comprehensive "Sample End-to-End Trace" section (4.7) showing 7-step workflow with data state changes
5. **T023**: Cross-checked entities against live router code (schemas.py, session_management_api.py); identified field differences
6. **T024**: Updated data-model.md with accurate CountLine and Session field lists from actual schema definitions

**Files Modified**:
- `docs/APP_LOGIC_OVERVIEW.md` - Added CountLine lifecycle diagram and end-to-end trace section
- `specs/004-app-logic-docs/data-model.md` - Updated Session and CountLine entities with accurate fields
- `specs/004-app-logic-docs/tasks.md` - Marked T019-T024 complete

---

## Phase 5 Completion Summary (US3 - Compatibility and Known Pitfalls)

**Completed**: T025, T026, T027, T028, T029

**Changes Made**:
1. **T025**: Added comprehensive "Compatibility Layers" section (FR-008 8.1) documenting dual session collections, legacy payload shapes, and mixed response envelopes
2. **T026**: Documented legacy/overlapping routes in FR-008 8.2, including analysis of `legacy_routes.py` (unmounted) and active overlapping routes
3. **T027**: Expanded "Known Sharp Edges" section (8.4) - already comprehensive from Phase 3
4. **T028**: Added "Where to Change Behavior Safely" mapping (8.6) with behavior locations, config overrides, and change risk levels
5. **T029**: Added "Compatibility Notes" section to `existing-apis.md` with overlapping endpoints, response variations, and legacy payload support

**Files Modified**:
- `docs/APP_LOGIC_OVERVIEW.md` - Expanded FR-008 with compatibility layers and safe-change mapping
- `specs/004-app-logic-docs/contracts/existing-apis.md` - Added compatibility notes subsection
- `specs/004-app-logic-docs/tasks.md` - Marked T025-T029 complete

---

## Phase 6 Completion Summary (Polish & Cross-Cutting)

**Completed**: T030, T031, T032, T033

**Changes Made**:
1. **T030**: Added document role callout to both `APP_LOGIC_OVERVIEW.md` and `API_CONTRACTS.md` clarifying normative vs descriptive roles with cross-links
2. **T031**: Docs reality check - structure validated; note that full validation against `/api/docs` requires running backend
3. **T032**: Plan reflects completion status; all gates PASS
4. **T033**: Ran `make lint` - pre-existing lint errors in `legacy_routes.py` unrelated to documentation changes; markdown files validated

**Files Modified**:
- `docs/APP_LOGIC_OVERVIEW.md` - Added document roles callout with cross-links
- `docs/API_CONTRACTS.md` - Added document roles callout with cross-links
- `specs/004-app-logic-docs/tasks.md` - Marked T030-T033 complete
- `specs/004-app-logic-docs/plan.md` - This completion summary

---

## Phase 7: Success Criteria Validation *(2025-12-30)*

**Objective**: Validate that success criteria SC-001..SC-004 are met through concrete artifacts and stakeholder review.

**Status**: READY FOR EXECUTION (Artifacts created, tasks defined)

**Changes Made**:
1. **Specification Analysis** (2025-12-30): Comprehensive consistency check identified need for validation artifacts and tasks
2. **Validation Artifacts Created** (2025-12-30):
   - `specs/004-app-logic-docs/validation/standard-questions.md` - 10 Q&A for SC-001/SC-002
   - `specs/004-app-logic-docs/validation/incident-scenarios.md` - 5 scenarios for SC-003
   - `specs/004-app-logic-docs/validation/review-survey-template.md` - Survey for SC-004
3. **Tasks Defined**: T034 (SC-001/SC-002 validation), T035 (SC-003 validation), T036 (SC-004 validation)
4. **Specification Clarifications**: Updated spec.md status (Draft→Complete), clarified testing terminology, resolved open questions in research.md

**Validation Tasks** (Not yet executed):
- [ ] T034 [P] [US1] Validate SC-001 & SC-002 with 3-5 reviewers (≥90% pass rate)
- [ ] T035 [P] [US2] Validate SC-003 with baseline/post-doc time measurements (≥50% reduction)
- [ ] T036 [All] Validate SC-004 with stakeholder survey (≥80% rate as "Clear")

**Constitution Gates**: All PASS (no changes to runtime behavior; docs-only phase)

**Next Actions**:
1. Recruit reviewers for T034 (new engineers preferred for onboarding validation)
2. Establish baseline troubleshooting times for T035 (5 support engineers)
3. Distribute survey for T036 (10-20 stakeholders across roles)
4. Collect and document results; update this plan with outcomes

---

## Final Status

**Implementation Complete**: ✅ Phase 1-6 (T001-T033)  
**Validation Pending**: ⏳ Phase 7 (T034-T036) - Artifacts ready, execution required

**Deliverables**:
- `docs/APP_LOGIC_OVERVIEW.md` - 928 lines of comprehensive system behavior documentation
- `specs/004-app-logic-docs/data-model.md` - Updated entity definitions with accurate fields
- `specs/004-app-logic-docs/contracts/existing-apis.md` - Enhanced with compatibility notes
- `docs/API_CONTRACTS.md` - Cross-linked with descriptive document
- `specs/004-app-logic-docs/validation/` - Complete validation artifact suite (standard-questions.md, incident-scenarios.md, review-survey-template.md)
