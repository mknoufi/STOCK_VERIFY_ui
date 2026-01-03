# Tasks: Application Engineering Gap Analysis Remediation

## Phase 1: Setup & Environment
**Goal**: Stabilize the development environment and prepare for architectural changes.

- [x] T001 Fix Babel/Jest environment issues (clean install & cache clear) in `frontend/`
- [x] T002 Create `frontend/src/domains` directory structure with subdirectories (`inventory`, `auth`, `reports`)
- [x] T003 [US1] Enable `strict: true` in `frontend/tsconfig.json` and resolve resulting type errors

## Phase 2: Foundational Architecture (DDD)
**Goal**: Establish Domain-Driven Design patterns and type safety.

- [x] T004 [US1] Define Domain Boundaries documentation in `frontend/src/domains/README.md` (Inventory vs Reports vs Auth)
- [x] T005 [US1] Create shared Zod schemas for API responses in `frontend/src/types/schemas.ts`
- [x] T006 [US1] Design and Prototype `useDomainAction` hook in `frontend/src/hooks/useDomainAction.ts` (Standardized error handling, loading states)

## Phase 3: User Story 1 - Domain Migration
**Goal**: Refactor existing logic into the new Domain structure.

- [x] T007 [US1] Move Inventory logic (items, stock counts) to `frontend/src/domains/inventory`
- [x] T008 [US1] Move Auth logic (login, session) to `frontend/src/domains/auth`
- [x] T009 [US1] Move Reports logic (discrepancies, history) to `frontend/src/domains/reports`
- [x] T010 [US1] Refactor `frontend/src/hooks` to use `useDomainAction` and `useQuery`/`useMutation` consistently

## Phase 4: User Story 2 - Permissions & Governance
**Goal**: Implement Role-Based Access Control (RBAC) and Audit Logging.

- [x] T011 [US2] Define permissions constants (e.g., `INVENTORY_EDIT`) in `frontend/src/constants/permissions.ts`
- [x] T012 [US2] Implement `usePermission` hook in `frontend/src/hooks/usePermission.ts`
- [x] T013 [US2] Create `PermissionGate` component in `frontend/src/components/auth/PermissionGate.tsx`
- [x] T014 [US2] Implement frontend action logging service in `frontend/src/services/audit/auditLogger.ts`

## Phase 5: User Story 3 - Security Hardening
**Goal**: Secure data storage and API communications.

- [x] T015 [US3] Research: Determine necessity of Request Signing and SSL Pinning (Output: `docs/security_research.md`)
- [x] T016 [US3] Verify `SecureStore` usage in `frontend/src/services/storage/secureStorage.ts` and migrate sensitive tokens if needed
- [x] T017 [US3] Configure `babel-plugin-transform-remove-console` in `frontend/babel.config.js` for production builds

## Phase 6: User Story 4 - Performance & Reliability
**Goal**: Improve offline capabilities and application performance.

- [x] T018 [US4] Harden `syncBatch` in `frontend/src/services/sync/syncBatch.ts` (Handle 409 Conflict, Network Timeout, Persistence Failure)
- [x] T019 [US4] Implement conflict resolution strategies in `frontend/src/services/sync/conflictResolution.ts`
- [x] T020 [US4] Optimize React Query cache settings (staleTime, gcTime) in `frontend/src/config/queryClient.ts`
- [x] T021 [US4] Implement list virtualization for Inventory list in `frontend/src/components/common/VirtualList.tsx`

## Phase 7: User Story 5 - Testing & Quality Assurance
**Goal**: Ensure high code quality and reliability through testing.

- [x] T022 [US5] Increase unit test coverage for `frontend/src/services` (Jest)
- [x] T023 [US5] Setup Maestro/Detox for E2E testing (Create `frontend/e2e/README.md` with setup instructions)

## Dependencies
- **T001 (Environment)** is a strict blocker for all tasks.
- **T004 (Boundaries)** & **T006 (Prototype)** must be completed before Domain Migration (Phase 3).
- **Phase 3 (Domain Migration)** is a prerequisite for Phase 4 (Permissions) to ensure RBAC is applied to the new structure.

## Implementation Strategy
1.  **Stabilize**: Fix the environment (T001) immediately.
2.  **Define**: Establish the rules (T004, T006) before moving code.
3.  **Migrate**: Move code to Domains (Phase 3) incrementally.
4.  **Enhance**: Add Permissions (Phase 4) and Security (Phase 5) to the new structure.
5.  **Optimize**: Tune performance (Phase 6) once structure is settled.
