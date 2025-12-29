# Tasks: Stock Verification Dashboard

**Input**: Design documents from `/specs/003-stock-verification-dashboard/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create `backend/api/dashboard_summary_api.py` with basic router setup.
- [ ] T002 Create `frontend/src/services/dashboardService.ts` for API communication.

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T003 Implement `get_dashboard_summary` logic in `backend/services/dashboard_service.py` to aggregate MongoDB data.
- [ ] T004 Register `dashboard_summary_router` in `backend/server.py`.

## Phase 3: User Story 1 - View Overall Progress (Priority: P1) 🎯 MVP

**Goal**: Display high-level summary of counted vs. total items.

**Independent Test**: Verify `/api/dashboard/summary` returns correct `total_items` and `counted_items`.

- [ ] T005 [US1] Implement `GET /api/dashboard/summary` endpoint in `backend/api/dashboard_summary_api.py`.
- [ ] T006 [US1] Create `DashboardScreen.tsx` in `frontend/src/screens/` with a progress indicator.
- [ ] T007 [US1] Add navigation link to Dashboard in the main menu.

## Phase 4: User Story 2 - Identify Discrepancies (Priority: P2)

**Goal**: List items with quantity mismatches.

**Independent Test**: Verify the discrepancies list in the dashboard matches items with `counted_qty != expected_qty`.

- [ ] T008 [US2] Update `GET /api/dashboard/summary` to include a list of discrepancies.
- [ ] T009 [US2] Add a "Discrepancies" section to `DashboardScreen.tsx`.

## Phase 5: User Story 3 - Staff Performance (Priority: P3)

**Goal**: Show counts by staff member.

**Independent Test**: Verify staff counts in the dashboard match the sum of counts per user in the database.

- [ ] T010 [US3] Update `GET /api/dashboard/summary` to include staff performance data.
- [ ] T011 [US3] Add a "Staff Performance" chart or list to `DashboardScreen.tsx`.
