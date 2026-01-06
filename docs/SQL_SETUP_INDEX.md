# SQL Server Setup - Documentation Index

## 📋 Quick Navigation

### 🚀 Getting Started (Choose One)

**Option 1: Fastest - Automated Setup** (⏱️ 5 minutes)
- File: `scripts/setup_sql_and_sync.sh`
- Command: `./scripts/setup_sql_and_sync.sh`
- Includes: Connection testing, sync verification, error handling
- Best for: Most users

**Option 2: Complete Manual** (⏱️ 30 minutes)
- File: `SQL_SERVER_SETUP_GUIDE.md`
- Includes: Step-by-step guide, troubleshooting, optimization
- Best for: Understanding each step, debugging issues

**Option 3: Quick Reference** (⏱️ 2 minutes)
- File: `SQL_SETUP_QUICK_REFERENCE.txt`
- Format: Quick lookup card
- Best for: Refreshing memory, common commands

---

## 📁 Files in This Session

### Setup Tools
| File | Size | Purpose | Time |
|------|------|---------|------|
| `scripts/setup_sql_and_sync.sh` | 8.8 KB | Automated setup & sync | 2-15 min |
| `SQL_SERVER_SETUP_GUIDE.md` | 7.6 KB | Complete manual | 30+ min |
| `SQL_SETUP_QUICK_REFERENCE.txt` | 4.2 KB | Quick lookup | 2 min |
| `.env.sql_server.example` | 758 B | Env template | N/A |

### Supporting Tools (Created Earlier)
| File | Size | Purpose |
|------|------|---------|
| `scripts/find_missing_barcodes.py` | 400+ lines | Barcode gap analysis |
| `docs/API_CONTRACTS.md` | 450+ lines | API documentation |

---

## 🎯 What You Need

### SQL Server Information (from your DBA/Admin)
```
Host/IP Address:        [required]
Port:                   [usually 1433]
Database Name:          [required]
Username:               [usually readonly_user]
Password:               [required]
```

### Network Requirements
- Network access to SQL Server port (usually 1433)
- pyodbc installed: `pip install pyodbc`
- ODBC Driver 17 for SQL Server

---

## ⚡ The Setup Process

### Automated (Recommended)
```bash
# Step 1: Gather credentials from your SQL Server admin
# Step 2: Run setup script
./scripts/setup_sql_and_sync.sh "host" "1433" "database" "user" "password"

# Done! Script handles:
# ✓ Connection testing
# ✓ Environment setup
# ✓ Backend startup
# ✓ Data synchronization
# ✓ Verification
```

### Manual (if needed)
```bash
# Step 1: Create environment file
cp .env.sql_server.example .env

# Step 2: Edit with your credentials
nano .env

# Step 3: Load and use
source .env
cd backend && python3 -m backend.server

# Step 4-7: Follow SQL_SERVER_SETUP_GUIDE.md
```

---

## 📊 After Setup

### Verify Connection
```bash
curl http://localhost:8001/health | jq .dependencies.sql_server
# Should show: "status": "healthy"
```

### Search for Items
```bash
# Get auth token first
TOKEN=$(curl -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | jq -r '.data.access_token')

# Search for barcode 513246
curl -X GET "http://localhost:8001/api/items/search/optimized?q=513246" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Run Barcode Analysis
```bash
python3 scripts/find_missing_barcodes.py --start 510001 --end 529999
```

### Access Web App
- Web: http://localhost:19006
- Mobile: Scan QR code in Expo terminal
- Login: admin / admin123

---

## 🆘 Troubleshooting

### Common Issues

**"Connection refused"**
- SQL Server not running or wrong host/port
- Check with: `telnet host 1433`

**"Login failed"**
- Wrong username or password
- Ask admin to reset credentials

**"Cannot open database"**
- Database doesn't exist or wrong name
- Wrong user permissions (needs SELECT)

**"Sync timeout"**
- Large database takes longer
- Check logs: `tail -f backend/logs/app.log`

**"No items found"**
- Database empty or sync incomplete
- Check status: `curl http://localhost:8001/health`

### Getting Help

1. Check error message in terminal output
2. See SQL_SERVER_SETUP_GUIDE.md troubleshooting section
3. Review logs: `backend/logs/app.log`
4. Test connection directly with SQL tools

---

## 📚 Documentation Files

### Setup Guides
- **SQL_SERVER_SETUP_GUIDE.md** - Complete reference (40+ steps)
  - Quick start section
  - Step-by-step manual process
  - Detailed troubleshooting
  - Performance optimization
  - Security best practices

- **SQL_SETUP_QUICK_REFERENCE.txt** - Quick lookup
  - TL;DR sections
  - Common commands
  - Quick troubleshooting

### API Documentation
- **docs/API_CONTRACTS.md** - API reference
- **http://localhost:8001/api/docs** - Interactive Swagger UI

### Barcode Tools
- **scripts/find_missing_barcodes.py** - Gap analysis tool
  - Usage: `python3 scripts/find_missing_barcodes.py --help`

---

## 📝 Environment Variables

All 5 required variables:

```bash
export SQL_SERVER_HOST="192.168.1.100"      # Required
export SQL_SERVER_PORT="1433"               # Default: 1433
export SQL_SERVER_DATABASE="YourDB"         # Required
export SQL_SERVER_USER="readonly_user"      # Default: readonly_user
export SQL_SERVER_PASSWORD="YourPassword"   # Required
```

---

## ✅ Success Indicators

After successful setup, you should see:

1. ✅ Backend health: SQL Server status = "healthy"
2. ✅ Items visible: Search returns results
3. ✅ Barcode analysis: Tool runs without errors
4. ✅ Web app: Fully functional at http://localhost:19006
5. ✅ Logs: No error messages in `backend/logs/app.log`

---

## 🔗 Related Resources

### Backend
- Location: `backend/server.py`
- Configuration: `backend/config.py`
- Connector: `backend/sql_server_connector.py`

### Frontend
- Location: `frontend/`
- Dev: http://localhost:19006
- Expo: Check terminal for QR code

### Database
- MongoDB: Connected (primary data store)
- SQL Server: Not connected yet (ERP source)

---

## 📞 Support Resources

### Logs
```bash
# Backend logs
tail -f backend/logs/app.log

# Debug mode
export DEBUG=true
python3 -m backend.server
```

### Health Checks
```bash
# Full system health
curl http://localhost:8001/health | jq .

# Just SQL Server status
curl http://localhost:8001/health | jq .dependencies.sql_server
```

### Test Endpoints
```bash
# API Swagger UI
http://localhost:8001/api/docs

# API Redoc
http://localhost:8001/api/redoc
```

---

## 🎯 Next Steps

1. **Get credentials** from SQL Server admin
2. **Choose method**: Automated or Manual
3. **Run setup**: Execute script or follow guide
4. **Verify**: Check health and test endpoints
5. **Analyze**: Run barcode gap analysis
6. **Deploy**: Use with confidence

---

**Created**: 2024-12-23  
**Status**: ✅ Ready for setup
**Version**: 1.0
