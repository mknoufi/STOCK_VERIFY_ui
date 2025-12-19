# Stock Verify – APM Memory Root
**Memory Strategy:** Dynamic-MD
**Project Overview:** Multi-DB inventory management system with real-time stock tracking, ERP integration, and barcode scanning. FastAPI backend (MongoDB + SQL Server), React Native + Expo frontend with JWT authentication.

## Tech Stack
- **Backend:** FastAPI (Python 3.10+), MongoDB (primary app state), SQL Server (read-only ERP source), pyodbc
- **Frontend:** React Native + Expo (SDK 54), TypeScript, Zustand (state), Axios (HTTP), file-based routing
- **Auth:** JWT (access + refresh tokens), required for all `/api/*` routes
- **Local Ports:** Backend 8001, Expo dev 8081, 19000-19002, 19006; Docker frontend 3000

## Key Architecture Patterns
- **Multi-DB:** Writes to MongoDB only; SQL Server read-only for ERP lookups/sync
- **API:** All routes under `/api` prefix via `api_router`; consistent error shape with `detail`, `error_code`, `timestamp`
- **CORS:** Non-wildcard config via `CORS_ALLOW_ORIGINS` env (comma-separated)
- **Dynamic Fields & Reports:** First-class support (see `DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md`)
- **SQL Mapping:** Configuration in `db_mapping_config.py`; discovery endpoints in `api_mapping.py`

## Core Files
- `backend/server.py` — FastAPI app entry, routers, CORS setup
- `backend/config.py` — Environment config, JWT secrets (required: `JWT_SECRET`, `JWT_REFRESH_SECRET`)
- `backend/db_mapping_config.py` — SQL mapping templates and parameterized queries
- `backend/api_mapping.py` — SQL discovery and mapping endpoints
- `frontend/app/` — React Native screens (file-based routing)
- `frontend/services/` — Centralized API calls (Axios + JWT)

## Quick Commands
- **Start (macOS):** `./start.sh` (spawns backend + frontend)
- **Backend:** `cd backend && export PYTHONPATH=.. && uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload`
- **Frontend:** `cd frontend && npm start`
- **Docker:** `docker-compose up --build`
- **Tests:** `make test`, `make ci`, `make lint`, `make typecheck`
- **Backend Tests:** `cd backend && pytest tests/ -v` or `pytest tests/ --cov=backend --cov-report=html`

## Documentation References
- `README.md` — Setup and quick start
- `.github/copilot-instructions.md` — AI coding rules and patterns (THIS AGENT FOLLOWS THESE)
- `docs/codebase_memory_v2.1.md` — Full architecture and data models
- `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` — Deployment instructions
- `docs/API_CONTRACTS.md`, `docs/API_REFERENCE.md` — API shapes and endpoints
- `docs/DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md` — Dynamic fields and reports
- `Makefile` — Build, test, lint commands
- `docker-compose.yml` — Container configuration

## Testing & CI Philosophy
- **Items from ERP:** Stock items sourced from SQL Server (read-only)
- **Test Coverage:** Auth, sessions, count lines, ERP lookups, health/status checks
- **No CRUD for Items:** Tests verify integration, not basic CRUD
- **Lint & Format:** `ruff`, `black`, `mypy` (backend); frontend npm lint/format
- **Commit Discipline:** Small, focused diffs; run `pre-commit run -a` before commit

## Critical Guardrails
- ✅ Make minimal, focused changes
- ✅ Test before/after changes
- ✅ Parameterize all SQL queries (`?` placeholders, no string concat)
- ✅ Use `Depends(get_current_user)` for protected endpoints
- ✅ Centralize frontend API calls via `frontend/services/`
- ❌ No wildcard CORS
- ❌ No force pushes/rebases without explicit approval
- ❌ No editing secrets or DB migrations without instruction
- ❌ No hard-coded schema where dynamic config exists
