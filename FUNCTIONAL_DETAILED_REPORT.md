# Stock Verify System - Functional Detailed Report

## 1. Executive Summary

The **Stock Verify System** is a comprehensive solution for inventory management, combining a robust **Python/FastAPI backend** with a **React Native (Expo) mobile frontend**. It is designed to handle high-volume inventory verification with features like offline synchronization, intelligent conflict resolution, role-based access control, and real-time analytics. The system operates on a dual-database architecture (MongoDB for operations, SQL Server for ERP integration) and emphasizes data integrity through a strict verification workflow.

---

## 2. Core Functional Modules

### 2.1. Authentication & Security Policy (`backend/api/auth.py`, `permissions_api.py`)

* **Token-Based Auth**: Uses **JWT (JSON Web Tokens)** for stateless authentication.
* **Role-Based Access Control (RBAC)**: Distinct permissions for `Staff`, `Supervisor`, and `Admin` roles enforced via FastAPI dependencies.
* **Login Flow**: Supports username/password and PIN-based login. Includes rate limiting (`RATE_LIMIT_ENABLED`) to prevent brute-force attacks.
* **Session Security**: Automatic token expiration (`ACCESS_TOKEN_EXPIRE_MINUTES`) and refresh token rotation (`REFRESH_TOKEN_EXPIRE_DAYS`).

### 2.2. Session Management Architecture

The system employs a dual-session strategy catering to different user needs:

#### A. Mobile/Worker Session Management (`backend/api/session_management_api.py`)

* **Purpose**: Manages active scanning workflows for staff on the floor.
* **Granularity**: Tracks sessions at the **User + Rack** level.
* **Heartbeat Mechanism**: Clients must send a heartbeat (`/heartbeat`) every 20-30s to maintain:
  * **User Presence**: Updates "Last Seen" status in Redis.
  * **Resource Locking**: Renews exclusive locks on specific **Racks** to prevent concurrent verification by multiple users.
* **Lifecycle**: Active -> Paused -> Completed.
* **Stats**: Real-time calculation of items per minute, duration, and completion rates.

#### B. Supervisor/Admin Session Context (`backend/api/session_api.py`)

* **Purpose**: High-level oversight of verification activities.
* **Capabilities**:
  * **Pagination & Filtering**: Efficient retrieval of session lists (`/sessions`).
  * **Bulk Operations**: "Close", "Reconcile", and "Export" multiple sessions simultaneously.
  * **Analytics**: Aggregated metrics (total variance, efficiency by warehouse/staff) computed via MongoDB aggregation pipelines.

### 2.3. Inventory & Verification Engine

* **Item Lookup (`enhanced_item_api.py`)**:
  * **Intelligent Search**: Prioritizes exact barcode matches, then falls back to fuzzy name/code searching.
  * **Caching**: Redis caching for frequently accessed item data to reduce DB load.
* **Verification Logic (`item_verification_api.py`)**:
  * **Variance Calculation**: Automatically computes `Variance = (Verified + Returnable Damage) - System Qty`.
  * **Condition Reporting**: Tracks granular item state (Good, Damaged, Expired) and captures "Non-returnable" damage.
  * **Strict Mode**: Optional enforcement where users must confirm variances explicitly before submission.
* **Master Data**: Read-only integration with SQL Server (ERP) for canonical item data, utilizing MongoDB for operational overlays (updates/verifications).

### 2.4. Synchronization & Offline Resilience (`backend/api/sync_batch_api.py`)

* **Batch Architecture**: Validates and processes multiple records in a single HTTP request (`/batch`).
* **Conflict Detection (`SyncConflictsService`)**:
  * **Duplicate Prevention**: Checks for duplicate serial numbers across the entire database.
  * **Lock Validation**: Ensures the user still holds the lock for the targeted rack.
  * **Data Integrity**: Validates `damage_qty <= verified_qty`.
* **Resilience Pattern**: Implements a **Circuit Breaker** to fail fast during system stress preventing cascading failures.
* **Feedback Loop**: Returns precise status for each record in the batch: `OK`, `Conflict`, or `Error`.

### 2.5. Reporting Engine (`backend/api/report_generation_api.py`)

A centralized engine capable of generating reports in **JSON, CSV, or XLSX** formats.

* **Report Types**:
    1. **Stock Summary**: Aggregated views of stock levels and values.
    2. **Variance Report**: Detailed breakdown of discrepancies (`variance != 0`).
    3. **User Activity**: Productivity metrics (scans/hour, total actions).
    4. **Session History**: Outcomes of completed sessions.
    5. **Audit Trail**: Security and action logs.
* **Filtering**: Dynamic filtering by Warehouse, Floor, Category, User, and Date Range.

---

## 3. Technical Functionality Breakdown

### 3.1. Backend API Services (`backend/api/`)

| File / Router | Core Capabilities | Key Endpoints |
| :--- | :--- | :--- |
| `auth.py` | Authentication, Token Management | `POST /login`, `POST /refresh`, `GET /me` |
| `enhanced_item_api.py` | Advanced Item Search & Lookup | `GET /erp/items/barcode/{code}`, `GET /search` |
| `session_management_api.py` | **Mobile** Session & Locking | `POST /sessions/{id}/heartbeat`, `POST /{id}/complete` |
| `session_api.py` | **Admin** Session Control | `GET /sessions`, `POST /bulk/close`, `GET /analytics` |
| `item_verification_api.py` | Verification Logic | `PATCH /verify`, `GET /variances`, `POST /update-master` |
| `sync_batch_api.py` | Offline Sync Processing | `POST /sync/batch`, `POST /sync/heartbeat` |
| `admin_dashboard_api.py` | System Monitoring | `GET /kpis`, `GET /system-status`, `GET /active-users` |
| `report_generation_api.py` | Data Export & Reporting | `POST /reports/generate`, `POST /reports/export/{format}` |
| `metrics_api.py` | Prom./JSON Metrics | `GET /metrics` (Prometheus), `GET /metrics/json` |

### 3.2. Frontend Modules (`frontend/app/`)

#### Staff App

* **Scan Screen (`staff/scan.tsx`)**:
  * **Camera Integration**: Real-time barcode scanning using `expo-camera`.
  * **Visual Search**: AI-powered object recognition (placeholder/beta).
  * **State Management**: Local tracking of session state and queue for offline resiliency.
* **Item Detail (`staff/item-detail.tsx`)**:
  * **Complex Form**: Handles Quantity, Serial Numbers (dynamic list), Manufacturing Date.
  * **Condition Logic**: Toggles for "Damage Reporting" with reason codes.
  * **Strict Mode UI**: Alerts users when counted quantity mismatches system stock (Strict Mode only).
  * **Photo Capture**: Integrated modal for capturing evidence of damage/issues.

#### Supervisor App

* **Dashboard (`supervisor/dashboard.tsx`)**:
  * **Visual KPIs**: Progress rings and charts for session completion status.
  * **Activity Feed**: Real-time list of recent actions.
* **Sessions List (`supervisor/sessions.tsx`)**:
  * **Performance List**: Uses `FlashList` for handling large datasets efficiently.
  * **Visual Status**: Color-coded badges for Session Status (`OPEN`, `CLOSED`, `RECONCILE`).
  * **Details View**: Drill-down capability into specific session metrics.
* **Watchtower (`supervisor/watchtower.tsx`)**: "God mode" view for monitoring all active users and potential unexpected behaviors.

#### Admin Portal (`dashboard-web.tsx`)

* **Web-First UI**: Optimized for desktop browsers.
* **System Health**: Visual indicators for DB connectivity (Mongo/SQL) and API latency.
* **Audit**: Full access to global error logs and user activity trails.

---

## 4. Current Functional Status & Gaps

### Fully Functional

* ✅ **User Authentication**: Secure login with RBAC.
* ✅ **Core Verification**: scanning, manual entry, variance tracking.
* ✅ **Session Management**: Full lifecycle management (Create -> Verify -> Close).
* ✅ **Reporting**: Comprehensive export capabilities (CSV/Excel).
* ✅ **Monitoring**: Real-time dashboards for Admins/Supervisors.

### Partial / Beta

* ⚠️ **Offline Sync**: `sync_batch_api` is robust, but frontend handling of complex conflicts (e.g. concurrent edits to same item) needs rigorous testing.
* ⚠️ **Visual AI Search**: Skeleton implementation exists, but core ML model integration is pending.

### Known Gaps

* ❌ **ERP Write-Back**: The system currently **reads** from SQL Server but does not write verified counts back to the ERP automatically. This is a manual reconciliation step.
* ❌ **Advanced Serial Tracking**: While serials are captured, full lifecycle tracking (history of a specific serial number across sessions) is limited.

---

## 5. Technical Stack & Dependencies

### 5.1. Backend Infrastructure

* **Framework**: Python `3.11` + FastAPI `0.115.8`
* **Server**: Uvicorn `0.34.1` (ASGI), Gunicorn `23.0.0` (Process Manager)
* **Databases**:
  * **Operational**: MongoDB `8.0` (via **Motor** `3.7.0` driver)
  * **Legacy/ERP**: SQL Server (via **PyODBC** `5.2.0`)
  * **Caching/Locks**: Redis `5.2.1`
* **Authentication**:
  * **PyJWT** `2.10.1` (Token handling)
  * **Passlib** `1.7.4` + **BCrypt** `4.2.1` (Password Hashing)
* **Data Science & ML**:
  * **Pandas** `2.2.3` / **NumPy** `2.0.2` (Data Analysis)
  * **PyTorch** `2.0.0` (CPU version for ML inference)
  * **Sentence-Transformers** `2.2.2` (Semantic Search embeddings)
  * **RapidFuzz** `3.5.2` (Fuzzy string matching)

### 5.2. Frontend Architecture

* **Core**: React Native `0.81.5`, React `19.1.0`
* **Framework**: Expo `54.0.29` (SDK 52), Expo Router `6.0.19`
* **State Management**:
  * **Zustand** `5.0.9` (Client State)
  * **TanStack Query** `5.59.16` (Server State/Caching)
* **UI Components**:
  * **FlashList** `2.0.2` (High-performance lists)
  * **Reanimated** `4.1.1` (Animations)
  * **Lottie** `7.1.0` (Vector Animations)
* **Key Native Modules**:
  * `expo-camera` (Barcode scanning)
  * `expo-file-system` (Local caching/logs)
  * `expo-secure-store` (Token storage)
  * `expo-haptics` (Feedback)

### 5.3. Key Algorithms & Implementation Details

#### A. Intelligent Item Lookup Strategy

**Method**: `enhanced_item_api.get_item_by_barcode_enhanced`

1. **Cache Hit**: Checks Redis for `item:{barcode}` key.
2. **Primary DB**: Queries MongoDB `items` collection (indexed).
3. **ERP Fallback**: If not found, queries SQL Server via PyODBC.
4. **Fuzzy Fallback**: If standard lookup fails, uses `RapidFuzz` to match input against cached item names.

#### B. Robust Batch Synchronization

**Method**: `sync_batch_api.process_batch`

1. **Rate Limiting**: Checks per-user sync frequency caps.
2. **Circuit Breaker**: Halts processing if failure rate > threshold within time window.
3. **Conflict Detection**:
    * **Serial Uniqueness**: `db.items.find({"serials.serial": new_serial})` (Global check).
    * **Rack Locking**: Validates `redis.get(f"rack_lock:{rack_id}") == user_id`.
4. **Atomic Write**: Uses MongoDB entries (`insert_many` / `update_one`) within a transaction where possible.

#### C. Session Heartbeat & Locking

**Method**: `session_management_api.heartbeat`

1. **Traffic Control**: Clients ping every 20-30s.
2. **Status Update**: Sets `user_status:{id}:last_seen` in Redis (TTL 60s).
3. **Lock Renewal**: Extends TTL of acquired Rack Locks (`rack_lock:{id}`) to prevent orphans if app crashes.
1. **Traffic Control**: Clients ping every 20-30s.
2. **Status Update**: Sets `user_status:{id}:last_seen` in Redis (TTL 60s).
3. **Lock Renewal**: Extends TTL of acquired Rack Locks (`rack_lock:{id}`) to prevent orphans if app crashes.

#### D. Dynamic Reporting Engine

**Method**: `report_generation_api.generate_report`

* **Aggregation Framework**: Heavily uses MongoDB Aggregation Pipelines (`$match`, `$lookup`, `$group`, `$project`) to avoid loading raw datasets into application memory.
* **Stream Processing**: Generates CSV/XLSX rows on-the-fly using `StreamingResponse` to handle large datasets with minimal RAM footprint.

---

## 6. Data Architecture & Flow

### 6.1. High-Level Data Flow

1. **Ingestion (Mobile App)**:
    * Staff scans items using the `ScanScreen`.
    * Data is stored locally in `Zustand` store (persisted via `MMKV` or `AsyncStorage` for offline support).
    * **Queue System**: Actions (Scans, Verifications) are queued if the device is offline.
2. **Synchronization (Offline-First)**:
    * **Network Restore**: App detects connectivity via `NetInfo`.
    * **Batch Push**: Queued actions are bundled and sent to `POST /sync/batch`.
    * **Conflict Resolution**: Server processes the batch, checking for locks and duplicates, and returns specific status flags per record (`OK`, `CONFLICT`).
3. **Persistence (Dual-Database)**:
    * **Write**: Verified data is written to **MongoDB** (`stock_verify` database).
    * **Read**: Canonical item details are fetched from **SQL Server** if not found in MongoDB or Redis cache.
4. **Analysis & Export**:
    * Admins trigger reports via `POST /reports/generate`.
    * Backend aggregates data from MongoDB `sessions` and `items` collections.
    * Results are streamed back as CSV/Excel files.

---

## 7. Database Schema & Data Models

Based on `backend/api/schemas.py`, the system relies on these core domain models:

### 7.1. ERPItem (The "Golden Record")

Represents a physical inventory item.

* **Identity**: `item_code`, `barcode`, `manual_barcode`.
* **Location**: `warehouse`, `floor`, `rack`, `location`.
* **Verification Status**: `verified` (bool), `verified_by` (user), `verified_at` (timestamp).
* **Quantities**:
  * `stock_qty`: System count (from ERP).
  * `verified_qty`: Physical count from scanned.
  * `variance`: `verified_qty - stock_qty`.
  * `damaged_qty` / `non_returnable_damaged_qty`: Condition breakdown.
* **Metadata**: `sales_price`, `brand_name`, `supplier_name`, `image_url`.

### 7.2. Session (Workflow Container)

Groupings of verification work.

* **Fields**: `id` (UUID), `warehouse`, `staff_user`, `status` (OPEN/CLOSED/RECONCILE).
* **Metrics**: `total_items`, `total_variance`.
* **Timestamps**: `started_at`, `closed_at`, `reconciled_at`.

### 7.3. CountLine (Granular Action)

Individual scan records, often aggregated into a Session.

* **Core**: `session_id`, `item_code`, `counted_qty`.
* **Evidence**: `photo_base64`, `photo_proofs` (list of URLs).
* **Correction Logic**: `correction_reason`, `category_correction` (for correcting master data errors on the fly).
* **Exceptions**: `variance_reason`, `remark`.

### 7.4. UnknownItem (Ad-hoc Discovery)

Items found physically that do not exist in the system.

* **Capture**: `barcode`, `description`, `photo_base64`.
* **Resolver**: `reported_by`, `reported_at`.

---

## 8. Error Handling & Monitoring

### 8.1. API Response Standardization

All API endpoints follow a strict envelope format defined in `ApiResponse[T]`:

```json
{
  "success": true,
  "data": { ... },     // The actual payload
  "error": null,       // Detailed error dict if success=false
  "message": "...",    // Human readable status
  "request_id": "..."  // Traceability ID
}
```

### 8.2. Monitoring & Logging

* **Application Logs**:
  * **Backend**: Python standard logging, structured for analysis (`backend.log`, `backend_startup.log`).
  * **Frontend**: `Page 0` logs for critical UI errors.
* **Sentry Integration**:
  * Frontend uses `@sentry/react-native` to capture JS crashes and native exceptions in production.
* **Health Checks**:
  * `GET /system-status`: Exposes DB connectivity health (Mongo/SQL/Redis) to the Admin Dashboard.
  * `GET /metrics`: Prometheus-formatted metrics for external scraping.
