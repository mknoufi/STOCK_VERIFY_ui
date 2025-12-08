# Stock Verify Application (v2.1)

## 📚 Documentation (v2.1)

* **[Codebase Memory](docs/codebase_memory_v2.1.md)**: Architecture, Tech Stack, and Data Models.
* **[Cursor Rules](docs/STOCK_VERIFY_2.1_cursor_rules.md)**: AI behavior and coding standards.
* **[Verified Coding Policy](docs/verified_coding_policy.md)**: Testing and verification requirements.
* **[Changelog](docs/CHANGELOG.md)**: Version history.

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
# Install dependencies
pip install -r requirements.txt
# Run server (Port 8000)
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend

```bash
cd frontend
# Install dependencies
npm install
# Start Expo (Port 8081)
npx expo start
```

## ⚙️ Configuration

* **Backend Port**: 8000 (Default)
* **SQL Server**: configured in `backend/config.py` (Default: `192.168.1.109`)
* **Frontend**: Expo SDK 54 (Stable)

## 🧹 Maintenance

To archive old documentation:

```bash
python scripts/cleanup_old_docs.py
```

# Kill frontend

lsof -ti :8081,19000,19001,19002,19006 | xargs kill -9

```

# Here are your Instructions
