# Stock Verify System - Current Application Report

**Date:** 15 December 2025
**Version:** 2.1

## 1. Executive Summary

The Stock Verify System is a robust, full-stack inventory management solution designed to bridge the gap between physical stock counting and ERP records. It leverages a modern tech stack (FastAPI, React Native/Expo, MongoDB) to provide real-time verification, offline capabilities, and seamless synchronization with ERPNext via a read-only SQL Server connection. The system is architected for scalability, security, and operational resilience, featuring role-based access control, dynamic reporting, and comprehensive observability.

## 2. Technology Stack

### Backend

- **Language:** Python 3.10
- **Framework:** FastAPI (ASGI)
- **Server:** Uvicorn
- **Database (Primary):** MongoDB (Motor driver)
- **Database (ERP Source):** SQL Server (pyodbc driver)
- **Validation:** Pydantic

### Frontend (Mobile/Web)

- **Framework:** React Native 0.81 / Expo SDK 54
- **Language:** TypeScript 5.9
- **Routing:** Expo Router (File-based)
- **State Management:** Zustand, TanStack Query
- **HTTP Client:** Axios
- **Storage:** AsyncStorage

### Infrastructure & Testing

- **Containerization:** Docker
- **Reverse Proxy:** Nginx
- **Testing:** Pytest (Backend), Playwright (E2E)

## 3. Functional Capabilities

The system delivers the following core business functions:

1. **User Authentication & Session Security**
    - Secure login with username/password.
    - JWT-based session management with refresh tokens.
    - Role-based access control (Admin, Supervisor, Staff).
    - Auto-logout policies for security.

2. **Inventory Counting Sessions**
    - Staff-initiated counting sessions.
    - Real-time barcode scanning (EAN-13, UPC-A, Code 128, QR).
    - Immediate feedback on expected vs. counted quantities.
    - Real-time discrepancy flagging.

3. **Variance Review & Approval**
    - Supervisor dashboards for reviewing discrepancies.
    - Audit trail comparison.
    - Approval/Rejection workflows for stock adjustments.
    - Syncing of approved adjustments back to ERP.

4. **Dynamic Field Configuration**
    - Admin capability to add custom metadata fields to items.
    - No database schema changes required.
    - Custom attributes flow through to capture forms and reports.

5. **Custom Reporting & Exports**
    - Flexible report template builder.
    - Filtering by warehouse, date, status, and dynamic fields.
    - Export capabilities to CSV and XLSX formats.

6. **ERPNext Synchronization**
    - Background synchronization jobs.
    - Fetching item master data from SQL Server.
    - Conflict reconciliation logic.
    - Ensures MongoDB inventory state aligns with ERP.

7. **Offline Data Capture**
    - "Queue-first" architecture for offline resilience.
    - Local storage of scans and edits during connectivity loss.
    - Automatic synchronization upon network restoration.

8. **System Health & Observability**
    - Real-time health check dashboards.
    - System diagnostics and metrics.
    - Automated recovery suggestions.

9. **Role-Based Dashboards**
    - **Staff:** Scan-focused interface, history view.
    - **Supervisor:** Variance review, session management, analytics.
    - **Admin:** User management, system config, logs, health monitoring.

10. **Security & Compliance Controls**
    - Least-privilege permission model.
    - Comprehensive audit trails for all actions.
    - API rate limiting to prevent abuse.

## 4. Key Technical Features & Architecture

### Backend Architecture

The backend is structured around a modular FastAPI application:
- **Router:** Centralized API router mounting all capabilities under `/api`.
- **Auth:** Robust JWT implementation with dependency injection for route protection.
- **Sync Engine:** Dedicated services (`erp_sync_service`, `sql_sync_service`) manage the complex data flow between the read-only ERP source and the write-heavy MongoDB operational store.
- **Dynamic Engine:** Services (`dynamic_fields_service`, `dynamic_report_service`) allow for runtime schema extension without code deployment.

### Frontend Architecture

The frontend utilizes a modern Expo stack:
- **Navigation:** File-based routing (`app/`) mirrors the URL structure and separates concerns by role (`admin/`, `staff/`, `supervisor/`).
- **State:** Global state (Auth, Settings) is managed via Zustand, while server state (Items, Sessions) is handled by TanStack Query for caching and synchronization.
- **Offline:** A dedicated `offlineQueue` service intercepts requests during downtime and replays them, ensuring data integrity.

### Integration Points

* **ERPNext:** Connected via `pyodbc` to SQL Server. The system treats ERPNext as the "Source of Truth" for item master data but maintains its own operational state for verification sessions.
- **Exports:** Dedicated endpoints and services generate downloadable reports, bridging the gap between digital records and physical audits.

## 5. Project Structure Highlights

- `backend/`
  - `api/`: API Route definitions.
  - `services/`: Business logic (Sync, Auth, Reports).
  - `db/`: Database connection and ODM models.
  - `server.py`: Application entry point.
- `frontend/`
  - `app/`: Expo Router screens.
  - `src/services/`: API clients and logic.
  - `src/store/`: State management.
  - `src/components/`: Reusable UI elements.
- `testsprite_tests/`: E2E and integration test suite.

## 6. Current Status

The system is currently in a **functional and deployed state** (v2.1).
- **Backend:** Running (Port 8001).
- **Frontend:** Running (Expo).
- **Tests:** Comprehensive test suite available (Pytest, Playwright).
- **Documentation:** Extensive documentation covers architecture, API contracts, and deployment guides.

---
*Report generated by AI Assistant based on codebase analysis.*
