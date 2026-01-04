# Official Documentation Verification Agent Knowledge

## Purpose

Define the knowledge base and task steps for an agent that verifies this repo’s
codebase against **official framework documentation** for the **versions declared
in this repo**.

The agent is expected to:

- Detect versions from the repo (source-of-truth files below).
- Build an import + API usage map for `frontend/` and `backend/`.
- Verify usage against official docs for the chosen version.
- Report mismatches, deprecations, undocumented usage, and version drift.

## Version Sources (Order of Trust)

1. `requirements.production.txt` (backend production runtime)
2. `frontend/package.json` (frontend runtime)
3. `package.json` (workspace tooling)

### Drift Rules

When versions conflict across sources, the agent MUST:

1. Flag the drift (include package name, versions, and all sources).
2. Choose the most production-relevant version for verification:
   - Backend runtime: trust `requirements.production.txt`.
   - Frontend runtime: trust `frontend/package.json`.
   - Tooling verification (lint/test/build configs only): prefer the config’s
     effective package owner (usually `frontend/package.json`), and treat root
     `package.json` as workspace tooling.

### What Counts as “Drift”

Flag drift if any of the following disagree:

- `requirements.production.txt` vs `backend/requirements.txt` (if present)
- `frontend/package.json` vs `package.json` for shared packages (e.g. `expo`, `react`, `react-native`)
- Any lockfile (e.g. `package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`) indicates a resolved version outside declared ranges
- Runtime code imports a library that is not present in its relevant manifest

## Framework Inventory (Official Docs + Versions)

This inventory is the expected baseline for the verification run. The agent must
still confirm presence/version via the version source files.

### Frontend Runtime

| Framework/Library | Version | Source | Official Docs |
| --- | --- | --- | --- |
| Expo SDK | `~54.0.29` | `frontend/package.json` | <https://docs.expo.dev/versions/v54.0.0/> |
| React | `19.1.0` | `frontend/package.json` | <https://react.dev/> |
| React Native | `0.81.5` | `frontend/package.json` | <https://reactnative.dev/docs/0.81/getting-started> |
| Expo Router | `~6.0.19` | `frontend/package.json` | <https://docs.expo.dev/router/introduction/> |
| React Query (TanStack) | `^5.59.16` | `frontend/package.json` | <https://tanstack.com/query/latest/docs/framework/react/overview> |
| React Hook Form | `^7.68.0` | `frontend/package.json` | <https://react-hook-form.com/> |
| Zod | `^4.2.1` | `frontend/package.json` | <https://zod.dev/> |
| Zustand | `^5.0.9` | `frontend/package.json` | <https://docs.pmnd.rs/zustand/getting-started/introduction> |
| Sentry React Native | `~7.2.0` | `frontend/package.json` | <https://docs.sentry.io/platforms/react-native/> |
| React Native Reanimated | `~4.1.1` | `frontend/package.json` | <https://docs.swmansion.com/react-native-reanimated/> |
| React Native Gesture Handler | `~2.28.0` | `frontend/package.json` | <https://docs.swmansion.com/react-native-gesture-handler/> |
| React Native Screens | `~4.16.0` | `frontend/package.json` | <https://github.com/software-mansion/react-native-screens> |
| React Native Safe Area Context | `~5.6.0` | `frontend/package.json` | <https://github.com/th3rdwave/react-native-safe-area-context> |
| React Native SVG | `15.12.1` | `frontend/package.json` | <https://github.com/software-mansion/react-native-svg> |
| React Native Web | `^0.21.0` | `frontend/package.json` | <https://necolas.github.io/react-native-web/> |

### Backend Runtime

| Framework/Library | Version | Source | Official Docs |
| --- | --- | --- | --- |
| FastAPI | `0.115.8` | `requirements.production.txt` | <https://fastapi.tiangolo.com/> |
| Uvicorn | `0.34.1` | `requirements.production.txt` | <https://www.uvicorn.org/> |
| Gunicorn | `23.0.0` | `requirements.production.txt` | <https://docs.gunicorn.org/en/stable/> |
| Pydantic | `2.12.5` | `requirements.production.txt` | <https://docs.pydantic.dev/2.12/> |
| Pydantic Settings | `2.7.0` | `requirements.production.txt` | <https://docs.pydantic.dev/latest/concepts/pydantic_settings/> |
| Motor (MongoDB async) | `3.7.0` | `requirements.production.txt` | <https://motor.readthedocs.io/en/stable/> |
| PyMongo | `>=4.10.0` | `requirements.production.txt` | <https://pymongo.readthedocs.io/en/stable/> |
| Redis (redis-py) | `>=5.2.1` | `requirements.production.txt` | <https://redis-py.readthedocs.io/en/stable/> |
| PyODBC | `5.2.0` | `requirements.production.txt` | <https://github.com/mkleehammer/pyodbc/wiki> |

### Tooling (Only if verifying build/test/lint configs)

| Framework/Library | Version | Source | Official Docs |
| --- | --- | --- | --- |
| NX | `22.3.3` | `package.json` | <https://nx.dev/> |
| Jest | `~29.7.0` | `frontend/package.json` | <https://jestjs.io/docs/getting-started> |
| TypeScript | `^5.9.3` | `frontend/package.json` | <https://www.typescriptlang.org/docs/> |
| ESLint | `^8.57.0` | `frontend/package.json` | <https://eslint.org/docs/latest/> |
| Storybook | `^8.6.15` | `frontend/package.json` | <https://storybook.js.org/docs/> |

## Task: Verify Codebase Against Official Docs

### Step 0 — Collect Versions (and Drift)

1. Parse `requirements.production.txt` into `{package -> spec}`.
2. Parse `frontend/package.json` into `{package -> spec}` from:
   - `dependencies`
   - `devDependencies` (only for tooling verification)
   - `overrides` / `resolutions` (treat as enforced constraints)
3. Parse root `package.json` into `{package -> spec}`.
4. Create a **Version Resolution Table** with:
   - `package`
   - `chosenVersionSpec`
   - `chosenSource`
   - `allSeenVersions` (per source)
   - `drift: true|false`

### Step 1 — Build Import Map

Goal: identify which framework modules/APIs are actually used, and where.

#### Frontend (`frontend/`)

Scan `.ts`, `.tsx`, `.js`, `.jsx`.

- Capture static imports: `import ... from 'pkg'` and `import 'pkg'`.
- Capture requires: `require('pkg')`.
- Capture dynamic imports: `import('pkg')`.

Normalize import sources:

- Convert subpath imports to package roots when possible:
  - `expo-router/...` -> `expo-router`
  - `@tanstack/react-query` stays as-is (scoped package)
- Keep the exact subpath too for verification (some APIs live there).

For each import usage site, record:

- `filePath`
- `line` (1-based)
- `importSource` (raw)
- `package` (normalized)
- `importedSymbols` (named/default/namespace)

Also include **config surface** (these are “API usage” too):

- Expo: `app.json`, `app.config.*`
- Metro: `metro.config.*`
- Babel: `babel.config.*`
- Router: `frontend/app/_layout.*`, `+layout.*`, route config patterns
- Sentry: `sentry.*`, `Sentry.init(...)` if present

#### Backend (`backend/`)

Scan `.py`.

- Capture `import x` and `from x import y`.
- Normalize module roots:
  - `fastapi.*` -> `fastapi`
  - `pydantic.*` -> `pydantic`
  - `pydantic_settings.*` -> `pydantic-settings` (map module->package)
  - `motor.*` -> `motor`
  - `pymongo.*` -> `pymongo`
  - `redis.*` -> `redis`
  - `pyodbc` -> `pyodbc`
  - `uvicorn` / `gunicorn` usage typically appears in configs/scripts (include those files too)

Also include **runtime config surface**:

- `backend/config.py` (Pydantic Settings fields and environment variables)
- Server entrypoints, process managers, and deployment configs:
  - `backend/server.py`, Dockerfiles, `docker-compose*.yml`, `k8s/`, `nginx/`, `stock-count.service`, `start_app.sh`

### Step 2 — Map Imports to Official Docs

For each package, attach:

- Official docs base URL (prefer versioned URLs when available)
- If docs are not versioned (e.g., React), record `versionedDocs: false` and note limitation.

Rules:

- Only official sources allowed.
- GitHub repos are acceptable when that repo is the official upstream for the package
  (e.g., Software Mansion repos).
- If no official docs exist, mark it as a documentation gap and list under “Unverified items”.

### Step 3 — Verify API Usage Against Docs

For each import site (and for each notable usage of imported symbols):

1. Identify the API surface in use (function/class/hook/config key).
2. Confirm the symbol exists for the chosen version.
3. Confirm expected behavior/constraints for that version (required params, lifecycle rules, renamed props, etc.).
4. Flag:
   - Deprecated usage
   - Removed usage
   - Wrong config key / wrong value type
   - Undocumented usage

### Step 4 — Report

The report MUST include:

- Summary: total files checked, total mismatches, version drift found.
- Findings list with:
  - File path + line (1-based)
  - API/config used and what is expected per official docs
  - Documentation link (versioned if available)
  - Severity: `blocker`, `major`, `minor`
- Unverified items list (no clear official doc or no versioned docs).

## Severity Guidelines

- `blocker`: API/config is removed/invalid for chosen version, or breaks runtime/startup/build.
- `major`: deprecated/changed behavior likely to cause bugs or incorrect behavior.
- `minor`: stylistic mismatch, non-breaking doc divergence, or low-risk best-practice gap.

## Required Finding Shape (Canonical)

Each finding should be structured like:

- `file`: path
- `line`: number
- `used`: the API/config as used
- `expected`: what docs state for the chosen version
- `docs`: URL
- `severity`: blocker|major|minor
- `notes`: optional drift/context

## Known Repo-Specific Drift to Flag (Examples)

During version collection, the agent should expect potential drift between
root `package.json` and `frontend/package.json` for shared packages (workspace
tooling vs runtime). For example, root currently declares different tooling
versions than frontend for packages like ESLint/Jest/Storybook, and a different
Expo version spec than the frontend runtime; these MUST be surfaced as drift,
with frontend chosen for runtime verification.

## Constraints

- Only official documentation sources are acceptable.
- If the docs are not versioned, use the closest official docs and explicitly
  note that limitation in “Unverified items”.
