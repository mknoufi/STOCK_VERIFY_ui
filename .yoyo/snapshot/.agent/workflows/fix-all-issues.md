---
description: Fix all codebase issues to enable running the application
---

# Fix All Codebase Issues - Implementation Plan

## Overview
This plan addresses all 38+ issues identified in the codebase analysis, organized by priority and dependency order.

---

## Phase 1: Backend Critical Fixes (Runtime Blockers)

### Task 1.1: Add Missing Python Dependencies
**Files:** `backend/requirements.txt`
**Estimated Time:** 2 minutes

**Steps:**
1. Add `aiohttp>=3.9.0` to requirements.txt
2. Add `memory-profiler>=0.61.0` to requirements.txt
3. Install new dependencies: `pip install -r backend/requirements.txt`

**Validation:**
```bash
source .venv/bin/activate
pip install aiohttp memory-profiler
python -c "import aiohttp; import memory_profiler; print('Dependencies OK')"
```

---

### Task 1.2: Fix Missing Type Import in Error Handler
**Files:** `backend/utils/error_handler_with_diagnosis.py`
**Estimated Time:** 1 minute

**Issue:** Line 248 - `List` type not imported
**Fix:** Add `List` to the typing imports at the top of the file

**Steps:**
1. Locate the typing imports (likely near top of file)
2. Add `List` to the import statement: `from typing import Dict, Any, List, Optional`
3. Verify no other typing imports are missing

**Validation:**
```bash
python -m py_compile backend/utils/error_handler_with_diagnosis.py
```

---

### Task 1.3: Fix Undefined 'server' in Dynamic Fields API
**Files:** `backend/api/dynamic_fields_api.py`
**Estimated Time:** 10 minutes

**Issue:** Lines 108, 152, 176, 206, 236, 278, 336, 371, 399 - `server` is undefined
**Root Cause:** API functions need access to database instance but `server` is not in scope

**Investigation Required:**
1. Check how other API files access the database
2. Determine if using dependency injection pattern
3. Check if there's a `get_db()` dependency function

**Likely Fix Options:**
- Option A: Add `server` parameter to function signatures
- Option B: Use FastAPI dependency injection with `Depends(get_db)`
- Option C: Import server instance from main module

**Steps:**
1. View the file to understand current structure
2. Check similar working API files for pattern
3. Apply consistent database access pattern
4. Update all 9 occurrences

---

### Task 1.4: Fix Undefined 'server' and 'db' in Dynamic Reports API
**Files:** `backend/api/dynamic_reports_api.py`
**Estimated Time:** 10 minutes

**Issue:**
- Lines 92, 128, 180, 226, 252, 281, 347 - `server` is undefined
- Line 284 - `db` is undefined

**Steps:**
1. Apply same fix pattern as Task 1.3
2. Update all 8 occurrences
3. Special attention to line 284 where `db` is used directly

---

### Task 1.5: Fix or Remove Unused Global Declaration
**Files:** `backend/server.py`
**Estimated Time:** 3 minutes

**Issue:** Line 729 - `global auto_sync_manager` declared but never assigned

**Investigation Required:**
1. Search for `auto_sync_manager` usage in the file
2. Determine if it's actually needed

**Fix Options:**
- Option A: Remove the global declaration if unused
- Option B: Assign the variable if it should be used
- Option C: Move to module-level if it's a module variable

---

### Task 1.6: Fix Regex Escape Sequences
**Files:** Multiple files (need to identify exact locations)
**Estimated Time:** 5 minutes

**Issue:** Invalid escape sequences `\S` in regex patterns (lines 51, 220 in unknown files)

**Steps:**
1. Search for regex patterns with `\S`: `grep -r "\\S" backend/ --include="*.py"`
2. Convert to raw strings: `r"\S"` or escape properly: `"\\\\S"`
3. Check for other invalid escape sequences: `\d`, `\w`, etc.

**Validation:**
```bash
python -Wall -m py_compile backend/**/*.py 2>&1 | grep SyntaxWarning
```

---

## Phase 2: Frontend Critical Fixes (Type Safety)

### Task 2.1: Fix ToastProvider Type Errors
**Files:** `frontend/components/ToastProvider.tsx`
**Estimated Time:** 8 minutes

**Issue:** Lines 23, 28 - Event handler type mismatch
```
Argument of type '(id: string) => void' is not assignable to
parameter of type 'ToastEventHandler'
```

**Steps:**
1. View the ToastProvider.tsx file around lines 23, 28
2. Check the `ToastEventHandler` type definition
3. Update handler signature to match expected type:
   - Change from: `(id: string) => void`
   - Change to: `(data: ToastData) => void`
4. Update handler implementation to use `data` parameter

---

### Task 2.2: Fix Test File Type Errors
**Files:** `frontend/tests/components.test.tsx`
**Estimated Time:** 10 minutes

**Issue 1:** Line 7 - Cannot find module '@testing-library/react-native'
**Issue 2:** Lines 124-441 - Missing `toHaveTextContent` matcher

**Steps:**
1. Verify test dependencies in package.json
2. Check if `@testing-library/react-native` is installed
3. Add proper imports for Jest matchers:
   ```typescript
   import '@testing-library/jest-native/extend-expect';
   ```
4. Create or update test setup file to include matchers
5. Verify all 17 test assertions compile

**Validation:**
```bash
npm run typecheck
```

---

### Task 2.3: Fix ESLint Configuration
**Files:** `frontend/eslint.config.js`, `frontend/.eslintrc.js`
**Estimated Time:** 15 minutes

**Issue:** Package subpath './config' not exported from eslint

**Root Cause:** ESLint 9.x changed module exports, incompatible with current config

**Steps:**
1. Check current ESLint version: `npm list eslint`
2. View current eslint.config.js to see what's being imported
3. Choose fix strategy:
   - Option A: Downgrade to ESLint 8.x (safer)
   - Option B: Migrate to flat config format (modern)
   - Option C: Use .eslintrc.js instead of eslint.config.js

**Recommended Fix (Option A):**
```bash
npm install --save-dev eslint@8.57.1
```

**Alternative Fix (Option C):**
1. Rename `eslint.config.js` to `.eslintrc.js`
2. Update import statements to use legacy format
3. Update package.json scripts if needed

---

## Phase 3: Code Quality Improvements

### Task 3.1: Add Test Dependencies
**Files:** `frontend/package.json`
**Estimated Time:** 5 minutes

**Steps:**
1. Ensure all test dependencies are in package.json:
   ```json
   "@testing-library/react-native": "^12.8.1",
   "@testing-library/jest-native": "^5.4.3"
   ```
2. Run `npm install` to install any missing packages
3. Create or update `jest.setup.js` to import matchers

---

### Task 3.2: Verify All Imports and Dependencies
**Files:** Multiple
**Estimated Time:** 10 minutes

**Steps:**
1. Run backend type checking: `cd backend && mypy . --config-file=../pyproject.toml`
2. Run frontend type checking: `cd frontend && npm run typecheck`
3. Check for any remaining import errors
4. Fix any circular dependencies

---

### Task 3.3: Update Documentation
**Files:** `TROUBLESHOOTING_GUIDE.md`, `CODEBASE_ISSUES_REPORT.md`
**Estimated Time:** 5 minutes

**Steps:**
1. Update TROUBLESHOOTING_GUIDE.md with new known issues
2. Mark resolved issues in CODEBASE_ISSUES_REPORT.md
3. Add "Last Updated" timestamp

---

## Phase 4: Validation and Testing

### Task 4.1: Run Backend Tests
**Estimated Time:** 5 minutes

```bash
source .venv/bin/activate
cd backend
pytest tests/ -v --tb=short
```

**Expected:** All tests should collect and run (may have failures, but no import errors)

---

### Task 4.2: Run Frontend Type Check
**Estimated Time:** 3 minutes

```bash
cd frontend
npm run typecheck
```

**Expected:** 0 TypeScript errors

---

### Task 4.3: Run Frontend Linting
**Estimated Time:** 3 minutes

```bash
cd frontend
npm run lint
```

**Expected:** Linting should complete without configuration errors

---

### Task 4.4: Test Application Startup
**Estimated Time:** 10 minutes

**Steps:**
1. Start MongoDB (if not running): `brew services start mongodb-community`
2. Start backend: `cd backend && uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload`
3. Verify backend health: `curl http://localhost:8000/api/health`
4. Start frontend: `cd frontend && npm start`
5. Verify frontend loads without errors

---

## Execution Order Summary

**Total Estimated Time:** 90-120 minutes

### Sequential Execution (Recommended):
1. **Phase 1** (30-40 min) - Backend critical fixes - MUST complete before testing
2. **Phase 2** (30-35 min) - Frontend critical fixes - Can run parallel to Phase 1
3. **Phase 3** (20 min) - Code quality - After Phase 1 & 2
4. **Phase 4** (20-25 min) - Validation - Final step

### Parallel Execution (Faster):
- **Track A:** Tasks 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 (Backend)
- **Track B:** Tasks 2.1 → 2.2 → 2.3 → 3.1 (Frontend)
- **Track C:** Tasks 4.1 → 4.2 → 4.3 → 4.4 (Validation - after A & B)

---

## Risk Assessment

### High Risk Tasks (Need Careful Review):
- Task 1.3 & 1.4: Database access pattern changes could break existing functionality
- Task 2.3: ESLint configuration changes might affect CI/CD

### Medium Risk Tasks:
- Task 1.5: Global variable changes might affect runtime behavior
- Task 2.1: Type changes might reveal hidden bugs

### Low Risk Tasks:
- Task 1.1, 1.2, 1.6: Simple additions/fixes
- Task 2.2, 3.1: Test configuration only

---

## Rollback Plan

If issues arise during fixes:

1. **Git Checkpoint:** Create branch before starting
   ```bash
   git checkout -b fix-all-issues-backup
   git add -A
   git commit -m "Checkpoint before fixes"
   git checkout -b fix-all-issues-working
   ```

2. **Per-Phase Commits:** Commit after each phase
   ```bash
   git add -A
   git commit -m "Phase 1: Backend critical fixes complete"
   ```

3. **Rollback Command:**
   ```bash
   git checkout fix-all-issues-backup
   ```

---

## Success Criteria

### Phase 1 Success:
- ✅ `pytest tests/` collects all tests without import errors
- ✅ `flake8 backend/ --select=E9,F63,F7,F82` shows 0 errors
- ✅ No SyntaxWarnings when running Python with `-Wall`

### Phase 2 Success:
- ✅ `npm run typecheck` shows 0 errors
- ✅ `npm run lint` completes without configuration errors
- ✅ Test files compile successfully

### Phase 3 Success:
- ✅ All dependencies installed
- ✅ Documentation updated
- ✅ No circular dependency warnings

### Phase 4 Success:
- ✅ Backend starts without errors
- ✅ Backend health endpoint returns 200
- ✅ Frontend starts without errors
- ✅ Frontend connects to backend successfully

---

## Notes

- Some tasks may reveal additional issues that need addressing
- Database access pattern (Tasks 1.3, 1.4) may require reviewing FastAPI dependency injection
- ESLint fix (Task 2.3) has multiple valid approaches - choose based on team preference
- All fixes should maintain backward compatibility where possible

---

*Plan created: 2025-11-27T16:40:54+05:30*
*Estimated total time: 90-120 minutes*
*Priority: Critical - Blocks application from running*
