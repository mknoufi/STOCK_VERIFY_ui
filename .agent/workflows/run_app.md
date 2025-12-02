---
description: How to run the Stock Verification App (Backend + Frontend + Admin)
---

# Run the App

This workflow describes how to start the entire application stack: Backend (FastAPI), Frontend (Expo), and Admin Panel.

## Prerequisites

- **Node.js**: Version 20+
- **Python**: Version 3.11+
- **MongoDB**: Must be running on port 27017
- **SQL Server**: (Optional) For ERP sync

## Startup Script

The easiest way to run the app is using the `start_all_complete.sh` script, which handles dependencies, environment setup, and starting all services.

```bash
# Make sure the script is executable
chmod +x start_all_complete.sh

# Run the script
./start_all_complete.sh
```

## Manual Startup

If you prefer to start services individually:

### 1. Start Backend

```bash
cd backend
# Activate virtual environment if needed
source ../.venv/bin/activate
# Run server (defaults to port 8001)
python -m backend.server
```

**Health Check**: `http://localhost:8001/health/`

### 2. Start Frontend (Expo)

```bash
cd frontend
npx expo start --clear
```

**Access**:
- Web: `http://localhost:8081`
- Mobile: Scan QR code with Expo Go

### 3. Start Admin Panel

```bash
cd admin-panel
python enhanced-server.py
```

**Access**: `http://localhost:3000/dashboard.html`

## Troubleshooting

- **Port Conflicts**: Ensure ports 8001, 8081, and 3000 are free.
- **MongoDB**: Ensure MongoDB is running (`brew services start mongodb-community`).
- **Dependencies**: Run `pip install -r requirements.production.txt` in root or `backend`.
