# Quickstart Guide - Stock Verify System Modernization

This guide helps developers quickly set up and work with the enhanced Stock Verify system.

## Prerequisites

- **Python 3.9+** (backend)
- **Node.js 18+** and npm (frontend)
- **MongoDB 5.0+** (local or Atlas)
- **SQL Server** (read-only ERP connection, optional for local dev)
- **Redis** (optional, for caching)

## Quick Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repo-url>
cd STOCK_VERIFY_2-db-maped

# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### 2. Environment Configuration

**Backend** (`backend/.env`):
```env
# Required
JWT_SECRET=your-secure-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
MONGODB_URL=mongodb://localhost:27017/stockverify

# Optional
SQL_SERVER_HOST=localhost
SQL_SERVER_PORT=1433
SQL_SERVER_DB=erp_database
REDIS_URL=redis://localhost:6379
CORS_ALLOW_ORIGINS=http://localhost:8081,exp://localhost:8081
```

**Frontend** (`frontend/.env`):
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

### 3. Start Development Servers

```bash
# Option 1: Use start script (macOS)
./start.sh

# Option 2: Manual start
# Terminal 1 - Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend
npm start
```

### 4. Verify Setup

- **API Docs**: http://localhost:8001/api/docs
- **Expo Dev Tools**: http://localhost:8081
- **Health Check**: `curl http://localhost:8001/api/health`

---

## New Features Overview

### Real-Time Updates (WebSocket)

```python
# Backend - WebSocket endpoint (supervisors only)
from fastapi import WebSocket
from backend.services.realtime import connection_manager

@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await verify_token(token)
    if user.role not in ["supervisor", "admin"]:
        await websocket.close(code=4003)
        return
    
    await connection_manager.connect(websocket, user)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client messages (heartbeat, subscribe)
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
```

```typescript
// Frontend - React Native WebSocket client
import { useWebSocket } from '@/hooks/useWebSocket';

function SupervisorDashboard() {
  const { connected, events } = useWebSocket({
    url: `${API_URL}/ws/updates`,
    token: authToken,
    eventTypes: ['session_update', 'item_update'],
  });
  
  // Events are automatically typed and filtered
}
```

### Offline Sync Queue

```typescript
// Frontend - Using expo-sqlite for offline queue
import { useSyncQueue } from '@/hooks/useSyncQueue';

function CountScreen() {
  const { queueAction, syncStatus, pendingCount } = useSyncQueue();
  
  const handleCount = async (itemCode: string, quantity: number) => {
    // Action queued locally, synced when online
    await queueAction({
      action_type: 'update',
      entity_type: 'count_line',
      entity_id: itemCode,
      payload: { physical_count: quantity },
    });
  };
}
```

### Theme System

```typescript
// Frontend - Zustand theme store
import { useThemeStore } from '@/stores/themeStore';

function App() {
  const { theme, setTheme, colors } = useThemeStore();
  
  // Toggle theme
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  
  // Access colors (auto-switches based on theme)
  return <View style={{ backgroundColor: colors.background }} />;
}
```

### User Preferences

```typescript
// Frontend - Preferences API
import { userApi } from '@/services/api';

// Get preferences
const prefs = await userApi.getPreferences();

// Update preferences
await userApi.updatePreferences({
  theme: 'dark',
  notifications_enabled: true,
  sound_enabled: false,
});
```

### Variance Analytics (Supervisor Dashboard)

```python
# Backend - Analytics endpoint example
@router.get("/variance/summary")
async def get_variance_summary(
    session_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: dict = Depends(get_current_user),
):
    require_role(current_user, ["supervisor", "admin"])
    
    summary = await analytics_service.get_variance_summary(
        session_id=session_id,
        start_date=start_date,
        end_date=end_date,
    )
    return summary
```

---

## Key Patterns

### Authentication

All `/api/*` routes require JWT authentication:

```python
from backend.auth import get_current_user

@router.get("/protected")
async def protected_route(current_user: dict = Depends(get_current_user)):
    return {"user": current_user["username"]}
```

### Role-Based Access

```python
from backend.auth import require_role

@router.get("/admin-only")
async def admin_route(current_user: dict = Depends(get_current_user)):
    require_role(current_user, ["admin"])
    return {"admin": True}
```

### SQL Server Access (Read-Only)

```python
from backend.db_mapping_config import SQL_TEMPLATES
from backend.sql_server_connector import execute_query

# Always use parameterized queries
result = await execute_query(
    SQL_TEMPLATES['get_item_by_barcode'],
    [barcode]  # Parameters
)
```

### MongoDB Operations

```python
from backend.db import get_db

@router.get("/items")
async def get_items():
    db = await get_db()
    items = await db.items.find({}).to_list(100)
    return items
```

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=backend --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v
```

### Frontend Tests

```bash
cd frontend

# Unit tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Full CI Check

```bash
# From repo root
make ci  # Runs lint, typecheck, test
```

---

## Common Tasks

### Add a New API Endpoint

1. Create router in `backend/api/your_module.py`
2. Include in `backend/server.py`:
   ```python
   from backend.api.your_module import router as your_router
   app.include_router(your_router, prefix="/api/your-module")
   ```
3. Add tests in `backend/tests/test_your_module.py`

### Add a New Frontend Screen

1. Create screen in `frontend/app/your-screen.tsx` (file-based routing)
2. Add navigation if needed in `frontend/app/_layout.tsx`
3. Use existing hooks and services from `frontend/src/`

### Add a New MongoDB Collection

1. Define schema in `data-model.md`
2. Create service in `backend/services/`
3. Add indexes in migration script

---

## Troubleshooting

### Backend Won't Start

- Check `JWT_SECRET` and `JWT_REFRESH_SECRET` are set
- Verify MongoDB is running: `mongosh --eval "db.runCommand({ping:1})"`
- Check port 8001 is free: `lsof -i :8001`

### Frontend Connection Issues

- Verify `EXPO_PUBLIC_BACKEND_URL` matches backend
- Check CORS settings include your Expo URL
- For physical device: use your machine's local IP, not localhost

### Sync Queue Not Working

- SQLite database is in `expo-sqlite` managed location
- Check network status with `NetInfo.fetch()`
- Clear queue: Settings > Developer Options > Clear Sync Queue

---

## Resources

- [API Reference](../docs/API_REFERENCE.md)
- [API Contracts](../docs/API_CONTRACTS.md)
- [Architecture Overview](../docs/ARCHITECTURE.md)
- [Dynamic Fields Guide](../docs/DYNAMIC_FIELDS_AND_REPORTS_GUIDE.md)
