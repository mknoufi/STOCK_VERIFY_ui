# Stock Verify – APM Implementation Plan
**Memory Strategy:** Dynamic-MD
**Last Modification:** 2025-12-13 (APM setup + codebase integration)
**Project Overview:** Multi-DB inventory management system with real-time stock tracking, ERP integration, and barcode scanning. FastAPI backend (MongoDB + SQL Server), React Native + Expo frontend.

---

## Project Structure

```
/
├── backend/                          # FastAPI application
│   ├── server.py                     # Main app, routers, middleware
│   ├── config.py                     # Environment & settings
│   ├── db_mapping_config.py          # SQL query templates & mapping
│   ├── api_mapping.py                # SQL discovery endpoints
│   ├── requirements.txt               # Dependencies
│   └── tests/                        # Test suite
│
├── frontend/                          # React Native + Expo
│   ├── app/                          # File-based routing (screens)
│   ├── services/                     # Centralized API calls (Axios + JWT)
│   ├── package.json                  # Frontend dependencies
│   └── tsconfig.json                 # TypeScript config
│
├── docs/                             # Documentation
│   ├── codebase_memory_v2.1.md      # Architecture & data models
│   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   ├── API_CONTRACTS.md              # Error shapes & response formats
│   ├── DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md
│   └── ...
│
├── .apm/                             # APM framework files
│   ├── Memory/
│   │   └── Memory_Root.md            # Project context & tech stack
│   ├── Implementation_Plan.md        # Existing enterprise upgrade plan
│   ├── Implementation_Plan_APM.md    # This file (APM-integrated)
│   ├── guides/                       # APM workflow docs
│   └── metadata.json                 # APM config
│
├── .cursor/commands/                 # Cursor IDE slash commands
├── Makefile                          # Build, test, lint commands
├── docker-compose.yml                # Container config
├── pytest.ini                        # Backend test config
└── README.md                         # User-facing quick start
```

---

## Tech Stack Summary

| Component | Technology | Version | Key Details |
|-----------|-----------|---------|------------|
| **Backend** | FastAPI | 3.10+ | Python async framework |
| **Primary DB** | MongoDB | Latest | App state, users, sessions |
| **Read-Only ERP** | SQL Server | Via pyodbc | ERP source (items, stock levels) |
| **Frontend** | React Native + Expo | SDK 54 | TypeScript, file-based routing |
| **State** | Zustand | Latest | Lightweight state management |
| **HTTP** | Axios | Latest | Client-side API calls |
| **Auth** | JWT | Custom impl | Access + refresh tokens (FastAPI/Depends) |
| **Local Ports** | 8001, 8081, 19000+ | — | Backend, Expo dev, debug |
| **Docker Ports** | 8001 (backend), 3000 (frontend) | — | Production containers |

---

## Execution Strategy

### Phase 0: Discovery & Planning (Setup Agent)
1. **Understand architecture** from `.github/copilot-instructions.md` and `docs/codebase_memory_v2.1.md`
2. **Identify task scope** (backend feature, frontend screen, database, auth, integration)
3. **Plan minimal, focused changes** that follow existing patterns (multi-DB, JWT, parameterized SQL)
4. **Check guardrails** from copilot instructions
5. **Update this plan** with specific implementation steps before execution

### Phase 1: Task Execution (Developer Agent)
1. **Read source code** for the target module/endpoint (use symbolic tools if available)
2. **Make minimal changes** following project conventions
3. **Run tests before/after** (Makefile: `make test`, `make lint`, `make typecheck`)
4. **Verify no regressions** in auth, CORS, error handling, JWT flow
5. **Commit with small, focused diff** (run `pre-commit run -a`)

### Phase 2: Verification & Handoff (QA/Tech Lead Agent)
1. **Run full CI** with `make ci`
2. **Check test coverage** (backend: `pytest --cov`)
3. **Validate API contracts** match `API_CONTRACTS.md`
4. **Verify deployment readiness** (no secrets leaked, no breaking changes)
5. **Approve or request revisions** before merge

---

## Critical Guardrails (From `.github/copilot-instructions.md`)

### ✅ DO
- Make minimal, focused changes
- Follow existing patterns (multi-DB, JWT, parameterized SQL)
- Test before/after every change
- Use `Depends(get_current_user)` for protected `/api/*` routes
- Parameterize all SQL with `?` placeholders (in `db_mapping_config.py`)
- Centralize frontend API calls via `frontend/services/`
- Run `make {ci,test,lint,typecheck,format}` before committing
- Keep diffs small; run `pre-commit run -a` before commit

### ❌ DON'T
- Use wildcard CORS (configure via `CORS_ALLOW_ORIGINS` env)
- Hard-code database schema (use `DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md`)
- Concatenate SQL queries (always use parameterized queries)
- Add CRUD tests for items (items come from ERP/SQL Server)
- Force push/rebase without explicit approval
- Edit secrets or perform DB migrations without instruction
- Rewrite architecture or introduce new frameworks
- Break existing workflows

---

## Common Commands

```bash
# Backend
cd backend && export PYTHONPATH=.. && uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload

# Frontend
cd frontend && npm start

# Docker (all-in-one)
docker-compose up --build

# Tests
cd backend && pytest tests/ -v
cd backend && pytest tests/ --cov=backend --cov-report=html
cd frontend && npm test

# Lint & Format
make lint          # ruff check backend, npm lint frontend
make format        # black + ruff format backend, npm format frontend
make typecheck     # mypy backend, npm typecheck frontend
make ci            # Full CI pipeline

# Quick start (macOS)
./start.sh         # Spawns backend + frontend in separate Terminal tabs
./stop.sh          # Stops all services
```

---

## Key Integration Points

### Multi-DB Architecture
- **Writes:** Always to MongoDB (primary app state)
- **Reads (ERP):** SQL Server via `db_mapping_config.py` (read-only lookups)
- **Pattern:** Keep queries parameterized; use `SQL_TEMPLATES`

### SQL Discovery (Dynamic Mapping)
- **Endpoint:** `/api/mapping/tables` and `/api/mapping/columns`
- **Accepts:** `host, port, database, [user, password, schema]`
- **Returns:** Table/column shapes for mapping UI
- **File:** `backend/api_mapping.py`

### Barcode Lookup
- **Template:** `SQL_TEMPLATES['get_item_by_barcode']` in `db_mapping_config.py`
- **Pattern:** LEFT JOINs, parameterized, consistent with existing queries
- **Integration:** Called from barcode-scanning endpoints

### Dynamic Reports
- **Pattern:** `/api/reports/*` endpoints (instead of bespoke exports)
- **Config:** `DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md`
- **Principle:** Don't hard-code schema; use dynamic field/report config

### Error Responses
- **Shape:** `{ "detail": "...", "error_code": "...", "timestamp": "..." }`
- **Reference:** `docs/API_CONTRACTS.md`
- **Backend:** All error paths must return this consistent shape

---

## APM + Stock Verify Workflow

1. **Task Definition** (User) → Define feature/bug in Cursor or command line
2. **Setup Phase** (via `/apm-1-initiate-setup`) → AI Planning Agent discovers scope
3. **Implementation** (via `/apm-2-task-loop`) → AI Developer Agent executes with these patterns
4. **Verification** (via QA checks) → Run `make ci`, validate tests and deployment
5. **Handoff** (via memory/commit) → Document in `.apm/Memory` and git history

---

## Status & Notes
- ✅ APM initialized with Cursor IDE integration
- ✅ Memory_Root.md updated with full tech stack and patterns
- ✅ Implementation_Plan_APM.md ready for task assignment
- ✅ Codebase context captured in APM memory
- 📋 Next: Define a specific task (feature, bug fix, refactor) and run APM workflow
