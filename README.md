# Stock Verify Application (v2.1)

> **✨ This repository is available as a GitHub template!**
> Click "Use this template" to create your own Stock Verify instance. See [docs/STARTUP_GUIDE.md](docs/STARTUP_GUIDE.md) for setup instructions.

---

## 🎵 **NEW VIBE CODER? [START HERE!](docs/START_HERE.md)** 👈

**Complete Vibe Coding Guides:**

* **[📍 START HERE](docs/START_HERE.md)** ← Your personalized roadmap and next steps!
* **[⚡ Quick Start: Vibe Coding Today](docs/QUICK_START.md)** - Get coding in 2 hours
* **[🎯 Vibe Coding Next Steps Guide](docs/VIBE_CODING_WORKFLOW.md)** - 30-day learning path
* **[🗺️ Visual Roadmap](docs/FEATURE_ROADMAP.md)** - See the big picture
* **[🛠️ Vibe Coding Setup](docs/STUDY_GUIDE_AGENTS_AND_VSCODE.md)** - AI tools configuration

---

## 📚 Documentation (v2.1)

### Core Documentation

* **[Codebase Memory](docs/codebase_memory_v2.1.md)**: Architecture, Tech Stack, and Data Models.
* **[Cursor Rules](docs/STOCK_VERIFY_2.1_cursor_rules.md)**: AI behavior and coding standards.
* **[Verified Coding Policy](docs/verified_coding_policy.md)**: Testing and verification requirements.
* **[Changelog](docs/CHANGELOG.md)**: Version history.

### Production & Deployment

* **[Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT_GUIDE.md)**: Complete deployment instructions for production.
* **[Production Readiness Checklist](docs/PRODUCTION_READINESS_CHECKLIST.md)**: Step-by-step verification before going live.
* **[Feature Roadmap](docs/FEATURE_ROADMAP.md)**: Planned features and upgrade recommendations.

---

## 🚀 Quick Start

### For New Deployments (Using Template)

1. See **[docs/STARTUP_GUIDE.md](docs/STARTUP_GUIDE.md)** for complete setup guide
2. Run `./init-new-instance.sh` to initialize your instance

### For Development

#### One-Click Startup (Recommended)

```bash
make start
```

This starts Backend, Frontend, and Database services, automatically configuring the network.

#### Individual Services

* **Backend**: `make backend` (Port 8001)
* **Frontend**: `make frontend` (Port 8081 - LAN Mode)
* **Fix Expo**: `make fix-expo` (Tunnel Mode for connection issues)
* **Stop All**: `make stop`

### Network Configuration (Dynamic IP)

The system now automatically detects your IP address to allow mobile devices to connect:

1. **Backend** detects its LAN IP on startup and writes to `backend_port.json`.
2. **Frontend** reads this file to configure the API client.
3. **Docker/CI**: Set `EXPO_PUBLIC_BACKEND_URL` to override this behavior.

## 📊 Code Quality & Security

### Quality Metrics

* **Type Safety**: 47 mypy errors (39% reduction from 77)
* **Test Coverage**: 81.99% (501 tests passing)
* **Frontend**: Zero TypeScript errors ✅
* **Security**: Application code has zero HIGH/CRITICAL issues ✅

### Security Status

**Application Security: EXCELLENT** ✅
* Bandit scan: Zero HIGH/CRITICAL issues in application code
* All 119 HIGH findings are in dependencies (crypto libraries using SHA1 for non-password purposes)
* Parameterized SQL queries, proper authentication, secure session handling

**Dependency Security: NEEDS ATTENTION** ⚠️
* 35 known vulnerabilities in 14 packages identified via pip-audit
* Priority updates: aiohttp, urllib3, langchain*, python-jose, starlette
* See [backend/SECURITY_SCAN_RESULTS.md](backend/SECURITY_SCAN_RESULTS.md) for detailed report

### Running Quality Checks

```bash
# Type checking
make mypy              # Python type checking (target: <50 errors)
cd frontend && npm run typecheck  # TypeScript checking (0 errors)

# Testing
make python-test       # Backend tests (501 passing)
make node-test         # Frontend tests
make ci                # Full CI suite (lint + test + typecheck)

# Security scans
cd backend
bandit -r . -f json -o bandit_report.json -x tests
pip-audit --format json -o pip_audit_report.json
```

## ⚙️ Configuration

* **Backend Port**: 8001 (Default)
* **SQL Server**: configured in `backend/config.py` (Default: `192.168.1.109`)
* **Frontend**: Expo SDK 54 (Stable)

## 🧹 Maintenance

To archive old documentation:

```bash
python scripts/cleanup_old_docs.py
```

## Kill frontend

```bash
lsof -ti :8081,19000,19001,19002,19006 | xargs kill -9
```
