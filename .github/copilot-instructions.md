# Copilot Instructions — Stock Verify Codebase

These rules help AI coding agents work productively and safely in this repo. Focus on the patterns actually used here; don’t introduce new frameworks or rewrite architecture.

## Project Snapshot
- Backend: FastAPI (Python 3.10+), MongoDB primary store, read‑only SQL Server via pyodbc.
- Frontend: React Native + Expo (TypeScript) with file‑based routing and Zustand.
- Default local ports: backend `8001`, Expo dev (`8081`, `19000-19002`, `19006`), Docker frontend `3000`.
- Core files: `backend/server.py`, `backend/config.py`, `backend/db_mapping_config.py`, `backend/api/mapping_api.py`.

## Architecture Essentials
- Multi‑DB: MongoDB holds app state; SQL Server is read‑only ERP source. Keep writes in Mongo; use SQL only for lookups/sync.
- Auth: JWT everywhere. Backends enforce `Authorization: Bearer ...` in `/api/*` routes. Use `Depends(get_current_user)` for new protected routes.
- CORS: Do not use wildcard. Configure via env `CORS_ALLOW_ORIGINS` (comma‑separated) or dev defaults in `server.py`.
- Dynamic systems: Dynamic fields and reports are first‑class (see `DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md`). Don’t hard‑code schema where dynamic config exists.
- Mapping: SQL mapping lives in `backend/db_mapping_config.py`; discovery/test endpoints in `backend/api/mapping_api.py` under `/api/mapping`.

## Run & Debug
- Easiest start (macOS): `./start.sh` (spawns two Terminal tabs; backend `8001`). Stop with `./stop.sh`.
- Manual backend: `cd backend && export PYTHONPATH=.. && uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload`.
- Manual frontend: `cd frontend && npm start`.
- Docker: `docker-compose up --build` (backend exposes `8001`; frontend on `3000`).
- Required secrets: `JWT_SECRET` and `JWT_REFRESH_SECRET` must be set (see `RUN_APP.md`). `backend/config.py` will fail fast on insecure/missing values.

## Testing & CI
- Makefile targets (run from repo root): `make ci`, `make test`, `make lint`, `make typecheck`, `make format`.
- Backend tests (see `BACKEND_TESTS_COMPLETE.md`):
  - All: `cd backend && pytest tests/ -v`
  - Coverage: `cd backend && pytest tests/ --cov=backend --cov-report=html`
- Test philosophy: Items come from ERP (SQL). Tests cover auth, sessions, count lines, ERP lookups, health/status. Do not add CRUD tests for items.

## Conventions & Patterns
- API prefix: Most app routes mount under `/api` via `api_router`. Use `app.include_router(router, prefix="/api")` as in `server.py`.
- SQL access: Always parameterize pyodbc queries with `?` placeholders (see `SQL_TEMPLATES` in `db_mapping_config.py`). Avoid string concatenation.
- Rate limiting, pooling, and sync intervals are env‑driven (see `config.py`). Prefer settings over hard‑coded constants.
- Frontend calls: Centralize via `frontend/services/*` with Axios; include JWT and honor `EXPO_PUBLIC_BACKEND_URL`.
- Error shape: Consistent `{ "detail": ..., "error_code": ..., "timestamp": ... }` per `API_CONTRACTS.md`.

## Integration Touchpoints
- SQL Discovery: `/api/mapping/tables` and `/api/mapping/columns` accept `host, port, database[, user, password, schema]` and return shapes used by mapping UI.
- Barcode lookup: Use `SQL_TEMPLATES['get_item_by_barcode']` fields when extending ERP lookups; keep joins consistent with existing LEFT JOINs.
- Dynamic reports: Prefer `/api/reports/*` patterns from `DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md` over bespoke exports.

## Guardrails for AI Agents (from .cursorrules)
- Make minimal, focused changes; never break existing flows. Test before/after every change.
- Allowed commands: `make {ci,test,lint,typecheck,format}`, `pytest`, `ruff`, `black`, `mypy`, frontend `npm run {lint,typecheck,test}`.
- Forbidden without explicit instruction: force pushes/rebases, destructive Docker ops, editing secrets, DB migrations.
- Commit discipline: keep diffs small; run `pre-commit run -a` before committing.

## Practical Examples
- Add a protected endpoint: define a router function and include with `app.include_router(api_router, prefix="/api")`; require `current_user: dict = Depends(get_current_user)`.
- Enable CORS for Expo: set `CORS_ALLOW_ORIGINS="http://localhost:8081,exp://localhost:8081"` in backend env.
- Run end‑to‑end locally: `./start.sh` → open API docs at `http://localhost:8001/api/docs` and Expo dev tools.

References: `ARCHITECTURE.md`, `API_CONTRACTS.md`, `API_REFERENCE.md`, `DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md`, `Makefile`, `docker-compose.yml`, `RUN_APP.md`.
