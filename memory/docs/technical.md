# Technical Documentation - Stock Verify v2.1

## 1. Technology Stack

### Backend
- **Language:** Python 3.10+
- **Framework:** FastAPI 0.115.6
- **Server:** Uvicorn
- **Database Drivers:**
  - `motor`: Async MongoDB driver
  - `pyodbc`: SQL Server driver
- **Authentication:** `python-jose` (JWT)
- **Testing:** `pytest`

### Frontend
- **Framework:** React Native 0.81.5
- **Runtime:** Expo SDK ~54.0
- **Language:** TypeScript
- **State Management:** Zustand 5.0.8
- **Styling:** NativeWind 3.5.2
- **Navigation:** Expo Router

### Database
- **Primary:** MongoDB 6.x
- **ERP Reference:** SQL Server 2019

## 2. Development Environment Setup

### 2.1 Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose (optional but recommended)
- SQL Server ODBC Driver 17/18

### 2.2 Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
# Configure .env file based on .env.example
python -m uvicorn backend.server:app --reload
```

### 2.3 Frontend Setup
```bash
cd backfron
npm install
npx expo start
```

## 3. Key Technical Decisions
- **Dual-Database Strategy:** To avoid putting load on the production ERP (SQL Server) during scanning operations, data is synced to a local MongoDB. This ensures high availability and low latency for the mobile app.
- **Async Architecture:** FastAPI and Motor are used to handle high concurrency, essential for multiple users scanning simultaneously.
- **Type Safety:** TypeScript in Frontend and Pydantic in Backend ensure data integrity across the stack.

## 4. API Structure
- `/api/v1/auth`: Authentication endpoints (login, refresh).
- `/api/v1/items`: Item lookup and management.
- `/api/v1/verify`: Verification submission endpoints.
- `/api/v1/sync`: Manual trigger for synchronization.
- `/health`: System health checks.

## 5. Deployment
- **Containerization:** Dockerfiles provided for Backend and Frontend.
- **Orchestration:** `docker-compose.yml` available for local orchestration.
- **CI/CD:** Makefile includes commands for testing and linting (`make ci`).
