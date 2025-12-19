# STOCK_VERIFY_2 - Corrected Architecture Documentation

## 📋 System Overview

**Project Type:** Stock Verification System
**Architecture Pattern:** Microservices with Mobile Frontend
**Data Flow:** One-Way (SQL Server → MongoDB)

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE FRONTEND                          │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   React Native + Expo Router + TypeScript            │  │
│  │   - NativeWind (Tailwind CSS)                         │  │
│  │   - Context API for state                            │  │
│  │   - Expo SecureStore for auth                        │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API
                            │ (HTTP/JSON)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     PYTHON BACKEND                           │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   FastAPI / Flask                                     │  │
│  │   - RESTful API endpoints                            │  │
│  │   - Business logic                                   │  │
│  │   - Data transformation                              │  │
│  │   - Authentication & Authorization                   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────┬─────────────────────────────┬───────────────────┘
            │                             │
            │ READ ONLY                   │ READ/WRITE
            │ (Fetch Data)                │ (All Operations)
            ↓                             ↓
┌───────────────────────┐     ┌───────────────────────────────┐
│   SQL SERVER          │     │      MONGODB                   │
│   (Source DB)         │     │   (Working DB)                 │
│                       │     │                                │
│  - READ ONLY          │────→│  - Primary database           │
│  - Data source        │     │  - Store fetched data         │
│  - No write-back      │     │  - Process & modify           │
│  - Legacy system      │     │  - All changes here           │
└───────────────────────┘     │  - NO export back             │
                              └───────────────────────────────┘
```

---

## 🔄 Data Flow

### **One-Way Data Flow (Critical!)**

```
1. FETCH → SQL Server (READ ONLY)
   ↓
2. TRANSFORM → Python Backend
   ↓
3. STORE → MongoDB
   ↓
4. PROCESS → MongoDB (All changes)
   ↓
5. SERVE → REST API → Mobile App
   ↓
6. STAYS IN → MongoDB (NO export back!)
```

---

## 🗄️ Database Roles

### **SQL Server (Source Database)**
**Role:** READ-ONLY data source
**Purpose:** Fetch existing data/records
**Operations:**
- ✅ SELECT queries only
- ✅ Read historical data
- ✅ Fetch reference data
- ❌ NO INSERT
- ❌ NO UPDATE
- ❌ NO DELETE
- ❌ NO write-back

**Connection Type:**
```python
# Read-only connection string
SQL_SERVER_CONN = "mssql+pyodbc://user:pass@server/db?ReadOnly=true"
```

### **MongoDB (Working Database)**
**Role:** PRIMARY working database
**Purpose:** Store, process, and manage all data
**Operations:**
- ✅ INSERT (store fetched data)
- ✅ UPDATE (modify records)
- ✅ DELETE (remove records)
- ✅ AGGREGATE (analytics)
- ✅ All CRUD operations
- ✅ Transaction support

**Collections (Examples):**
```javascript
// Stock items fetched from SQL Server
db.stock_items.insert({
  item_code: "ITEM001",
  description: "...",
  quantity: 100,
  source: "sql_server",
  fetched_at: ISODate(),
  status: "pending_verification"
})

// Stock verification records
db.stock_verifications.insert({
  item_code: "ITEM001",
  verified_quantity: 98,
  verified_by: "user123",
  verified_at: ISODate(),
  discrepancy: -2,
  notes: "2 items damaged"
})

// Audit trail
db.audit_logs.insert({
  action: "quantity_updated",
  collection: "stock_items",
  document_id: ObjectId("..."),
  old_value: 100,
  new_value: 98,
  changed_by: "user123",
  changed_at: ISODate()
})
```

---

## 🔌 API Architecture

### **Backend (Python)**

**Framework:** FastAPI (recommended) or Flask

**Project Structure:**
```
backend/
├── api/
│   ├── __init__.py
│   ├── stock.py          # Stock-related endpoints
│   ├── verification.py   # Verification endpoints
│   └── auth.py          # Authentication
├── services/
│   ├── sql_server.py    # SQL Server data fetching
│   ├── mongodb.py       # MongoDB operations
│   └── transform.py     # Data transformation
├── models/
│   ├── stock.py         # Pydantic models
│   └── user.py
├── db/
│   ├── sql_server_connector.py
│   └── mongodb_connector.py
├── utils/
│   ├── logger.py
│   └── validators.py
├── middleware/
│   ├── auth.py
│   └── logging.py
└── tests/
    ├── test_stock.py
    └── test_verification.py
```

**Example Endpoints:**
```python
# Fetch from SQL Server and store in MongoDB
POST   /api/v1/stock/sync
GET    /api/v1/stock/items
GET    /api/v1/stock/items/{item_id}

# Verification operations (MongoDB only)
POST   /api/v1/verification/create
PUT    /api/v1/verification/{id}
GET    /api/v1/verification/history

# Analytics (MongoDB aggregations)
GET    /api/v1/analytics/discrepancies
GET    /api/v1/analytics/summary
```

---

## 📱 Frontend Architecture

### **React Native + Expo**

**Project Structure:**
```
frontend/
├── app/
│   ├── _layout.tsx           # Root layout
│   ├── index.tsx             # Home
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Tab layout
│   │   ├── home.tsx
│   │   ├── scan.tsx
│   │   └── history.tsx
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── verification/
│       └── [id].tsx          # Dynamic route
├── src/
│   ├── components/
│   │   ├── StockItem.tsx
│   │   ├── Scanner.tsx
│   │   └── VerificationForm.tsx
│   ├── hooks/
│   │   ├── useStock.ts
│   │   └── useAuth.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── storage.ts
│   ├── types/
│   │   ├── stock.ts
│   │   └── verification.ts
│   └── utils/
│       ├── format.ts
│       └── validators.ts
└── assets/
    ├── images/
    └── fonts/
```

---

## 🔐 Security Architecture

### **Authentication Flow**

```
1. User Login → Backend validates
   ↓
2. Generate JWT token
   ↓
3. Store in Expo SecureStore (encrypted)
   ↓
4. Include in all API requests (Authorization header)
   ↓
5. Backend validates JWT on each request
```

### **Data Security**

**SQL Server:**
- Read-only connection (no write risk)
- Parameterized queries only
- Connection string in environment variables
- No sensitive data in logs

**MongoDB:**
- User authentication enabled
- Role-based access control
- Encrypted connections (TLS/SSL)
- Audit logging enabled
- Regular backups

**Mobile App:**
- Expo SecureStore for tokens
- No hardcoded secrets
- API keys in environment config
- Biometric authentication (optional)

---

## 🚀 Deployment Architecture

### **Backend Deployment**

**Options:**
- Docker containers (recommended)
- Kubernetes for scaling
- AWS/Azure/GCP cloud hosting

**Requirements:**
- Python 3.11+
- SQL Server ODBC driver
- MongoDB connection
- Environment variables configured

### **Mobile App Deployment**

**Development:**
- Expo Go for testing
- EAS Build for production builds

**Production:**
- iOS: App Store
- Android: Google Play Store
- OTA Updates via Expo

---

## 📊 Performance Considerations

### **Caching Strategy**

```python
# Cache SQL Server queries (Redis)
@cache.memoize(timeout=300)  # 5 minutes
def fetch_stock_items_from_sql():
    # Expensive SQL Server query
    return query_results

# MongoDB indexes for fast queries
db.stock_items.createIndex({ "item_code": 1 })
db.stock_items.createIndex({ "status": 1, "updated_at": -1 })
```

### **Data Sync Strategy**

```python
# Incremental sync (not full refresh)
def sync_stock_items(last_sync_time=None):
    if last_sync_time:
        # Fetch only changed items since last sync
        query = f"SELECT * FROM Items WHERE UpdatedAt > '{last_sync_time}'"
    else:
        # Initial full sync
        query = "SELECT * FROM Items"

    # Fetch from SQL Server
    items = fetch_from_sql_server(query)

    # Upsert to MongoDB
    for item in items:
        mongodb.stock_items.update_one(
            {"item_code": item["item_code"]},
            {"$set": item},
            upsert=True
        )
```

---

## 🧪 Testing Strategy

### **Backend Tests**

```python
# Test SQL Server connection (READ ONLY)
def test_sql_server_readonly():
    with pytest.raises(Exception):
        # Should fail - no write permissions
        execute_sql("INSERT INTO Items ...")

# Test MongoDB operations
def test_mongodb_crud():
    # Should succeed - full permissions
    result = mongodb.stock_items.insert_one({...})
    assert result.inserted_id

# Test data flow
def test_sync_flow():
    # Fetch from SQL Server
    sql_data = fetch_from_sql_server()

    # Store in MongoDB
    mongo_result = store_in_mongodb(sql_data)

    # Verify stored correctly
    assert mongo_result.modified_count > 0
```

---

## 🔍 Monitoring & Logging

### **Key Metrics to Monitor**

1. **SQL Server:**
   - Connection pool status
   - Query execution time
   - Failed fetch attempts
   - Connection timeouts

2. **MongoDB:**
   - Write operations/sec
   - Read operations/sec
   - Index usage
   - Collection sizes

3. **API:**
   - Response times
   - Error rates
   - Request counts
   - Authentication failures

4. **Mobile App:**
   - Crash rate
   - API call success rate
   - Offline mode usage
   - User engagement

---

## 📝 Summary

### **Key Points:**

✅ **SQL Server** = READ ONLY source
✅ **MongoDB** = PRIMARY working database
✅ **Data flows ONE WAY** (SQL → MongoDB)
✅ **NO write-back** to SQL Server
✅ **NO ERPNext/Frappe** integration
✅ **Python backend** (FastAPI/Flask)
✅ **React Native frontend** (Expo Router)
✅ **All changes stored in MongoDB**

### **Don't Do:**
❌ Write back to SQL Server
❌ Export to ERPNext
❌ Use Frappe framework
❌ Bidirectional sync

### **Do:**
✅ Fetch from SQL Server (read-only)
✅ Process in MongoDB
✅ Store changes in MongoDB
✅ Use MongoDB for all CRUD operations
✅ Cache SQL Server queries
✅ Implement proper error handling

---

**Last Updated:** 2025-11-28
**Project:** STOCK_VERIFY_2-db-maped
**Architecture:** Corrected and Verified ✅
