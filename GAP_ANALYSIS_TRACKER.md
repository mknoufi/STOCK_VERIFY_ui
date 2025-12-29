# Application Engineering Gap Analysis & Remediation Tracker

This document tracks the progress of the remediation plan based on the "Application Engineering Gap Analysis".

## 1. Architecture & Code Structure (Priority: High)

- [ ] **Refactor to Domain-Driven Design (DDD)**
    - [x] Create `frontend/src/domains` directory.
    - [ ] Move `Inventory` logic to `domains/inventory`.
    - [ ] Move `Auth` logic to `domains/auth`.
    - [ ] Move `Reports` logic to `domains/reports`.
- [ ] **Standardize Custom Hooks**
    - [ ] Audit existing hooks in `frontend/src/hooks`.
    - [ ] Refactor to use `useQuery`/`useMutation` consistently.
    - [x] Implement `useDomainAction` pattern.
- [ ] **Strict Typing**
    - [x] Enable `strict: true` in `tsconfig.json`.
    - [ ] Eliminate `any` types in critical paths.
    - [x] Define shared Zod schemas for API responses.

## 2. Permissions & Governance (Priority: Critical)

- [ ] **Role-Based Access Control (RBAC)**
    - [ ] Implement `usePermission` hook.
    - [ ] Create `PermissionGate` component.
    - [ ] Define granular permissions (e.g., `INVENTORY_EDIT`, `REPORT_VIEW`).
- [ ] **Audit Logging**
    - [ ] Implement frontend action logging.
    - [ ] Ensure backend captures user context for all write operations.

## 3. Security & Hardening (Priority: Critical)

- [ ] **Secure Storage**
    - [ ] Verify `SecureStore` usage for sensitive tokens.
    - [ ] Ensure no sensitive data is logged to console in production.
- [ ] **API Security**
    - [ ] Implement request signing (if required).
    - [ ] Verify SSL pinning (if required).

## 4. Performance & Reliability (Priority: Medium)

- [ ] **Offline Sync**
    - [ ] Harden `syncBatch.ts` logic.
    - [ ] Implement conflict resolution strategies.
- [ ] **Query Optimization**
    - [ ] Optimize React Query cache times.
    - [ ] Implement list virtualization for large datasets.

## 5. Testing & Quality Assurance (Priority: High)

- [ ] **Unit Testing**
    - [ ] Increase coverage for `services/`.
    - [ ] Fix existing test suite flakes.
- [ ] **E2E Testing**
    - [ ] Setup Maestro or Detox for critical flows.

---

## Current Status
- **Phase**: Initialization
- **Active Task**: Environment Stabilization (Fixing Babel/Jest issues)
