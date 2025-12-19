# 🚀 Start Services Guide

**How to run MongoDB, Backend, and Frontend in separate terminals**

---

## 📋 Quick Start

### Terminal 1: MongoDB
```bash
cd /Users/noufi1/STOCK_VERIFY
./scripts/start_mongodb.sh
```

### Terminal 2: Backend
```bash
cd /Users/noufi1/STOCK_VERIFY
./scripts/start_backend.sh
```

### Terminal 3: Frontend
```bash
cd /Users/noufi1/STOCK_VERIFY
./scripts/start_frontend.sh
```

### Terminal 4: Verification
```bash
cd /Users/noufi1/STOCK_VERIFY
./scripts/verify_services.sh
```

---

## 🔧 Detailed Instructions

### 1. Start MongoDB (Terminal 1)

**Option A: Using Script**
```bash
cd /Users/noufi1/STOCK_VERIFY
./scripts/start_mongodb.sh
```

**Option B: Manual Start**
```bash
# Check if MongoDB is installed
which mongod

# Start MongoDB
mongod --dbpath ~/data/db

# Or if installed via Homebrew
brew services start mongodb-community
```

**Expected Output:**
```
🍃 Starting MongoDB...
📍 Found MongoDB at: /usr/local/bin/mongod
🚀 Starting MongoDB...
✅ MongoDB started successfully
   PID: 12345
   Data path: ~/data/db
```

---

### 2. Start Backend (Terminal 2)

```bash
cd /Users/noufi1/STOCK_VERIFY
./scripts/start_backend.sh
```

**Or manually:**
```bash
cd /Users/noufi1/STOCK_VERIFY/backend
python3 server.py
```

**Expected Output:**
```
🚀 Starting Backend Server...
✅ Backend server started on http://localhost:8000
```

**Verify Backend:**
- Open browser: http://localhost:8000/api/health
- Should see: `{"status": "healthy"}`

---

### 3. Start Frontend (Terminal 3)

```bash
cd /Users/noufi1/STOCK_VERIFY
./scripts/start_frontend.sh
```

**Or manually:**
```bash
cd /Users/noufi1/STOCK_VERIFY/frontend
npx expo start --web --clear
```

**Expected Output:**
```
🚀 Starting Frontend...
✅ Expo server started
📱 Scan QR code in Expo Go app
🌐 Web: http://localhost:8081
```

**Access Frontend:**
- Web: http://localhost:8081
- Mobile: Scan QR code with Expo Go app

---

### 4. Verify Services (Terminal 4)

```bash
cd /Users/noufi1/STOCK_VERIFY
./scripts/verify_services.sh
```

**Expected Output:**
```
🔍 Verifying Services Status...

1. MongoDB:
   ✅ Running (PID: 12345)
   ✅ Connected

2. Backend (Python/FastAPI):
   ✅ Running (PID: 12346)
   📍 Port: 8000
   ✅ API Responding
   🌐 URL: http://localhost:8000

3. Frontend (Expo):
   ✅ Running (PID: 12347)
   📍 Metro Port: 19000
   🌐 Web Port: 8081
   🔗 URL: http://localhost:8081

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary:

   MongoDB:  ✅
   Backend:  ✅
   Frontend: ✅

✅ All services are running!
```

---

## 🛑 Stop Services

### Stop All Services
```bash
cd /Users/noufi1/STOCK_VERIFY
./scripts/stop_all.sh
```

### Stop Individual Services

**Stop Backend:**
- Press `Ctrl+C` in Terminal 2
- Or: `pkill -f "python.*server.py"`

**Stop Frontend:**
- Press `Ctrl+C` in Terminal 3
- Or: `pkill -f "expo start"`

**Stop MongoDB:**
- Press `Ctrl+C` in Terminal 1
- Or: `pkill mongod`
- Or: `brew services stop mongodb-community` (if installed via Homebrew)

---

## 🔍 Troubleshooting

### MongoDB Not Starting

**Check if MongoDB is installed:**
```bash
which mongod
mongod --version
```

**Install MongoDB (macOS):**
```bash
brew tap mongodb/brew
brew install mongodb-community
```

**Create data directory:**
```bash
mkdir -p ~/data/db
```

### Backend Not Starting

**Check Python version:**
```bash
python3 --version  # Should be 3.10+
```

**Install dependencies:**
```bash
cd /Users/noufi1/STOCK_VERIFY/backend
pip3 install -r requirements.txt
```

**Check port availability:**
```bash
lsof -i:8000
```

### Frontend Not Starting

**Check Node.js version:**
```bash
node --version  # Should be 20+
```

**Install dependencies:**
```bash
cd /Users/noufi1/STOCK_VERIFY/frontend
npm install
```

**Clear cache:**
```bash
npx expo start --clear
```

---

## 📊 Service URLs

Once all services are running:

- **Backend API:** http://localhost:8000
- **Backend Health:** http://localhost:8000/api/health
- **Frontend Web:** http://localhost:8081
- **MongoDB:** mongodb://localhost:27017

---

## ✅ Verification Checklist

- [ ] MongoDB is running (check Terminal 1)
- [ ] Backend is running (check Terminal 2)
- [ ] Frontend is running (check Terminal 3)
- [ ] Backend API responds: http://localhost:8000/api/health
- [ ] Frontend web loads: http://localhost:8081
- [ ] Verification script shows all services ✅

---

**Last Updated:** 2025-11-06
