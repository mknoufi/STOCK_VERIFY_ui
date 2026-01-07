# StockVerify System Integration Checklist

**Date**: December 11, 2025
**Phases Completed**: Phase 1 & Phase 2

---

## ✅ Phase 1 & 2 Integration Steps

### 1. Backend Server Integration

**File**: `backend/server.py`

#### Step 1.1: Add Imports

```python
# Add to imports section (around line 30-60)
from backend.services.redis_service import init_redis, close_redis, get_redis
from backend.services.lock_manager import get_lock_manager
from backend.services.pubsub_service import get_pubsub_service
from backend.api.sync_batch_api import router as sync_batch_router
from backend.api.rack_api import router as rack_router
from backend.api.session_management_api import router as session_mgmt_router
from backend.db.indexes import create_indexes
```

#### Step 1.2: Update Lifespan

```python
# Replace or update the lifespan function
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting StockVerify backend...")

    try:
        # Initialize Redis
        redis_service = await init_redis()
        logger.info("✓ Redis initialized")

        # Start Pub/Sub
        pubsub_service = get_pubsub_service(redis_service)
        await pubsub_service.start()
        logger.info("✓ Pub/Sub started")

        # Create MongoDB indexes
        index_results = await create_indexes(db)
        total_indexes = sum(index_results.values())
        logger.info(f"✓ MongoDB indexes created: {total_indexes} total")

        # Initialize lock manager
        lock_manager = get_lock_manager(redis_service)
        logger.info("✓ Lock manager initialized")

    except Exception as e:
        logger.error(f"❌ Startup failed: {str(e)}")
        raise

    yield

    # Shutdown
    logger.info("🛑 Shutting down StockVerify backend...")
    try:
        if pubsub_service:
            await pubsub_service.stop()
            logger.info("✓ Pub/Sub stopped")

        await close_redis()
        logger.info("✓ Redis closed")

    except Exception as e:
        logger.error(f"❌ Shutdown error: {str(e)}")

app = FastAPI(lifespan=lifespan, ...)
```

#### Step 1.3: Register Routers

```python
# Add after existing router registrations (around line 900-920)
app.include_router(sync_batch_router)  # Batch sync API
app.include_router(rack_router)  # Rack management
app.include_router(session_mgmt_router)  # Session management
```

---

### 2. Environment Configuration

**File**: `.env` or production environment

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Lock Settings
RACK_LOCK_TTL=60
SESSION_LOCK_TTL=3600
HEARTBEAT_TTL=90

# Sync Settings
SYNC_BATCH_SIZE=100
SYNC_MAX_RETRIES=5

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=30
```

---

### 3. Install Dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt

# If Redis not installed
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# Start Redis
redis-server
```

---

### 4. Database Setup

```bash
# Run MongoDB index creation
python -c "
import asyncio
from backend.server import db
from backend.db.indexes import create_indexes

async def setup():
    results = await create_indexes(db)
    print('Indexes created:', results)

asyncio.run(setup())
"
```

---

### 5. Frontend Integration

#### Step 5.1: Update API Client

**File**: `frontend/src/services/api/api.ts`

```typescript
// Add new imports
import { syncManager } from '../sync/enhancedSyncManager';
import { heartbeatService } from '../session/heartbeatService';

// Export for use in components
export { syncManager, heartbeatService };

// Add rack management functions
export const rackApi = {
  getAvailable: async (floor?: string) => {
    const params = floor ? { floor } : {};
    const response = await api.get('/api/racks/available', { params });
    return response.data;
  },

  claim: async (rackId: string, floor: string) => {
    const response = await api.post(`/api/racks/${rackId}/claim`, { floor });
    return response.data;
  },

  release: async (rackId: string) => {
    const response = await api.post(`/api/racks/${rackId}/release`);
    return response.data;
  },

  pause: async (rackId: string) => {
    const response = await api.post(`/api/racks/${rackId}/pause`);
    return response.data;
  },

  resume: async (rackId: string) => {
    const response = await api.post(`/api/racks/${rackId}/resume`);
    return response.data;
  },
};
```

#### Step 5.2: Create Index Exports

**File**: `frontend/src/services/index.ts`

```typescript
export * from './sync/enhancedSyncManager';
export * from './session/heartbeatService';
```

---

### 6. Testing

#### 6.1: Backend Health Check

```bash
# Check Redis
redis-cli ping
# Expected: PONG

# Check backend
curl http://localhost:8000/api/health
# Expected: {"status": "healthy"}

# Check indexes
curl http://localhost:8000/api/admin/database/indexes
```

#### 6.2: Test Rack Claiming

```bash
# Get available racks
curl http://localhost:8000/api/racks/available \
  -H "Authorization: Bearer YOUR_TOKEN"

# Claim a rack
curl -X POST http://localhost:8000/api/racks/R1/claim \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"floor": "Ground"}'
```

#### 6.3: Test Batch Sync

```bash
curl -X POST http://localhost:8000/api/sync/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [{
      "client_record_id": "test_001",
      "session_id": "session_001",
      "item_code": "ITEM001",
      "verified_qty": 10,
      "damage_qty": 0,
      "serial_numbers": [],
      "status": "finalized",
      "created_at": "2025-12-11T10:00:00Z",
      "updated_at": "2025-12-11T10:00:00Z"
    }]
  }'
```

---

### 7. Monitoring

#### 7.1: Redis Monitoring

```bash
# Monitor Redis commands
redis-cli monitor

# Check memory usage
redis-cli info memory

# List all keys
redis-cli keys '*'
```

#### 7.2: MongoDB Monitoring

```javascript
// Check index usage
db.verification_records.aggregate([
  { $indexStats: {} }
])

// Check collection stats
db.verification_records.stats()
```

---

## 🎯 Verification Checklist

- [ ] Redis is running and accessible
- [ ] MongoDB indexes are created
- [ ] Backend server starts without errors
- [ ] Pub/Sub service is active
- [ ] Lock manager is initialized
- [ ] All API endpoints are registered
- [ ] Frontend can connect to backend
- [ ] Rack claiming works
- [ ] Heartbeat service works
- [ ] Batch sync works
- [ ] Conflicts are detected
- [ ] Retries work with exponential backoff

---

## 🐛 Troubleshooting

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping

# If not running, start it
redis-server

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

### Lock Not Released

```bash
# Manually delete lock in Redis
redis-cli DEL rack:lock:R1

# Or flush all locks (CAUTION!)
redis-cli KEYS "rack:lock:*" | xargs redis-cli DEL
```

### Indexes Not Created

```python
# Manually create indexes
from backend.db.indexes import create_indexes
from backend.server import db
import asyncio

asyncio.run(create_indexes(db))
```

### Heartbeat Failing

```typescript
// Check heartbeat status
console.log('Heartbeat running:', heartbeatService.isRunning());
console.log('Missed beats:', heartbeatService.getMissedHeartbeats());

// Restart heartbeat
heartbeatService.stop();
heartbeatService.start(sessionId);
```

---

## 📚 Additional Resources

- [Phase 1 Implementation Log](./UPGRADE_IMPLEMENTATION_LOG.md)
- [Phase 2 Implementation Log](./PHASE_2_IMPLEMENTATION_LOG.md)
- [Technical Specification](./TECHNICAL_SPECIFICATION.md)
- [API Documentation](./API_CONTRACTS.md)

---

**Last Updated**: December 11, 2025
**Status**: Ready for Integration ✅
