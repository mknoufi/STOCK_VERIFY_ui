# Repository Setup Guide

This document provides comprehensive instructions for cloning, setting up, and running the Stock Verify application from a fresh repository clone.

## 📋 Prerequisites

Before setting up the repository, ensure you have the following installed:

### Required Software

- **Git** (version 2.20+)
- **Python** (3.10 or higher)
- **Node.js** (18.x or higher) and npm
- **MongoDB** (6.x)
- **SQL Server** (2019 or later) - for ERP data source

### Optional Tools

- **Docker** and **Docker Compose** (for containerized deployment)
- **Git LFS** (if working with large files)

---

## 🚀 Quick Setup (Local Development)

### 1. Clone the Repository

```bash
git clone https://github.com/mknoufi/STOCK_VERIFY_ui.git
cd STOCK_VERIFY_ui
```

### 2. Backend Setup

#### Create Python Virtual Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Copy example configuration
cp .env.example .env
```

Edit `.env` and set the following required variables:

```env
# JWT Secrets (REQUIRED - generate secure random strings)
JWT_SECRET=<your-secure-secret-here>
JWT_REFRESH_SECRET=<your-secure-refresh-secret-here>

# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=stock_verify

# SQL Server Configuration (Read-only ERP source)
SQL_SERVER_HOST=192.168.1.109
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=your_database
SQL_SERVER_USER=your_user
SQL_SERVER_PASSWORD=your_password

# Backend Port
PORT=8001
```

**Security Note:** Never commit `.env` files to version control!

#### Run Backend Server

```bash
# Make sure you're in the backend directory with venv activated
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
```

The backend API will be available at `http://localhost:8001`
API documentation at `http://localhost:8001/docs`

### 3. Frontend Setup

#### Install Node Dependencies

```bash
cd frontend
npm install
```

#### Configure Frontend Environment

Create a `.env` file in the `frontend` directory:

```bash
EXPO_PUBLIC_BACKEND_URL=http://localhost:8001
```

#### Run Frontend (Expo)

```bash
npx expo start
```

The Expo development server will start on port 8081.

---

## 🐳 Docker Setup (Alternative)

For a containerized setup:

### 1. Build and Start Services

```bash
docker-compose up --build
```

This will start:
- Backend API on port 8001
- Frontend on port 3000
- MongoDB (if configured in docker-compose.yml)

### 2. Stop Services

```bash
docker-compose down
```

---

## 🧪 Testing the Setup

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Run Full CI Pipeline

From the repository root:

```bash
make ci
```

This runs linting, type checking, and tests for both backend and frontend.

---

## 📁 Repository Structure

```
STOCK_VERIFY_ui/
├── backend/              # FastAPI backend application
│   ├── server.py        # Main server entry point
│   ├── config.py        # Configuration management
│   ├── requirements.txt # Python dependencies
│   └── tests/           # Backend tests
├── frontend/            # React Native + Expo frontend
│   ├── app/            # Application screens (file-based routing)
│   ├── services/       # API service layer
│   ├── package.json    # Node dependencies
│   └── tests/          # Frontend tests
├── docs/               # Documentation
├── scripts/            # Utility scripts
├── .gitignore         # Git ignore rules
├── docker-compose.yml # Docker configuration
├── Makefile           # Build and test automation
└── README.md          # Quick reference guide
```

---

## ⚙️ Development Workflow

### Using the Convenience Scripts

The repository includes several convenience scripts for macOS/Linux:

```bash
# Start both backend and frontend in separate terminals
./start.sh

# Stop all services
./stop_all_services.sh

# Clean restart of Expo
./restart_expo_clean.sh
```

### Manual Workflow

1. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn backend.server:app --reload
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd frontend
   npx expo start
   ```

---

## 🔧 Common Issues and Solutions

### Virtual Environment Not Found

**Problem:** `venv` directory doesn't exist

**Solution:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Port Already in Use

**Problem:** Backend port 8001 or Frontend port 8081 already in use

**Solution:**
```bash
# Find and kill process on macOS/Linux
lsof -ti :8001 | xargs kill -9
lsof -ti :8081 | xargs kill -9

# Or change the port in .env files
```

### MongoDB Connection Failed

**Problem:** Cannot connect to MongoDB

**Solution:**
1. Ensure MongoDB is running: `mongod --version`
2. Start MongoDB service: `brew services start mongodb-community` (macOS)
3. Verify connection string in `backend/.env`

### Missing Dependencies

**Problem:** Import errors or missing packages

**Solution:**
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

---

## 🔐 Security Best Practices

### Never Commit These Files:

- `.env` files (contain secrets)
- `*.pid` files (runtime process IDs)
- `backend_port.json` (runtime configuration)
- `.coverage` files (test coverage data)
- Virtual environments (`venv/`, `.venv311/`)
- `node_modules/` (Node dependencies)
- Coverage reports (`coverage/`, `htmlcov/`)

All of these are already configured in `.gitignore`.

### Generate Secure Secrets:

```bash
# Generate random JWT secrets
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 📚 Additional Resources

- **API Documentation:** `http://localhost:8001/docs` (when backend is running)
- **Architecture Guide:** [docs/codebase_memory_v2.1.md](docs/codebase_memory_v2.1.md)
- **Cursor Rules:** [docs/STOCK_VERIFY_2.1_cursor_rules.md](docs/STOCK_VERIFY_2.1_cursor_rules.md)
- **Changelog:** [docs/CHANGELOG.md](docs/CHANGELOG.md)

---

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. Check the [README.md](README.md) for quick start instructions
2. Review the troubleshooting section above
3. Check existing GitHub issues
4. Create a new issue with:
   - Your operating system
   - Python and Node.js versions
   - Complete error messages
   - Steps to reproduce

---

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] Backend server starts without errors
- [ ] API docs accessible at `http://localhost:8001/docs`
- [ ] MongoDB connection successful
- [ ] Frontend Expo server starts
- [ ] Backend tests pass (`pytest tests/`)
- [ ] Frontend tests pass (`npm test`)
- [ ] Can access the app on your device/emulator

---

**Last Updated:** December 2025  
**Repository:** https://github.com/mknoufi/STOCK_VERIFY_ui
