# Research: Comprehensive App Improvements

**Date**: 2025-12-24
**Feature**: 002-system-modernization-and-enhancements
**Status**: Complete

## Executive Summary

This document captures technology decisions and best practices research for the comprehensive improvements to STOCK_VERIFY. All major unknowns have been resolved.

---

## 1. Real-Time WebSocket Implementation

### Decision
Use **FastAPI native WebSocket** with `ConnectionManager` pattern for backend, and **React Native WebSocket API** for frontend.

### Rationale
- FastAPI has built-in WebSocket support via Starlette
- No additional dependencies required
- Proven pattern for real-time notifications in FastAPI apps
- React Native includes WebSocket API natively (no extra package needed)

### Alternatives Considered
| Option | Rejected Because |
|--------|-----------------|
| Socket.IO | Adds complexity, requires additional npm package, overkill for simple notifications |
| Server-Sent Events (SSE) | One-directional only, WebSocket better for bidirectional heartbeats |
| Pusher/Firebase | External dependency, cost, complexity for self-hosted solution |

### Implementation Pattern

```python
# backend/services/websocket_service.py
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}  # user_id -> connections

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    async def broadcast_to_supervisors(self, message: dict):
        # Filter connections by role (Supervisor only per spec)
        ...
```

---

## 2. Offline Support with SQLite

### Decision
Use **expo-sqlite** (already installed) with a **queue-based sync pattern** and **conflict resolution via item locking**.

### Rationale
- expo-sqlite already in dependencies (v16.0.10)
- SQLite provides reliable local storage for React Native
- Queue pattern matches spec requirement: "clear local records immediately after server confirmation"
- Item locking aligns with clarification: "Temporary lock of item until resolved"

### Alternatives Considered
| Option | Rejected Because |
|--------|-----------------|
| AsyncStorage only | Not suitable for structured data, no query capability |
| WatermelonDB | Additional dependency, overkill for sync queue |
| Realm | Heavy dependency, licensing complexity |

### Sync Queue Schema

```sql
-- Offline operations queue
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL,  -- 'count_update', 'session_complete', etc.
  payload TEXT NOT NULL,    -- JSON serialized
  created_at INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending'  -- 'pending', 'syncing', 'failed'
);

-- Conflict tracking
CREATE TABLE IF NOT EXISTS item_locks (
  item_code TEXT PRIMARY KEY,
  locked_by TEXT NOT NULL,
  locked_at INTEGER NOT NULL
);
```

---

## 3. Theme Engine Architecture

### Decision
Use **Zustand store** with **AsyncStorage persistence** for theme state. Implement **CSS-in-JS pattern** with React Native StyleSheet.

### Rationale
- Zustand already in use (v5.0.9)
- AsyncStorage already in dependencies
- Minimal new code, follows existing state management pattern
- Supports dynamic font sizes and color schemes per spec

### Theme State Shape

```typescript
interface ThemeState {
  colorScheme: 'light' | 'dark' | 'system';
  primaryColor: string;  // hex color
  fontSize: 'small' | 'medium' | 'large';
  fontScale: number;  // 0.85, 1.0, 1.15

  // Actions
  setColorScheme: (scheme: ThemeState['colorScheme']) => void;
  setPrimaryColor: (color: string) => void;
  setFontSize: (size: ThemeState['fontSize']) => void;
}
```

---

## 4. Redis Caching Strategy

### Decision
Implement **optional Redis caching** with **fallback to no-cache** for development environments.

### Rationale
- Redis specified in spec dependencies
- Caching critical for < 200ms API response target
- Optional dependency allows local development without Redis
- Focus on frequently accessed data: items, user sessions, ERP lookups

### Cache Keys Pattern

```text
stock_verify:item:{barcode}         # TTL: 5 min (ERP data)
stock_verify:session:{session_id}   # TTL: 30 min (active session)
stock_verify:user:{user_id}         # TTL: 15 min (user profile)
stock_verify:erp:items:all          # TTL: 10 min (item list)
```

### Implementation

```python
# backend/services/cache_service.py
class CacheService:
    def __init__(self, redis_url: Optional[str] = None):
        self.redis = None
        if redis_url:
            self.redis = redis.from_url(redis_url)

    async def get(self, key: str) -> Optional[str]:
        if not self.redis:
            return None
        return await self.redis.get(key)

    async def set(self, key: str, value: str, ttl: int = 300):
        if self.redis:
            await self.redis.setex(key, ttl, value)
```

---

## 5. Barcode Scanner Optimization (1D Focus)

### Decision
Configure **expo-camera** with optimized settings for 1D barcodes (EAN-13, Code 128).

### Rationale
- expo-camera already in dependencies (v17.0.9)
- Spec explicitly requires "1D barcode focus"
- Reduce scanning latency by limiting barcode types
- Add haptic feedback per spec ("haptic and visual feedback")

### Configuration

```typescript
// Optimized for 1D barcodes
const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'code128',
  'code39',
  'upc_a',
  'upc_e',
];

// expo-camera settings
const cameraConfig = {
  barCodeScannerSettings: {
    barCodeTypes: BARCODE_TYPES,
    interval: 500,  // ms between scans
  },
};
```

---

## 6. Analytics Dashboard Focus

### Decision
Focus analytics on **Discrepancy & Accuracy** (variance between ERP and physical count) as specified in clarification.

### Rationale
- Per Session 2025-12-24 clarification: "primary focus for advanced analytics → Discrepancy & Accuracy"
- Aligns with core business value of stock verification
- Build on existing variance data in count sessions

### Key Metrics

| Metric | Formula | Visualization |
|--------|---------|---------------|
| **Variance Rate** | (items with variance / total items) × 100 | Gauge chart |
| **Accuracy Score** | 100 - Variance Rate | KPI card |
| **Variance by Category** | Group variances by item category | Bar chart |
| **Trend Over Time** | Daily/weekly accuracy scores | Line chart |

---

## 7. Testing Infrastructure

### Decision
- **Backend**: pytest with pytest-asyncio, pytest-cov (target: 80%+)
- **Frontend**: Jest with React Native Testing Library
- **E2E**: Detox for mobile, Playwright for web

### Rationale
- All testing frameworks already configured in project
- Match existing patterns in `backend/tests/` and `frontend/__tests__/`
- E2E frameworks mentioned in spec dependencies

### Test Coverage Strategy

| Layer | Target | Focus Areas |
|-------|--------|-------------|
| Backend Unit | 85% | Services, utilities, validators |
| Backend Integration | 70% | API endpoints, database operations |
| Frontend Unit | 75% | Components, hooks, stores |
| E2E | Critical paths | Login → Scan → Save → Approve |

---

## 8. Performance Optimization Patterns

### Decision
Apply **incremental optimization** with **performance budgets**.

### Key Optimizations

| Area | Optimization | Expected Impact |
|------|-------------|-----------------|
| **Backend** | DB indexes on barcode, item_name | < 100ms queries |
| **Backend** | Redis caching for hot paths | < 200ms API p95 |
| **Backend** | Connection pooling (Motor) | Handle 100+ concurrent |
| **Frontend** | FlashList virtualization | Smooth 10k+ items |
| **Frontend** | Route-based code splitting | < 500KB bundle |
| **Frontend** | Image lazy loading + WebP | Faster initial load |

---

## Dependencies to Add

### Backend

```text
redis>=5.0.0      # Caching (optional)
```

### Frontend

No new dependencies required. All needed packages already installed.

---

## 6. Environment Variable Management

### Executive Summary
The repository currently contains **12 different .env-related files** distributed across root, backend, frontend, and agent directories. This proliferation creates a high risk of configuration drift and developer confusion.

**Key Finding:** The root `.env` file is **not loaded** by the application code (`backend/config.py` or Expo), yet it exists, likely leading developers to define secrets there that are ignored.

### File Inventory & Status

| Location | File | Status | Loaded By | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Root** | `.env` | **Inactive / Ambiguous** | None | **High Confusion Risk.** Ignored by backend/frontend. |
| | `.env.production.example` | Example | N/A | Template for root production. |
| | `.env.sql_server.example` | Example | N/A | Should be merged into backend example. |
| | `.env.sql_setup` | Specific | Scripts | Likely for `create_readonly_user.sql` or similar. |
| **Backend** | `.env` | **Active (Local)** | `backend/config.py` | Primary config for `python -m backend.server`. |
| | `.env.docker` | **Active (Docker)** | `docker-compose.yml` | Overrides for Docker networking (e.g., `mongo` host). |
| | `.env.ci` | Active (CI) | CI Pipelines | Used for automated testing. |
| | `.env.production` | Active (Prod) | Deploy Scripts | Production secrets. |
| | `.env.example` | Example | N/A | Primary template for backend. |
| **Frontend** | `.env` | **Active** | Expo | Auto-loaded by Expo CLI. |
| | `.env.example` | Example | N/A | Primary template for frontend. |
| **Agent** | `.env` | Active | Agent Scripts | Specific to `cooking_agent`. |

### Loading Mechanism Analysis

#### Backend (`backend/config.py`)
- **Mechanism:** `pydantic-settings`
- **Source:** `env_file=str(ROOT_DIR / ".env")` (where `ROOT_DIR` is `backend/`)
- **Conflict:** It strictly looks inside `backend/`. It ignores the root `.env`.

#### Frontend (`frontend/app.config.js`)
- **Mechanism:** Expo CLI automatic loading.
- **Source:** Looks for `.env` in `frontend/`.
- **Conflict:** Ignores root `.env`.

#### Docker (`docker-compose.yml`)
- **Mechanism:** `env_file` directive.
- **Source:** `backend` service loads `./backend/.env.docker`.
- **Conflict:** It does **not** load `backend/.env`. This means variables added to `backend/.env` for local dev are **missing** in Docker unless manually duplicated to `.env.docker`.

### Risks Identified

1.  **"Phantom" Configuration:** Users editing the root `.env` will see no effect, leading to "it works on my machine" (if they have cached vars) or "why isn't this working" scenarios.
2.  **Local vs. Docker Drift:** The separation of `backend/.env` and `backend/.env.docker` without a shared base means they will inevitably drift apart.
3.  **Example Fragmentation:** Critical config (SQL Server) is in a separate example file (`.env.sql_server.example`) at the root, rather than in `backend/.env.example`, making it easy to miss.

### Recommendations

#### A. Immediate Cleanup
1.  **Rename/Remove Root `.env`:** Rename to `.env.root.unused` or delete it to stop developers from using it.
2.  **Merge Examples:** Move contents of `.env.sql_server.example` into `backend/.env.example` and delete the former.

#### B. Configuration Strategy
1.  **Docker Inheritance:** Update `docker-compose.yml` to load *both* files, allowing `backend/.env` to provide shared defaults and `.env.docker` to provide overrides.
    ```yaml
    env_file:
      - ./backend/.env        # Base config (Shared)
      - ./backend/.env.docker # Overrides (Network specific)
    ```
2.  **Documentation:** Update `STARTUP_GUIDE.md` to explicitly forbid using the root `.env` and clarify the split between backend and frontend configuration.

---

## Next Steps

1. ✅ Research complete
2. → Proceed to Phase 1: Generate data-model.md
3. → Generate API contracts in contracts/
4. → Create quickstart.md for developer onboarding

## 2. Environment Configuration Strategy

### Decision
Consolidate environment configuration to eliminate ambiguity and potential conflicts.

### Rationale
The repository contained 12+ `.env` files. Analysis showed:
1.  **Root `.env` is ignored**: Neither backend nor frontend used it.
2.  **Docker vs. Local Drift**: Docker ignored local `backend/.env`.
3.  **Fragmentation**: SQL settings were isolated in a separate example file.

### Implementation
1.  **Backend**: Primary source is `backend/.env`.
2.  **Docker**: Updated to load `backend/.env` (base) + `backend/.env.docker` (overrides).
3.  **Cleanup**: Deleted root `.env` and merged examples into `backend/.env.example`.

