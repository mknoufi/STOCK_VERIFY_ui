# 🚀 How to Run the Stock Count Application

## Quick Start

### Option 1: Use the Startup Scripts (Recommended)

#### Windows PowerShell:
```powershell
.\start_servers.ps1
```

#### Windows CMD:
```cmd
start_servers.bat
```

### Option 2: Manual Start

#### 1. Start Backend Server

Open a terminal in the `backend` directory:
```powershell
cd D:\testapp\Stock_count\backend
python server.py
```

The backend will start on **http://localhost:8001**

**Expected Output:**
```
🚀 Starting application...
OK: SQL Server connection established
OK: Default users initialized
OK: Migrations completed
OK: Change detection sync service started
OK: Application startup complete
Starting server on 0.0.0.0:8001
```

#### 2. Start Frontend (Expo)

Open a **new terminal** in the `frontend` directory:
```powershell
cd D:\testapp\Stock_count\frontend
npx expo start
```

**Expected Output:**
```
› Metro waiting on exp://192.168.1.41:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

### Access Points

- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/api/docs
- **Frontend (Web)**: http://localhost:8081 (when running `npx expo start --web`)
- **Frontend (Mobile)**: Scan QR code with Expo Go app

---

## Prerequisites Check

### Backend Dependencies
```powershell
cd backend
python -c "import fastapi, uvicorn, motor, pymongo; print('✅ All dependencies installed')"
```

If missing, install:
```powershell
pip install -r requirements.txt
```

### Frontend Dependencies
```powershell
cd frontend
npm install
```

---

## Configuration

### Backend Environment Variables

Create `backend/.env` file (if not exists):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=stock_verification
SQL_SERVER_HOST=192.168.1.109
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=E_MART_KITCHEN_CARE
SQL_SERVER_USER=stockapp
SQL_SERVER_PASSWORD=StockApp@2025!
# CRITICAL: Generate secure JWT secrets - DO NOT use defaults in production
# JWT_SECRET=<generate-secure-secret-here>
# JWT_REFRESH_SECRET=<generate-secure-refresh-secret-here>
PORT=8001
HOST=0.0.0.0
```

**⚠️ Security Notice:**
- **JWT_SECRET** and **JWT_REFRESH_SECRET** are required and must be set via environment variables
- Generate secure secrets using: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Never commit default or placeholder secrets to version control
- The application will fail to start if these secrets are not properly configured

### Frontend Environment Variables

Create `frontend/.env` file:
```env
# For Web Browser (localhost)
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001

# For Mobile Device (use your PC IP)
# EXPO_PUBLIC_BACKEND_URL=http://192.168.1.41:8001
```

---

## Default Login Credentials

### Staff Account
- **Username**: `staff1`
- **Password**: `staff123`

### Supervisor Account
- **Username**: `supervisor`
- **Password**: `super123`

---

## Troubleshooting

### Backend Won't Start

1. **Check MongoDB is running:**
   ```powershell
   # Check if MongoDB is running on port 27017
   netstat -an | findstr 27017
   ```

2. **Check Python dependencies:**
   ```powershell
   pip install -r backend/requirements.txt
   ```

3. **Check port 8001 is available:**
   ```powershell
   netstat -an | findstr 8001
   ```

4. **Check SQL Server connection:**
   - Verify SQL Server is running
   - Check credentials in `.env`
   - Test connection manually

### Frontend Won't Start

1. **Clear Expo cache:**
   ```powershell
   cd frontend
   npx expo start --clear
   ```

2. **Reinstall dependencies:**
   ```powershell
   cd frontend
   rm -rf node_modules
   npm install
   ```

3. **Check Node.js version:**
   ```powershell
   node --version  # Should be 20+
   ```

### Connection Issues (Mobile)

1. **Ensure same WiFi network**
2. **Check firewall allows port 8001**
3. **Verify backend URL in `.env`:**
   - Use PC's IP address (not localhost)
   - Example: `http://192.168.1.41:8001`

---

## Development Mode

### Backend with Auto-reload
```powershell
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend with Web
```powershell
cd frontend
npx expo start --web
```

### Frontend for Mobile
```powershell
cd frontend
npx expo start
# Scan QR code with Expo Go app
```

---

## Production Mode

### Backend
```powershell
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

### Frontend
Build standalone app:
```powershell
cd frontend
npx expo build:android  # or build:ios
```

---

## Health Check

### Backend Health
```powershell
# Check if backend is running
curl http://localhost:8001/api/health
```

### Expected Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "databases": {
    "mongodb": "connected",
    "sql_server": "connected"
  }
}
```

---

## Stopping the Servers

### Stop Backend
- Press `Ctrl+C` in the backend terminal

### Stop Frontend
- Press `Ctrl+C` in the frontend terminal
- Or press `q` in Expo terminal

---

## Next Steps

1. ✅ Backend running on port 8001
2. ✅ Frontend running (Expo)
3. 🌐 Access API docs: http://localhost:8001/api/docs
4. 📱 Open mobile app: Scan QR code with Expo Go
5. 🔐 Login with default credentials above

---

**Note**: If you encounter any issues, check the logs in the terminal windows for detailed error messages.
