# STOCK_VERIFY Architecture Documentation

**Version:** 1.0
**Last Updated:** 2025-01-12
**Purpose:** Context seed for Cursor AI to understand system architecture

## System Overview

STOCK_VERIFY is a full-stack stock verification application built for ERPNext integration, supporting both mobile (React Native/Expo) and web interfaces.

### Tech Stack

- **Backend:** Python 3.10+, FastAPI, MongoDB, SQL Server (read-only ERPNext connection)
- **Frontend:** React Native 0.81.5, Expo ~54.0, TypeScript 5.9
- **Infrastructure:** Docker, Nginx (reverse proxy), systemd services

## Architecture Layers

### 1. Backend (`/backend`)

```
backend/
├── api/              # FastAPI route handlers
├── auth/             # JWT authentication & permissions
├── db/               # Database connections & migrations
├── middleware/       # Request processing middleware
├── services/         # Business logic services
├── routes/           # Legacy route handlers
└── utils/            # Utility functions
```

**Key Services:**
- `erp_sync_service.py`: ERPNext data synchronization
- `database_manager.py`: Multi-database connection management
- `dynamic_fields_service.py`: Dynamic field configuration
- `dynamic_report_service.py`: Dynamic report generation

**Database Strategy:**
- MongoDB: Primary database for stock verification data
- SQL Server: Read-only connection to ERPNext for item/master data
- Connection pooling via `connection_pool.py`

### 2. Frontend (`/frontend`)

```
frontend/
├── app/              # Expo Router pages (file-based routing)
│   ├── admin/        # Admin panel screens
│   ├── supervisor/   # Supervisor screens
│   └── staff/        # Staff screens
├── components/       # Reusable React components
├── services/         # API client services
├── store/            # Zustand state management
└── hooks/            # Custom React hooks
```

**Key Patterns:**
- File-based routing via Expo Router
- Zustand for global state
- Axios for API calls
- AsyncStorage for local persistence

### 3. Authentication Flow

1. User logs in via `/frontend/app/login.tsx`
2. Backend validates credentials (JWT issued)
3. Frontend stores token in AsyncStorage
4. All API calls include JWT in Authorization header
5. Backend middleware validates JWT via `auth/dependencies.py`

### 4. ERPNext Integration

**Sync Strategy:**
- Pull-based: Backend queries ERPNext SQL Server for item/master data
- Push-based: Stock verification results pushed to ERPNext (future)
- Conflict resolution via `sync_conflicts_service.py`

**Data Flow:**
```
ERPNext SQL Server (read-only)
    ↓
Backend Services (transform/validate)
    ↓
MongoDB (stock verification data)
    ↓
Frontend (display/edit)
```

## Key Design Decisions

### 1. Multi-Database Architecture
- **Why:** ERPNext data stays in SQL Server; verification data in MongoDB for flexibility
- **Trade-off:** Requires sync logic, but enables independent scaling

### 2. Read-Only ERPNext Connection
- **Why:** Prevents accidental data modification in production ERPNext
- **Implementation:** SQL Server connection with read-only user credentials

### 3. Dynamic Fields & Reports
- **Why:** Allows configuration without code changes
- **Implementation:** MongoDB collections for field/report definitions

### 4. Mobile-First Design
- **Why:** Stock verification primarily happens on mobile devices
- **Implementation:** React Native with Expo for cross-platform support

## Security Considerations

1. **JWT Authentication:** All API endpoints require valid JWT
2. **Role-Based Access:** Admin, Supervisor, Staff roles with different permissions
3. **Rate Limiting:** Implemented via `rate_limit_middleware.py`
4. **Input Sanitization:** `input_sanitization.py` middleware
5. **Secrets Management:** Environment variables, never committed

## Performance Optimizations

1. **Connection Pooling:** Reuse database connections
2. **Caching:** `cache_service.py` for frequently accessed data
3. **Batch Operations:** `batch_operations.py` for bulk updates
4. **Compression:** `compression_middleware.py` for API responses

## Testing Strategy

- **Backend:** pytest with coverage reporting
- **Frontend:** Jest (configured but minimal tests currently)
- **Integration:** Manual testing via Expo dev server
- **CI/CD:** GitHub Actions for automated testing

## Deployment

- **Development:** Local with `start_services.ps1`
- **Production:** Docker containers with systemd services
- **Reverse Proxy:** Nginx for routing

## Future Enhancements

1. Real-time sync with ERPNext (WebSocket/SSE)
2. Offline-first mobile app (service workers)
3. Advanced reporting with charts/analytics
4. Barcode scanning optimization
5. Multi-warehouse support

---

**For Cursor AI:** This document provides architectural context. When making changes, consider:
- Database connection patterns (pooling, read-only)
- Authentication flow (JWT validation)
- ERPNext integration boundaries (read-only, sync logic)
- Mobile-first UI patterns (responsive, touch-friendly)
