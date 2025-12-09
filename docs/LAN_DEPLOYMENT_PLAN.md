# 🏢 LAN Deployment Plan - Stock Verify v2.1

**Date**: December 2025  
**Deployment Type**: Local Network (LAN)  
**No Cloud Required** ✅

---

## 📋 Executive Summary

This plan deploys Stock Verify on your **local network** for internal use only. Mobile devices connect via WiFi to the backend server running on a local machine.

**Estimated Setup Time: 2-4 hours**

---

## 🖥️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOCAL NETWORK (LAN)                       │
│                                                                  │
│  ┌──────────────┐     WiFi/LAN      ┌──────────────────────┐   │
│  │ Mobile App   │◄─────────────────►│   Backend Server     │   │
│  │ (Staff)      │    192.168.x.x    │   (Your Mac/PC)      │   │
│  │              │                   │   Port 8001          │   │
│  └──────────────┘                   │                      │   │
│                                     │  ┌────────────────┐  │   │
│  ┌──────────────┐                   │  │   MongoDB      │  │   │
│  │ Mobile App   │◄──────────────────│  │   Port 27017   │  │   │
│  │ (Admin)      │                   │  └────────────────┘  │   │
│  └──────────────┘                   │                      │   │
│                                     │  ┌────────────────┐  │   │
│  ┌──────────────┐                   │  │   SQL Server   │  │   │
│  │ Admin Panel  │◄──────────────────│  │   (ERP - RO)   │  │   │
│  │ (Browser)    │                   │  └────────────────┘  │   │
│  └──────────────┘                   └──────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Pre-Deployment Checklist

### Hardware Requirements
- [ ] **Backend Server**: Mac/PC/Linux (4GB+ RAM, 10GB+ disk)
- [ ] **Network**: WiFi router accessible by all devices
- [ ] **Mobile Devices**: iOS/Android phones with Expo Go or built app

### Software Requirements (Already Installed)
- [x] Python 3.10+
- [x] Node.js 18+
- [x] MongoDB (running on port 27017)
- [x] Git

---

## 🚀 Deployment Steps

### Step 1: Find Your Server's LAN IP Address (5 minutes)

```bash
# On macOS
ipconfig getifaddr en0

# On Linux
ip addr show | grep "inet " | grep -v 127.0.0.1

# On Windows
ipconfig | findstr "IPv4"
```

**Your LAN IP will look like**: `192.168.1.xxx` or `10.0.0.xxx`

📝 **Write it down**: `_______________`

---

### Step 2: Generate Secure JWT Secrets (2 minutes)

```bash
# Run this and save the output
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(64))"
python3 -c "import secrets; print('JWT_REFRESH_SECRET=' + secrets.token_urlsafe(64))"
```

---

### Step 3: Create Production Environment File (5 minutes)

Create file: `backend/.env.production`

```bash
# ============================================
# STOCK VERIFY - LAN PRODUCTION CONFIG
# ============================================

# Server Settings
HOST=0.0.0.0
PORT=8001
DEBUG=false
ENVIRONMENT=production

# JWT Secrets (paste your generated secrets)
JWT_SECRET=<paste_your_64_char_secret_here>
JWT_REFRESH_SECRET=<paste_your_64_char_refresh_secret_here>
JWT_EXPIRY=3600
JWT_REFRESH_EXPIRY=604800

# MongoDB (local)
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=stock_verify

# CORS - Allow your LAN IP and localhost
CORS_ALLOW_ORIGINS=http://localhost:8081,http://localhost:19006,http://192.168.1.XXX:8081,http://192.168.1.XXX:19006,exp://192.168.1.XXX:8081

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# SQL Server (optional - your ERP)
# SQL_SERVER_HOST=your_erp_server
# SQL_SERVER_PORT=1433
# SQL_SERVER_DATABASE=your_erp_db
# SQL_SERVER_USER=readonly_user
# SQL_SERVER_PASSWORD=password
```

**⚠️ Replace `192.168.1.XXX` with your actual LAN IP!**

---

### Step 4: Create Frontend Environment File (5 minutes)

Create file: `frontend/.env.production`

```bash
# Stock Verify Frontend - LAN Config
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.XXX:8001
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:8001/api
```

**⚠️ Replace `192.168.1.XXX` with your server's LAN IP!**

---

### Step 5: Configure Firewall (macOS) (2 minutes)

macOS usually allows incoming connections by default when prompted. If using a firewall:

```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# If enabled, allow Python and Node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/bin/python3
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)
```

---

### Step 6: Start the Backend Server (2 minutes)

```bash
cd "/Users/noufi1/cursor new/STOCK_VERIFY_2-db-maped"

# Option A: Using the existing start script
./start.sh

# Option B: Manual start with production env
cd backend
export PYTHONPATH=..
export $(cat .env.production | xargs)
uvicorn backend.server:app --host 0.0.0.0 --port 8001
```

**Verify it's accessible from LAN:**
```bash
# From another device on the same network, open browser:
http://192.168.1.XXX:8001/api/health
```

---

### Step 7: Configure Mobile App for LAN (5 minutes)

#### Option A: Using Expo Go (Development)

1. Update `frontend/.env`:
   ```bash
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.XXX:8001
   ```

2. Start Expo:
   ```bash
   cd frontend
   npx expo start --lan
   ```

3. Scan QR code with Expo Go app on mobile devices

#### Option B: Build Standalone App (Production)

```bash
cd frontend

# For Android APK
npx expo build:android -t apk

# For iOS (requires Mac + Xcode)
npx expo build:ios -t simulator
# or for device: npx expo build:ios -t archive
```

---

### Step 8: Create Admin User (2 minutes)

```bash
# Using the API (from any terminal)
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "YourSecurePassword123!",
    "role": "admin",
    "full_name": "System Administrator"
  }'
```

---

## 🔧 LAN-Specific Configuration

### Static IP for Server (Recommended)

To prevent IP changes, set a static IP on your server:

**macOS:**
1. System Preferences → Network → WiFi/Ethernet → Advanced
2. TCP/IP → Configure IPv4: Manually
3. Set IP: `192.168.1.100` (or your preferred)
4. Subnet: `255.255.255.0`
5. Router: `192.168.1.1` (your router's IP)

**Or configure in router:**
- Assign static DHCP lease based on MAC address

---

### Router Configuration (Optional)

If devices can't connect:

1. Ensure all devices are on the same subnet (192.168.1.x)
2. Disable AP Isolation on WiFi settings
3. Check if router has client-to-client blocking

---

## 📱 Connecting Mobile Devices

### Requirements
- Devices must be on the **same WiFi network** as the server
- Expo Go app installed (for development)
- Or standalone app installed (for production)

### Connection Test
From mobile browser, visit:
```
http://192.168.1.XXX:8001/api/health
```

Should return:
```json
{"status":"healthy","service":"stock-verify-api",...}
```

---

## 🛡️ LAN Security (Simplified)

Since this is LAN-only, security is simpler:

### ✅ Required
- [x] Strong JWT secrets (Step 2)
- [x] MongoDB authentication (if sensitive data)
- [x] Strong user passwords
- [x] CORS configured for LAN IPs only

### ⚠️ Optional (Recommended)
- [ ] Enable HTTPS with self-signed certificate
- [ ] MongoDB authentication
- [ ] Rate limiting (already enabled)

### ❌ Not Required for LAN
- ~~SSL certificates from Let's Encrypt~~
- ~~Public DNS configuration~~
- ~~Firewall whitelisting public IPs~~
- ~~DDoS protection~~
- ~~CDN~~

---

## 🔄 Auto-Start on Boot (Optional)

### macOS - LaunchAgent

Create `~/Library/LaunchAgents/com.stockverify.backend.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.stockverify.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/zsh</string>
        <string>-c</string>
        <string>cd "/Users/noufi1/cursor new/STOCK_VERIFY_2-db-maped" && ./start.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/stockverify.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/stockverify.error.log</string>
</dict>
</plist>
```

Enable:
```bash
launchctl load ~/Library/LaunchAgents/com.stockverify.backend.plist
```

---

## 📊 Monitoring (Simple)

### Check Server Status
```bash
# Health check
curl http://localhost:8001/api/health

# View logs
tail -f /tmp/stockverify.log
```

### Check MongoDB
```bash
mongosh --eval "db.adminCommand('ping')"
```

---

## 🔧 Troubleshooting

### Mobile Can't Connect to Server

1. **Check IP**: Both on same network?
   ```bash
   # On server
   ipconfig getifaddr en0
   
   # On mobile - Settings → WiFi → IP address
   ```

2. **Check Port**: Is backend running?
   ```bash
   lsof -i :8001
   ```

3. **Check Firewall**: Allow incoming connections
   ```bash
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
   ```

4. **Check CORS**: Is mobile IP in allowed origins?

### Backend Won't Start

1. Check MongoDB is running:
   ```bash
   brew services list | grep mongodb
   # or
   sudo systemctl status mongod
   ```

2. Check port not in use:
   ```bash
   lsof -i :8001
   kill -9 <PID>  # if stuck
   ```

### App Shows Network Error

1. Verify `.env` has correct IP
2. Restart Expo: `npx expo start --clear`
3. Check backend logs for errors

---

## ✅ Deployment Verification Checklist

| Check | Command/Action | Expected |
|-------|---------------|----------|
| Backend running | `curl http://localhost:8001/api/health` | `{"status":"healthy"...}` |
| MongoDB connected | Check health response | `mongodb.status: healthy` |
| LAN accessible | From mobile: `http://192.168.x.x:8001/api/health` | Same response |
| Login works | Try login in app | Success |
| Create session | Admin creates count session | Success |
| Scan item | Staff scans barcode | Item found |

---

## 📝 Quick Reference

| Component | URL/Port |
|-----------|----------|
| Backend API | `http://192.168.1.XXX:8001` |
| API Docs | `http://192.168.1.XXX:8001/api/docs` |
| Health Check | `http://192.168.1.XXX:8001/api/health` |
| MongoDB | `localhost:27017` |
| Expo Dev | `http://192.168.1.XXX:8081` |

---

## 🚀 Go-Live Checklist

- [ ] Server LAN IP noted: `_______________`
- [ ] JWT secrets generated and saved
- [ ] Backend `.env.production` created
- [ ] Frontend `.env.production` created
- [ ] Backend running on `0.0.0.0:8001`
- [ ] MongoDB running
- [ ] Admin user created
- [ ] Mobile devices can access health endpoint
- [ ] Test login from mobile
- [ ] Test full workflow (session → scan → submit)

---

**🎉 You're ready to use Stock Verify on your local network!**
