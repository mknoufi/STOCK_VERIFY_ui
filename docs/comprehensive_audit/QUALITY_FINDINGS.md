# Static Quality Findings

## Backend (Python)

### 1. Complexity Hotspots

* **File**: `backend/server.py`
  * **Severity**: Medium
  * **Finding**: Large file (2000+ lines) handling app initialization, routing, and service startup.
  * **Risk**: Hard to maintain, test, and reason about startup order.
  * **Fix**: Refactor service initialization into dedicated `lifespan` handlers or a `create_app` factory in `backend/core/`.

### 2. Error Handling

* **File**: `backend/sql_server_connector.py`
  * **Severity**: Low
  * **Finding**: Broad `except Exception` blocks in connection logic.
  * **Risk**: May mask underlying system issues or interrupt signals.
  * **Fix**: Catch specific `pyodbc.Error` or `OSError` where possible.

### 3. Type Safety

* **File**: `backend/config.py`
  * **Severity**: Low
  * **Finding**: `type: ignore` usage for Pydantic compatibility.
  * **Risk**: Potential type mismatches in configuration loading.
  * **Fix**: Upgrade to Pydantic v2 native types fully and remove shims.

## Frontend (React Native)

### 1. TypeScript Strictness

* **File**: `frontend/tsconfig.json` (Inferred)
  * **Severity**: Medium
  * **Finding**: Ensure `strict: true` is enabled.
  * **Risk**: Runtime null pointer exceptions in UI.
  * **Fix**: Enable strict mode and fix resulting type errors.

### 2. State Management

* **File**: `frontend/src/store` (Inferred)
  * **Severity**: Low
  * **Finding**: Verify Zustand stores are not holding excessive derived state.
  * **Risk**: Performance degradation on low-end Android devices.
  * **Fix**: Use selectors for derived state.
