# System Architecture Map

## 1. Components

### Backend Services

* **Core API**: FastAPI application (`backend/server.py`) running on port 8001.
* **Database Connector**: Custom SQL Server connector (`backend/sql_server_connector.py`) for ERP integration.
* **Sync Engine**: `AutoSyncManager` (`backend/services/auto_sync_manager.py`) for background data synchronization.
* **Monitoring**: `MonitoringService` (`backend/services/monitoring_service.py`) for metrics and health.

### Frontend Applications

* **Mobile App**: React Native (Expo) application (`frontend/`) running on port 8081.
* **Web Dashboard**: Expo web build (served via same codebase).

### Data Stores

* **MongoDB**: Primary write store for application state, sessions, and discrepancies.
  * Connection: `motor` (async).
  * Role: Source of Truth for *verification* data.
* **SQL Server**: Read-only source for ERP data (Items, Barcodes).
  * Connection: `pyodbc`.
  * Role: Source of Truth for *inventory* master data.
* **Redis**: Caching layer for sessions and frequent lookups.
  * Fallback: In-memory cache if Redis is unavailable.

### Infrastructure

* **Containerization**: Docker Compose (`docker-compose.yml`) for orchestration.
* **Local Dev**: `Makefile` for task automation.

## 2. Dependencies & Trust Boundaries

### Trust Boundaries

1. **Client ↔ API**:
   * **Boundary**: HTTP/WebSocket (Port 8001).
   * **Auth**: JWT Bearer Token (User) / PIN (Supervisor).
   * **Trust**: Low. All inputs validated via Pydantic schemas.
2. **API ↔ MongoDB**:
   * **Boundary**: TCP (Port 27017).
   * **Trust**: High (Internal Network).
3. **API ↔ SQL Server**:
   * **Boundary**: TCP (Port 1433).
   * **Trust**: Medium (Read-Only, External ERP).
4. **API ↔ Redis**:
   * **Boundary**: TCP (Port 6379).
   * **Trust**: High (Internal Network).

### Data Flow

* **Read**: Client -> API -> Redis (Cache) -> MongoDB (App Data) / SQL Server (Master Data).
* **Write**: Client -> API -> MongoDB. **No writes to SQL Server.**

## 3. Entry Points

* **API**: `backend/server.py` (FastAPI Router).
* **CLI**: `backend/scripts/` (e.g., `create_admin_temp.py`, `reset_pin.py`).
* **Cron/Jobs**: `AutoSyncManager` (Internal scheduler).
