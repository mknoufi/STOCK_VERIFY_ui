# StockVerify - Quick Start Guide

**Version**: 2.0.0 (Phase 1-3 Complete)  
**Date**: December 11, 2025

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB (running)
- Redis (will be installed)

### Step 1: Install Redis

```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# Windows (WSL)
sudo apt-get install redis-server
```

### Step 2: Start Redis

```bash
redis-server
```

Verify:
```bash
redis-cli ping
# Should return: PONG
```

### Step 3: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 4: Start Backend

```bash
# Option 1: Using the startup script
chmod +x scripts/start_with_redis.sh
./scripts/start_with_redis.sh

# Option 2: Manual start
cd backend
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

### Step 5: Verify Installation

```bash
# Health check
curl http://localhost:8000/api/health

# Should return: {"status": "healthy", ...}
```

### Step 6: Run Integration Tests

```bash
chmod +x scripts/test_integration.sh
./scripts/test_integration.sh
```

---

## 📱 Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will automatically connect to `http://localhost:8000`.

---

## 🎯 Key Features

### 1. Rack Management

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

### 2. Batch Sync

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

### 3. Reporting

```bash
# Preview query
curl -X POST http://localhost:8000/api/reports/query/preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "verification_records",
    "group_by": ["floor"],
    "aggregations": {"verified_qty": "sum"}
  }'

# Create snapshot
curl -X POST http://localhost:8000/api/reports/snapshots \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Report",
    "description": "Daily verification summary",
    "query_spec": {
      "collection": "verification_records",
      "group_by": ["floor"],
      "aggregations": {"verified_qty": "sum"}
    }
  }'
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in backend directory:

```bash
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=stock_verify

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256

# Locks
RACK_LOCK_TTL=60
SESSION_LOCK_TTL=3600
HEARTBEAT_TTL=90
```

---

## 📊 Monitoring

### Redis Monitoring

```bash
# Monitor all commands
redis-cli monitor

# Check memory usage
redis-cli info memory

# List all keys
redis-cli keys '*'

# Check specific lock
redis-cli GET rack:lock:R1
redis-cli TTL rack:lock:R1
```

### MongoDB Monitoring

```javascript
// Connect to MongoDB
mongosh

// Use database
use stock_verify

// Check collections
show collections

// Check indexes
db.verification_records.getIndexes()

// Check document count
db.verification_records.countDocuments()
```

### Application Logs

```bash
# Backend logs
tail -f backend/logs/app.log

# Or if using uvicorn directly
# Logs will be in console
```

---

## 🐛 Troubleshooting

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping

# If not running, start it
redis-server

# Check port
redis-cli -p 6379 ping
```

### MongoDB Connection Failed

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Start MongoDB (macOS)
brew services start mongodb-community

# Start MongoDB (Ubuntu)
sudo systemctl start mongod
```

### Backend Won't Start

```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check for port conflicts
lsof -i :8000
```

### Frontend Connection Issues

```bash
# Check backend URL in frontend/.env
cat frontend/.env

# Should have:
# EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

# Restart frontend
cd frontend
npm start
```

---

## 📚 Documentation

- [Complete Upgrade Summary](./COMPLETE_UPGRADE_SUMMARY.md)
- [Integration Checklist](./INTEGRATION_CHECKLIST.md)
- [Phase 1 Implementation](./UPGRADE_IMPLEMENTATION_LOG.md)
- [Phase 2 Implementation](./PHASE_2_IMPLEMENTATION_LOG.md)
- [Phase 3 Implementation](./PHASE_3_IMPLEMENTATION_LOG.md)
- [Technical Specification](./TECHNICAL_SPECIFICATION.md)

---

## 🎓 Next Steps

1. **Test with Multiple Users**
   - Open multiple browser tabs
   - Try claiming the same rack
   - Verify locking works

2. **Create Reports**
   - Use the reporting API
   - Create snapshots
   - Export to Excel

3. **Monitor Performance**
   - Check Redis memory usage
   - Monitor MongoDB queries
   - Track API response times

4. **Production Deployment**
   - See [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)

---

## 💡 Tips

- **Heartbeat**: Runs every 25 seconds automatically
- **Lock TTL**: Racks lock for 60 seconds, renewed by heartbeat
- **Batch Size**: Default 100 records per batch
- **Retry Logic**: Exponential backoff from 2s to 5min
- **Conflicts**: Stored locally for manual resolution

---

## 🆘 Support

For issues:
1. Check this guide
2. Review [Troubleshooting](#troubleshooting)
3. Check integration tests
4. Review implementation logs

---

**Happy Coding!** 🚀