# Software Requirements Specification (SRS)
**Project:** Stock Verify System
**Version:** 2.1
**Date:** December 23, 2025
**Status:** Approved

---

## 1. Introduction

### 1.1 Purpose
The purpose of this Software Requirements Specification (SRS) is to describe the functional and non-functional requirements for the **Stock Verify System**. This document is intended for the development team, project managers, and stakeholders to ensure a shared understanding of the system's capabilities and constraints.

### 1.2 Scope
The Stock Verify System is a mobile-first, offline-capable inventory verification application designed for retail environments (specifically Lavanya Mart). It facilitates accurate stock audits through a multi-user, rack-based workflow. The system integrates with existing ERP systems (SQL Server) for read-only master data and uses a modern backend (MongoDB, Redis, FastAPI) for high-performance state management and synchronization.

### 1.3 Definitions, Acronyms, and Abbreviations
- **SRS**: Software Requirements Specification
- **ERP**: Enterprise Resource Planning
- **API**: Application Programming Interface
- **JWT**: JSON Web Token
- **HPK**: Hierarchical Partition Keys (Cosmos DB context, applicable to data modeling principles)
- **UOM**: Unit of Measure
- **MRP**: Maximum Retail Price

### 1.4 References
- `USER_REQUIREMENTS_REPORT.md`
- `TECHNICAL_SPECIFICATION.md`
- `ARCHITECTURE.md`

---

## 2. Overall Description

### 2.1 Product Perspective
The Stock Verify System is a critical component of the Lavanya Mart inventory management ecosystem. It operates as a **standalone verification layer** that interfaces with the legacy ERP system but maintains its own state to ensure high performance and offline capabilities.

*   **System Interfaces**:
    *   **Legacy ERP (SQL Server)**: The system connects to the existing SQL Server database in a **read-only** capacity to fetch item master data (names, barcodes, prices). It does not write back to the ERP directly to prevent data corruption during the audit process.
    *   **Reconciliation Layer**: After verification is complete, the system generates reports and snapshots that can be used to manually or semi-automatically update the ERP stock levels.

*   **User Interfaces**:
    *   **Mobile Application**: Built with React Native (Expo), optimized for handheld Android/iOS devices used by staff on the floor. It features large buttons, clear text, and haptic feedback for efficient scanning.
    *   **Web Dashboard**: A responsive web interface for supervisors and admins to monitor progress, manage users, and generate reports.

*   **Hardware Interfaces**:
    *   **Camera**: Utilizes the device's camera for barcode scanning (1D/2D codes).
    *   **Network**: Uses Wi-Fi for synchronization with the local server.

### 2.2 Product Functions
The system provides a comprehensive suite of functions to support the end-to-end stock verification process:

*   **Stock Verification**:
    *   **Barcode Scanning**: High-speed scanning of item barcodes using the device camera.
    *   **Manual Entry**: Fallback mechanism to enter item codes or names when scanning fails.
    *   **Detail Capture**: Recording of Verified Quantity, Damage Quantity, Serial Numbers, MRP, UOM, and Manufacturing Date.
    *   **Photo Evidence**: Optional capability to attach photos for damaged items.

*   **Rack & Floor Management**:
    *   **Location Hierarchy**: Organization of stock into Floors (Ground, First, Second, Godowns) and Racks.
    *   **Rack Locking**: Mechanism to prevent multiple users from verifying the same rack simultaneously (using Redis locks).
    *   **Session Management**: Tracking of active verification sessions per rack.

*   **Offline Operation**:
    *   **Local Storage**: All verification data is stored locally on the device first (using AsyncStorage/MMKV).
    *   **Offline Queue**: Actions are queued when the network is unavailable.
    *   **Auto-Sync**: Background synchronization manager that pushes queued data to the server when connectivity is restored.

*   **Reporting & Analytics**:
    *   **Snapshots**: Ability to freeze the state of verification at any point in time.
    *   **Discrepancy Reports**: Comparison between verified stock and ERP system stock.
    *   **Progress Tracking**: Real-time dashboards showing percentage completion by floor/rack.

### 2.3 User Classes and Characteristics
*   **Verifier (Staff)**:
    *   **Role**: Front-line employees performing the physical scanning.
    *   **Characteristics**: Low technical expertise, high turnover. Requires a simple, foolproof interface with minimal training.
    *   **Access**: Scan screen, Rack selection, Basic profile.
*   **Supervisor**:
    *   **Role**: Team leaders managing the floor.
    *   **Characteristics**: Moderate technical expertise. Responsible for resolving conflicts and ensuring process adherence.
    *   **Access**: Unlock racks, View floor progress, Resolve sync conflicts.
*   **Administrator**:
    *   **Role**: IT or Store Manager.
    *   **Characteristics**: High technical expertise. Manages system configuration and final data reconciliation.
    *   **Access**: Full system access, User management, Report generation, System configuration.

### 2.4 Operating Environment
*   **Client Side**:
    *   **Hardware**: Android smartphones (Android 10+) or iOS devices (iOS 14+).
    *   **Software**: Expo Go or custom build of the React Native app.
*   **Server Side**:
    *   **Containerization**: Docker & Docker Compose.
    *   **Application Server**: Python 3.10+ running FastAPI.
    *   **Database**: MongoDB (v5.0+) for operational data.
    *   **Cache/Message Broker**: Redis (v6.0+) for locking and Pub/Sub.
    *   **Legacy DB**: SQL Server (2012+) via ODBC driver.
*   **Network**:
    *   Local Area Network (LAN) with Wi-Fi coverage in warehouse areas.
    *   Support for intermittent connectivity.

### 2.5 Design and Implementation Constraints
*   **Read-Only ERP Access**: The system must strictly adhere to a read-only policy for the SQL Server to avoid voiding warranties or causing inconsistencies in the legacy system.
*   **Offline Reliability**: The app must never lose data if the battery dies or the app crashes; data must be persisted to disk immediately.
*   **Concurrency**: The system must handle up to 20 concurrent users hitting the API simultaneously without degradation.
*   **Barcode Formats**: Must support EAN-13, UPC-A, and internal 6-digit codes (prefixes 51, 52, 53).

### 2.6 Assumptions and Dependencies
*   **Master Data Availability**: It is assumed that the SQL Server is up and accessible during the initial sync of master data.
*   **Device Capability**: Staff devices are assumed to have functional cameras and sufficient battery life for a 4-hour shift.
*   **Barcode Quality**: It is assumed that 95% of items have readable barcodes.

---

## 3. Specific Requirements

### 3.1 External Interface Requirements

#### 3.1.1 User Interfaces
- **Dashboard**: Displays active sections, progress, and quick actions.
- **Scan Screen**: Camera view for barcode scanning with manual entry fallback.
- **List View**: Draggable lists for organizing verified items.
- **Login Screen**: PIN-based authentication for quick access.

#### 3.1.2 Software Interfaces
- **SQL Server Connector**: Read-only connection to fetch item master data.
- **MongoDB**: Primary store for verification data, user sessions, and reports.
- **Redis**: Used for locking mechanisms and Pub/Sub for real-time updates.

### 3.2 Functional Requirements

#### 3.2.1 Search & Scanning Logic
- **FR-01**: The system shall initiate search only after 3 characters are typed.
- **FR-02**: Inputs starting with `51`, `52`, or `53` shall be treated as Barcodes.
- **FR-03**: All other inputs shall be treated as Item Names.
- **FR-04**: Search shall exclude "Item Code" to prevent irrelevant results.

#### 3.2.2 Stock Verification Workflow
- **FR-05**: Users shall be able to scan an item, view details from SQL, and enter verified quantity.
- **FR-06**: The system shall capture additional details: Damage, Serial Numbers, MRP, UOM, Mfg Date.
- **FR-07**: Users shall be able to work on specific Racks/Floors.

#### 3.2.3 Offline & Sync
- **FR-08**: The system shall allow full verification functionality while offline.
- **FR-09**: Data shall be queued locally and synced automatically when connectivity is restored.
- **FR-10**: The system shall handle synchronization conflicts gracefully.

#### 3.2.4 User Management
- **FR-11**: The system shall support PIN-based login for 1000+ users.
- **FR-12**: Authentication shall be secured via JWT.

#### 3.2.5 Reporting
- **FR-13**: The system shall generate stock snapshots.
- **FR-14**: Admins shall be able to export reports and view discrepancies.

### 3.3 Performance Requirements
- **PR-01**: The system shall support at least 20 concurrent users.
- **PR-02**: Scan response time shall be under 200ms (local lookup).
- **PR-03**: Sync operations shall occur in the background without blocking the UI.

### 3.4 Security Requirements
- **SR-01**: All API endpoints shall require valid JWT authentication.
- **SR-02**: Passwords and PINs shall be hashed using Argon2.
- **SR-03**: SQL queries shall be parameterized to prevent injection.
- **SR-04**: CORS shall be configured to allow only trusted origins.

---

## 4. Appendices

### 4.1 Database Schema (Conceptual)
- **Items**: `_id`, `barcode`, `name`, `erp_data`, `verified_qty`, `rack_id`, `timestamp`
- **Users**: `_id`, `username`, `pin_hash`, `role`
- **Racks**: `_id`, `name`, `floor`, `status`

### 4.2 API Endpoints (Key)
- `GET /api/items/search`: Search items
- `POST /api/sync/batch`: Batch synchronization
- `POST /api/auth/login`: User login
