# STOCK_VERIFY - Complete File Structure Documentation

**Version:** 1.0
**Last Updated:** 2025-11-28
**Purpose:** Comprehensive documentation of the codebase structure

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Root Directory Structure](#root-directory-structure)
3. [Backend Structure](#backend-structure)
4. [Frontend Structure](#frontend-structure)
5. [Admin Panel Structure](#admin-panel-structure)
6. [Entry Points & Startup](#entry-points--startup)
7. [Data Flow Architecture](#data-flow-architecture)

---

## 🎯 Project Overview

**STOCK_VERIFY** is a full-stack stock verification application for ERPNext integration.

- **Backend:** FastAPI (Python 3.10+) with MongoDB + SQL Server
- **Frontend:** React Native/Expo (TypeScript) - Mobile-first
- **Admin Panel:** Web-based control panel (Python HTTP server)
- **Architecture:** Multi-database (MongoDB primary, SQL Server read-only)

---

## 📁 Root Directory Structure

```
STOCK_VERIFY_2-db-maped/
│
├── 📂 backend/              # FastAPI backend application
├── 📂 frontend/             # React Native/Expo frontend
├── 📂 admin-panel/          # Web-based admin control panel
├── 📂 scripts/              # Utility and deployment scripts
├── 📂 docs/                 # Additional documentation
├── 📂 specs/                # Specification documents
├── 📂 nginx/                # Nginx configuration
│
├── 📄 README.md             # Main project documentation
├── 📄 ARCHITECTURE.md       # Architecture overview
├── 📄 API_CONTRACTS.md      # API endpoint contracts
├── 📄 requirements.production.txt
├── 📄 docker-compose.yml
├── 📄 Dockerfile
├── 📄 Makefile
│
├── 🚀 start.sh              # Main startup script (recommended)
├── 🛑 stop.sh               # Stop all services
└── 🔄 restart.sh            # Restart services
```

---

## 🔧 Backend Structure

```
backend/
│
├── 📄 server.py                    # ⭐ MAIN ENTRY POINT - FastAPI app
├── 📄 config.py                    # Application configuration (Pydantic)
├── 📄 api_mapping.py               # SQL Server table mapping
├── 📄 sql_server_connector.py      # SQL Server connection handler
│
├── 📂 api/                         # API Route Handlers (19 files)
│   ├── admin_control_api.py        # Admin service management
│   ├── dynamic_fields_api.py       # Dynamic field configuration
│   ├── dynamic_reports_api.py      # Dynamic report generation
│   ├── enhanced_item_api.py        # Enhanced item operations
│   ├── exports_api.py              # Data export functionality
│   ├── health.py                   # Health check endpoints
│   ├── item_verification_api.py    # Item verification operations
│   ├── master_settings_api.py      # Master settings management
│   ├── metrics_api.py              # System metrics
│   ├── notes_api.py                # Notes feature
│   ├── permissions_api.py          # Permission management
│   ├── security_api.py             # Security dashboard
│   ├── self_diagnosis_api.py       # Auto-diagnosis tools
│   ├── service_logs_api.py         # Service log access
│   ├── sql_connection_api.py       # SQL connection management
│   ├── sync_conflicts_api.py       # Sync conflict resolution
│   ├── sync_management_api.py      # Sync management
│   └── sync_status_api.py          # Sync status endpoints
│
├── 📂 auth/                        # Authentication & Authorization
│   ├── dependencies.py             # FastAPI dependencies (get_current_user)
│   ├── jwt_provider.py             # JWT token generation/validation
│   └── permissions.py              # Role-based permissions
│
├── 📂 db/                          # Database Layer
│   ├── migrations.py               # Database migrations
│   └── runtime.py                  # Runtime database connection management
│
├── 📂 middleware/                   # Request Middleware (8 files)
│   ├── compression_middleware.py   # Response compression
│   ├── input_sanitization.py      # Input validation/sanitization
│   ├── performance_middleware.py   # Performance monitoring
│   ├── rate_limit_middleware.py   # Rate limiting
│   ├── request_id.py               # Request ID tracking
│   ├── request_size_limit.py       # Request size limits
│   └── security_headers.py        # Security headers
│
├── 📂 services/                     # Business Logic Services (27 files)
│   ├── database_manager.py         # ⭐ Main database manager
│   ├── erp_sync_service.py         # ⭐ ERPNext sync service
│   ├── connection_pool.py          # SQL Server connection pooling
│   ├── dynamic_fields_service.py   # Dynamic field management
│   ├── dynamic_report_service.py   # Dynamic report generation
│   ├── sync_conflicts_service.py   # Sync conflict resolution
│   └── [21 more service files]
│
├── 📂 utils/                        # Utility Functions (12 files)
│   ├── result.py                   # ⭐ Result type (Ok/Fail pattern)
│   ├── db_connection.py            # Database connection utilities
│   └── [10 more utility files]
│
├── 📂 scripts/                      # Utility Scripts (22 files)
│   └── [Various utility scripts]
│
└── 📂 tests/                        # Test Suite (18 files)
    └── [Test files]
```

**Backend Entry Point:** `backend/server.py`

**Startup Flow:**
1. Load configuration from `config.py`
2. Initialize MongoDB connection
3. Initialize SQL Server connection pool
4. Register all API routers
5. Register middleware
6. Start FastAPI server (port 8001)

---

## 📱 Frontend Structure

```
frontend/
│
├── 📄 package.json                 # Dependencies & scripts
├── 📄 app.json                    # ⭐ Expo configuration
├── 📄 tsconfig.json                # TypeScript configuration
│
├── 📂 app/                         # ⭐ Expo Router (File-based routing)
│   ├── _layout.tsx                # Root layout (navigation, auth)
│   ├── index.tsx                   # Home/redirect page
│   ├── login.tsx                  # Login screen
│   ├── register.tsx                # Registration screen
│   │
│   ├── 📂 admin/                   # Admin Panel Screens (8 files)
│   │   ├── control-panel.tsx      # Main control panel
│   │   ├── logs.tsx                # Log viewer
│   │   ├── metrics.tsx             # Metrics dashboard
│   │   ├── permissions.tsx         # Permission management
│   │   ├── reports.tsx              # Reports
│   │   ├── security.tsx             # Security settings
│   │   ├── settings.tsx             # General settings
│   │   └── sql-config.tsx          # SQL configuration
│   │
│   ├── 📂 supervisor/              # Supervisor Screens (15 files)
│   │   ├── dashboard.tsx           # Supervisor dashboard
│   │   ├── sessions.tsx             # Session management
│   │   ├── items.tsx                # Item management
│   │   └── [12 more screens]
│   │
│   └── 📂 staff/                   # Staff Screens (3 files)
│       ├── home.tsx                 # Staff home
│       ├── scan.tsx                 # Barcode scanner
│       └── history.tsx               # Scan history
│
├── 📂 components/                   # Reusable React Components (51 files)
│   ├── [Various UI components]
│   ├── 📂 forms/                   # Form Components
│   ├── 📂 layout/                  # Layout Components
│   ├── 📂 navigation/              # Navigation Components
│   └── 📂 ui/                      # UI Components
│
├── 📂 services/                     # API & Business Logic Services (31 files)
│   ├── api.ts                      # ⭐ Main API client
│   ├── httpClient.ts               # HTTP client (Axios wrapper)
│   ├── queryClient.ts             # React Query client
│   └── [28 more service files]
│
├── 📂 store/                        # State Management (Zustand)
│   ├── authStore.ts                # ⭐ Authentication state
│   ├── networkStore.ts             # Network state
│   └── settingsStore.ts            # Settings state
│
├── 📂 hooks/                        # Custom React Hooks (13 files)
│   └── [Various hooks]
│
├── 📂 utils/                        # Utility Functions (10 files)
│   └── [Various utilities]
│
├── 📂 constants/                    # Constants
│   ├── config.ts                   # App configuration
│   └── flags.ts                    # Feature flags
│
├── 📂 theme/                        # Theming
│   └── [Theme files]
│
└── 📂 assets/                       # Static Assets
    ├── 📂 fonts/
    └── 📂 images/
```

**Frontend Entry Point:** `frontend/app/_layout.tsx`

**Startup Flow:**
1. Initialize Expo Router
2. Load authentication state
3. Setup navigation
4. Initialize stores (Zustand)
5. Apply theme
6. Render initial screen

---

## 🎛️ Admin Panel Structure

```
admin-panel/
│
├── 📄 enhanced-server.py           # ⭐ Enhanced server (recommended)
├── 📄 server.py                    # Basic HTTP server
├── 📄 dashboard.html               # Main dashboard
├── 📄 dashboard.js                 # Dashboard logic
├── 📄 index.html                   # Legacy admin panel
└── 📄 README.md                    # Admin panel docs
```

**Port:** 3000
**URLs:**
- Enhanced Dashboard: `http://localhost:3000/dashboard.html`
- Legacy Panel: `http://localhost:3000/index.html`

---

## 🚀 Entry Points & Startup

### Backend Startup

**Command:**
```bash
cd backend
export PYTHONPATH=..
uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
```

**Or use script:**
```bash
./start.sh
```

**Entry Point:** `backend/server.py`

### Frontend Startup

**Command:**
```bash
cd frontend
npm start
```

**Entry Point:** `frontend/app/_layout.tsx`

### Admin Panel Startup

**Command:**
```bash
cd admin-panel
python3 enhanced-server.py
```

---

## 🔄 Data Flow Architecture

### Authentication Flow

```
User Login (frontend/app/login.tsx)
    ↓
POST /api/v1/auth/login
    ↓
Backend validates (auth/jwt_provider.py)
    ↓
JWT Token issued
    ↓
Token stored in AsyncStorage (store/authStore.ts)
    ↓
All API calls include: Authorization: Bearer <token>
```

### Item Verification Flow

```
Staff scans barcode (frontend/app/staff/scan.tsx)
    ↓
GET /api/v1/items/search?barcode=xxx
    ↓
Backend queries SQL Server (read-only ERPNext)
    ↓
Item data returned
    ↓
Staff verifies quantity
    ↓
POST /api/v1/sessions/{id}/count-lines
    ↓
Data saved to MongoDB
```

---

## 📊 Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Backend API | 8001 | `http://localhost:8001` |
| Frontend (Expo) | 8081 | `http://localhost:8081` |
| Frontend (Web) | 19006 | `http://localhost:19006` |
| Admin Panel | 3000 | `http://localhost:3000` |
| API Docs | 8001 | `http://localhost:8001/docs` |

---

## 🎯 Quick Reference

### Start Everything
```bash
./start.sh
```

### Stop Everything
```bash
./stop.sh
```

### Backend Only
```bash
cd backend
uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Only
```bash
cd frontend
npm start
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-28
