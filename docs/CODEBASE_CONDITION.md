# Codebase Condition (Current Snapshot)

**Last verified:** 2026-01-06 (macOS)

This document is a lightweight, reproducible snapshot of the repository's current health. It is intended to prevent stale metrics from lingering in the README and older reports.

---

## What was run

From the repo root:

```bash
make ci
```

Additionally (to capture the current MyPy baseline):

```bash
mypy backend --ignore-missing-imports --python-version=3.10 --config-file=backend/pyproject.toml --explicit-package-bases
```

---

## Results summary

### Backend (Python / FastAPI)

- **Tests:** 570 passed, 8 skipped
- **Coverage:** 84.03% (meets the configured 80% minimum)

### Frontend (React Native / Expo)

- **Lint:** passes (`expo lint`)
- **TypeScript:** passes (`tsc --noEmit`)
- **Tests:** 14 suites passed, 137 tests passed

---

## Known non-blocking issues / noise

### MyPy is not gating CI right now

- **Current MyPy baseline:** 102 errors in 24 files (checked 303 source files)
- **Important:** the Makefile target `make python-typecheck` is configured with `|| true`, so `make ci` will still succeed even when MyPy reports errors.

If you want MyPy to be a hard gate, remove the `|| true` in the Makefile and fix/triage the remaining errors first.

### Frontend tests emit console warnings/logs

During `npm test`, some tests log expected warnings and simulated error paths (e.g. AsyncStorage failure handling). The suite still passes.

---

## How to re-verify later

- Fast check: `make ci`
- Backend only: `make python-ci`
- Frontend only: `make node-ci`
- Update this file when the numbers materially change.
