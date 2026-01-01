# Copilot Instructions — Stock Verify Codebase

These rules help AI coding agents work productively and safely in this repo. Focus on the patterns actually used here; don’t introduce new frameworks or rewrite architecture.

## 🏗 Architecture & Boundaries
- **Hybrid Database Model**:
  - **MongoDB (Primary)**: Stores app state, sessions, counts, and discrepancies. **ALL WRITES go here.**
  - **SQL Server (ERP)**: **READ-ONLY** source of truth for items/inventory. Never write to SQL Server.
  - **Sync**: Data flows `SQL Server -> MongoDB -> Frontend`.
- **Backend**: FastAPI (Python 3.10+), Motor (Async Mongo), PyODBC (SQL).
- **Frontend**: React Native (Expo 54), TypeScript, Zustand (State), Offline-first architecture.
- **Network**: Backend auto-detects LAN IP; Frontend reads `backend_port.json` for connection.

## 🛠 Developer Workflows
- **Startup**: Use `make start` for full stack. Individual: `make backend` (port 8001), `make frontend` (port 8081).
- **Testing**:
  - **Backend**: `make python-test` (pytest). **Mock MongoDB** with `AsyncMock` for collection methods.
  - **Frontend**: `make node-test` (Jest).
  - **Full CI**: `make ci` runs lint, typecheck, and tests for both.
- **Lint/Format**: `make format` (Black/Ruff/Prettier) and `make lint`.

## 🚨 Critical Conventions
- **SQL Queries**:
  - **MUST** be parameterized using `?` placeholders. NO f-strings for values.
  - **Mapping**: Define table/column maps in `backend/db_mapping_config.py`.
  - **Discovery**: Use `backend/api/mapping_api.py` for schema inspection.
- **Barcode Logic**:
  - **Strict Validation**: 6-digit numeric only. Prefixes: 51, 52, 53.
  - **Normalization**: ALWAYS use `_normalize_barcode_input` from `backend/api/erp_api.py`.
- **Frontend Data**:
  - **Normalization Layer**: `frontend/src/services/api/api.ts` maps backend snake_case to frontend camelCase. Update this when adding API fields.
  - **Offline**: Use `offlineStorage.ts` patterns. Check `isOnline()` before API calls.
- **Auth**:
  - JWT Bearer tokens required for `/api/*`.
  - Use `current_user: dict = Depends(get_current_user)` dependency.

## 🧩 Integration Points
- **Dynamic Configuration**:
  - Do not hardcode report schemas. Use `backend/api/dynamic_reports_api.py`.
  - Check `backend/config.py` for Pydantic-validated settings (e.g., `CORS_ALLOW_ORIGINS`).
- **Enhanced API**:
  - Use `backend/api/enhanced_item_api.py` (V2) for item lookups (includes caching/monitoring).

## ⚠️ Forbidden Actions
- **No SQL Writes**: `INSERT`, `UPDATE`, `DELETE` on SQL Server are strictly prohibited.
- **No CORS Wildcards**: Use specific origins in `backend/config.py`.
- **No Secrets in Code**: Fail fast if `JWT_SECRET` is missing.

## 📂 Key Files
- `backend/server.py`: App entry, router mounting.
- `backend/db_mapping_config.py`: SQL schema mappings.
- `frontend/src/services/api/api.ts`: Frontend API layer & type normalization.
- `Makefile`: Source of truth for build/test commands.
