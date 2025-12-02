# 🚀 Quick Start Guide

## ✅ Application Status

Both servers are **starting** in the background:
- ✅ **Backend Server**: Python process running (PID: 17956)
- ✅ **Frontend Server**: Node/Expo processes running (Multiple PIDs)

## 📍 Access Points

Once fully started, you can access:

1. **Backend API**: http://localhost:8001
2. **API Documentation**: http://localhost:8001/api/docs
3. **Frontend Web**: http://localhost:8081 (when using `npx expo start --web`)
4. **Frontend Mobile**: Scan QR code with Expo Go app

## ⏳ Wait for Startup

The servers need **10-30 seconds** to fully start. Watch for:

### Backend (Terminal 1):
```
🚀 Starting application...
OK: SQL Server connection established
OK: Default users initialized
OK: Migrations completed
OK: Change detection sync service started
✅ Starting server on 0.0.0.0:8001
```

### Frontend (Terminal 2):
```
› Metro waiting on exp://192.168.1.41:8081
› Scan the QR code above with Expo Go
```

## 🔐 Login Credentials

### Staff Account:
- **Username**: `staff1`
- **Password**: `staff123`

### Supervisor Account:
- **Username**: `supervisor`
- **Password**: `super123`

## 🔍 Verify Backend is Running

Open a new terminal and run:
```powershell
curl http://localhost:8001/api/health
```

Or in PowerShell:
```powershell
Invoke-WebRequest -Uri "http://localhost:8001/api/health" -UseBasicParsing
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "databases": {
    "mongodb": "connected",
    "sql_server": "connected"
  }
}
```

## 🛠️ Troubleshooting

### If Backend Won't Start:

1. **Check MongoDB is running:**
   ```powershell
   # MongoDB should be running on port 27017
   netstat -an | findstr 27017
   ```

2. **Install dependencies:**
   ```powershell
   cd backend
   pip install -r requirements.txt
   ```

3. **Check for .env file:**
   - Should exist in `backend/.env`
   - See `RUN_APP.md` for required variables

### If Frontend Won't Start:

1. **Install dependencies:**
   ```powershell
   cd frontend
   npm install
   ```

2. **Clear cache:**
   ```powershell
   npx expo start --clear
   ```

## 📱 Next Steps

1. ✅ Wait for servers to fully start (10-30 seconds)
2. ✅ Check backend health: http://localhost:8001/api/health
3. ✅ View API docs: http://localhost:8001/api/docs
4. ✅ Open mobile app: Scan QR code from Expo terminal
5. ✅ Login with default credentials

---

**Note**: The servers are currently starting. Check the terminal windows for startup logs and any error messages.
