# Implementation Plan - Enterprise-Grade Stock Verify Upgrade

> **Project Name**: Stock Verify - Enterprise Grade Upgrade
> **Vision**: Transform the codebase into a production-ready, verifiable, and feature-complete application with robust testing and supervisor controls.
> **Total Estimated Steps**: 25-30
> **Completion Criteria**: All CI/CD jobs pass, E2E tests verify core flows, supervisor features (conflicts, leaks, mapping) are fully functional, and production Docker build is verified.

## User Intent

The user wants to finalize the "Stock Verify" application for enterprise use. Key drivers are:

1. **Completeness**: Finishing "missing" supervisor features like Sync Conflicts and DB Mapping.
2. **Reliability**: Adding End-to-End (E2E) testing with Playwright to guarantee stability.
3. **Real-time Accuracy**: Ensuring stock data can be refreshed from the SQL ERP in real-time.
4. **Production Readiness**: validating the Docker production setup.

## Phase 1: Supervisor Module Completion & Real-time Sync

**Goal**: Finalize the "Supervisor" features that are currently just UI skeletons or partial implementations.

- [x] **Task 1.1 - Database Mapping Feature**:
  - **Context**: `frontend/app/supervisor/db-mapping.tsx` needs to connect to `backend/api/admin_control_api.py` (or new mapping API).
  - **Action**: Implement the UI to select SQL Server tables/columns and save the mapping configuration.
  - **Validation**: Verify mapping config is saved to `backend_port.json` or Mongo config collection.
- [x] **Task 1.2 - Sync Conflict Resolution**:
  - **Context**: `frontend/app/supervisor/sync-conflicts.tsx` exists but needs logic.
  - **Action**: Implement `getSyncConflicts` and `resolveConflict` API integrations. Add UI to view conflicts side-by-side (Local vs Server). Implement functions to accept local, accept server, or manual merge.
  - **Validation**: Test creating a conflict (e.g., edit item offline, edit same item on server, sync) and resolving it via UI.
- [x] **Task 1.3 - Real-time Stock Refresh**:
  - **Context**: User requested a button to "fetch realtime sql server data".
  - **Action**: Add "Refresh Stock" button in `ItemDetails` or `ScanScreen`. Connect to `/api/erp/items/{code}/refresh-stock`.
  - **Validation**: Verify that clicking refresh updates the specific item's stock from the ERP mock/connector.
- [x] **Task 1.4 - Variance & Error Logs**:
  - **Context**: `variance-details.tsx` and `error-logs.tsx`.
  - **Action**: Wired up `error-logs.tsx` and `activity-logs.tsx` to `logs_api.py`. Variance details uses `ItemVerificationAPI`.
  - **Validation**: Ensure data tables populate with correct mock/real data.

## Phase 2: End-to-End (E2E) Testing Strategy

**Goal**: Establish a safety net for the critical user journey (Login -> Scan -> Verify).

- [ ] **Task 2.1 - Playwright Initialization**:
  - **Action**: specific `npm init playwright@latest` in `frontend/`. Configure for local dev server (`http://localhost:8081`).
- [ ] **Task 2.2 - Core Flow Test**:
  - **Action**: Write `frontend/e2e/core-flow.spec.ts`.
  - **Steps**:
        1. Login as Staff.
        2. Create Session (or select existing).
        3. Enter Barcode (use `513456`).
        4. Verify Item Details appear.
        5. Enter Count & Submit.
  - **Validation**: `npx playwright test` passes headless.
- [ ] **Task 2.3 - Clean-up Scripts**:
  - **Action**: Ensure tests clean up created sessions/data after run (or use a test-specific DB).

## Phase 3: Production Verification & cleanup

**Goal**: Verify the "Enterprise" promise by running the actual production artifact.

- [ ] **Task 3.1 - Production Build Verification**:
  - **Action**: Run `docker compose -f docker-compose.prod.yml up --build`.
  - **Check**: Verify Gunicorn backend starts, Nginx serves frontend, and API calls work (no CORS issues).
- [ ] **Task 3.2 - Final Polish**:
  - **Action**: Run standard linting (`npm run preflight`) one last time. Update `README.md` with "Production Deployment" instructions.
