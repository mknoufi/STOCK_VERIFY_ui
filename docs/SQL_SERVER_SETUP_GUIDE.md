# SQL Server Connection & Data Sync Guide

## Quick Start (Automated)

**Option 1: Interactive Prompt**
```bash
./scripts/setup_sql_and_sync.sh
```
The script will prompt you for credentials interactively.

**Option 2: Command Line Arguments**
```bash
./scripts/setup_sql_and_sync.sh \
    "192.168.1.100" \
    "1433" \
    "YourDatabase" \
    "readonly_user" \
    "YourPassword"
```

---

## Manual Setup (Step-by-Step)

### Step 1: Prepare SQL Server Credentials

You'll need:
- **Host**: IP address or hostname of SQL Server (e.g., `192.168.1.100` or `erp.company.com`)
- **Port**: Usually `1433` (default SQL Server port)
- **Database**: Name of the ERP database to connect to
- **Username**: Database user with SELECT permissions on ERP tables
- **Password**: Database password

### Step 2: Set Environment Variables

**macOS/Linux:**
```bash
export SQL_SERVER_HOST="192.168.1.100"
export SQL_SERVER_PORT="1433"
export SQL_SERVER_DATABASE="YourDatabase"
export SQL_SERVER_USER="readonly_user"
export SQL_SERVER_PASSWORD="YourPassword"
```

**Windows (PowerShell):**
```powershell
$env:SQL_SERVER_HOST="192.168.1.100"
$env:SQL_SERVER_PORT="1433"
$env:SQL_SERVER_DATABASE="YourDatabase"
$env:SQL_SERVER_USER="readonly_user"
$env:SQL_SERVER_PASSWORD="YourPassword"
```

**Windows (CMD):**
```cmd
set SQL_SERVER_HOST=192.168.1.100
set SQL_SERVER_PORT=1433
set SQL_SERVER_DATABASE=YourDatabase
set SQL_SERVER_USER=readonly_user
set SQL_SERVER_PASSWORD=YourPassword
```

### Step 3: Stop Previous Backend Instance

```bash
pkill -f "uvicorn.*8001"
sleep 2
```

### Step 4: Start Backend with SQL Server Connection

**Option A: With Auto-Reload (Development)**
```bash
cd backend
export PYTHONPATH=..
python3 -m backend.server
```

**Option B: Production Mode**
```bash
cd backend
export PYTHONPATH=..
uvicorn backend.server:app --host 0.0.0.0 --port 8001 --workers 4
```

### Step 5: Verify SQL Server Connection

Check the health endpoint:
```bash
curl http://localhost:8001/health | jq .dependencies.sql_server
```

Expected response if healthy:
```json
{
  "status": "healthy",
  "response_time_ms": 45,
  "last_check": "2024-12-23T20:45:30.123Z"
}
```

### Step 6: Authenticate with API

**Get Admin Token:**
```bash
curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }' | jq .
```

Response:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": "admin",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

**Save the token:**
```bash
TOKEN="eyJhbGc..."  # Use token from response above
```

### Step 7: Trigger Full Data Sync

**Start the sync (may take a few minutes):**
```bash
curl -X POST "http://localhost:8001/api/sync/trigger" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_sync": true}' | jq .
```

Response shows progress:
```json
{
  "success": true,
  "data": {
    "status": "syncing",
    "items_synced": 2543,
    "duration_seconds": 45.23,
    "sync_id": "sync_abc123",
    "timestamp": "2024-12-23T20:45:30Z"
  }
}
```

**Check sync status:**
```bash
curl -X GET "http://localhost:8001/api/sync/status" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Step 8: Verify Data in MongoDB

**Check item count:**
```bash
curl -X GET "http://localhost:8001/api/items/count" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Search for items:**
```bash
curl -X GET "http://localhost:8001/api/items/search/optimized?q=51&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Troubleshooting

### Connection Errors

**Error: "Connection refused"**
- ✓ Verify SQL Server is running
- ✓ Check hostname/IP is correct
- ✓ Verify port (usually 1433)
- ✓ Check firewall isn't blocking port

**Error: "Login failed for user"**
- ✓ Verify username is correct
- ✓ Verify password is correct
- ✓ Check user has database access permissions
- ✓ Verify user has SELECT permissions on required tables

**Error: "Cannot open database"**
- ✓ Verify database name is correct
- ✓ Check database exists on server
- ✓ Verify user can access this database

### Sync Errors

**Sync slow or timing out:**
- Check SQL Server query performance
- Verify network connectivity to SQL Server
- Check MongoDB disk space
- Monitor CPU/memory usage during sync

**Sync fails with "Connection lost":**
- Increase timeout values in `backend/config.py`
- Check network stability
- Verify SQL Server isn't restarting

### Data Verification

**No items showing up:**
```bash
# Check MongoDB directly
cd backend
python3 << 'EOF'
import asyncio
from db.mongodb import get_database

async def check():
    db = await get_database()
    count = await db.items.count_documents({})
    print(f"Total items in MongoDB: {count}")

asyncio.run(check())
EOF
```

**Items present but search not working:**
- Verify search indexes are built in MongoDB
- Check API logs for search errors
- Restart backend server

---

## Performance Optimization

### For Large Datasets (>10,000 items)

1. **Increase batch size** in `backend/config.py`:
   ```python
   SYNC_BATCH_SIZE = 1000  # Default: 500
   ```

2. **Enable parallel sync**:
   ```python
   PARALLEL_SYNC_WORKERS = 4  # Default: 2
   ```

3. **Schedule syncs during off-hours**:
   ```bash
   # Add to crontab for nightly sync at 2 AM
   0 2 * * * cd /app && ./scripts/setup_sql_and_sync.sh
   ```

### Monitoring Sync Progress

**Watch sync in real-time:**
```bash
while true; do
  curl -s http://localhost:8001/api/sync/status \
    -H "Authorization: Bearer $TOKEN" | \
    jq '.data | {status, items_synced, duration: .duration_seconds}'
  sleep 5
done
```

---

## Security Notes

⚠️ **IMPORTANT:**

1. **Never commit credentials** to git:
   ```bash
   # Use environment variables or .env file (in .gitignore)
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Use read-only user** for SQL Server connection:
   ```sql
   -- SQL Server: Create read-only user
   CREATE LOGIN readonly_user WITH PASSWORD = 'YourPassword'
   USE YourDatabase
   CREATE USER readonly_user FOR LOGIN readonly_user
   ALTER ROLE db_datareader ADD MEMBER readonly_user
   ```

3. **Rotate passwords regularly**

4. **Use VPN/SSL** for connections over network

---

## Next Steps

Once data is synced:

### 1. Search for Items
```bash
curl -X GET "http://localhost:8001/api/items/search/optimized?q=513246" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 2. Run Barcode Gap Analysis
```bash
python3 scripts/find_missing_barcodes.py \
  --start 510001 \
  --end 529999 \
  --output barcode_analysis.txt
```

### 3. View Analytics
```bash
curl -X GET "http://localhost:8001/api/analytics/inventory" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 4. Access Web Interface
- Open: http://localhost:19006
- Mobile Expo: Scan QR code in terminal
- Login: admin / admin123

---

## Additional Resources

- [SQL Server Connectivity Guide](https://learn.microsoft.com/en-us/sql/connect/odbc/microsoft-odbc-driver-for-sql-server)
- [pyodbc Documentation](https://github.com/mkleehammer/pyodbc/wiki)
- [Barcode Gap Analysis Tool](../scripts/find_missing_barcodes.py)
- [API Documentation](http://localhost:8001/api/docs)

---

## Getting Help

If you encounter issues:

1. **Check logs:**
   ```bash
   tail -f backend/logs/app.log
   ```

2. **Enable debug mode:**
   ```bash
   export DEBUG=true
   python3 -m backend.server
   ```

3. **Test SQL connection directly:**
   ```bash
   python3 backend/sql_server_connector.py
   ```

4. **Review configuration:**
   ```bash
   cat backend/config.py | grep SQL_SERVER
   ```
