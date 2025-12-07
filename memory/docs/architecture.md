# System Architecture - Stock Verify v2.1

## 1. High-Level Architecture

The system follows a microservices-inspired architecture with a clear separation of concerns between the frontend, backend, and data layers.

```mermaid
graph TD
    subgraph "Client Layer"
        MobileApp[Mobile App (React Native)]
        AdminPanel[Admin Panel (Web)]
    end

    subgraph "Application Layer"
        Backend[Backend API (FastAPI)]
        SyncService[Sync Service]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB - Primary)]
        SQLServer[(SQL Server - ERP)]
        Redis[(Redis - Cache)]
    end

    MobileApp <-->|REST API| Backend
    AdminPanel <-->|REST API| Backend
    Backend <-->|Motor| MongoDB
    Backend <-->|ODBC| SQLServer
    SyncService -->|Read| SQLServer
    SyncService -->|Write| MongoDB
    Backend <-->|Cache| Redis
```

## 2. Component Description

### 2.1 Frontend (Mobile App)
- **Framework:** React Native with Expo.
- **State Management:** Zustand.
- **Styling:** NativeWind / Unistyles.
- **Functionality:** Barcode scanning, data entry, photo capture, session management.

### 2.2 Backend (API)
- **Framework:** FastAPI (Python).
- **Responsibility:** Handles business logic, authentication, data validation, and API endpoints.
- **Concurrency:** Async/Await architecture for high performance.

### 2.3 Data Layer
- **MongoDB:** The primary operational database. Stores user verifications, session data, and a synchronized copy of item master data.
- **SQL Server:** The external ERP system. Treated as the "Source of Truth" for item master data and theoretical stock levels. Read-heavy operation.
- **Redis:** Used for caching frequently accessed data and session management (optional/planned).

## 3. Data Flow

### 3.1 Synchronization Flow
1. **Periodic Sync:** A background task runs every 60 minutes (configurable).
2. **Fetch:** It queries SQL Server for items modified since the last sync.
3. **Update:** It updates the corresponding records in MongoDB.

### 3.2 Verification Flow
1. **Scan:** User scans an item in the mobile app.
2. **Lookup:** App requests item details from Backend.
3. **Fetch:** Backend checks MongoDB first. If not found or stale, it may fetch from SQL Server.
4. **Submit:** User submits count. Backend saves verification record to MongoDB.
5. **Variance:** Backend calculates variance (Physical - ERP) and flags it if significant.

## 4. Security Architecture
- **Authentication:** JWT (JSON Web Tokens) for stateless authentication.
- **Authorization:** Role-based access control (RBAC) for Admin vs. Staff.
- **Network:** CORS policies configured. Secure communication over HTTPS recommended for production.
