# Stock Verify (v2.1) - Project Report

## 1. Comprehensive Project Summary

**Stock Verify** is a mission-critical inventory management and verification system designed for hybrid database environments. It bridges legacy ERP systems (SQL Server) with modern, offline-first mobile capabilities (MongoDB + React Native).

### 🏗 Architecture

* **Hybrid Database Model**:
  * **MongoDB (Primary)**: Handles application state, sessions, stock counts, and user management. Acts as the write-master for the application.
  * **SQL Server (ERP)**: Treated as a **Read-Only** source of truth for product catalogs, batches, and warehouse data.
* **Backend**: **FastAPI** (Python 3.10+) providing a high-performance, async REST API. It handles data synchronization, authentication, and business logic.
* **Frontend**: **React Native (Expo SDK 54)** application built with TypeScript. It features an offline-first architecture using local storage and synchronization queues.
* **AI Integration**: Includes **CrewAI** agents for code review, testing, and documentation, plus **CopilotKit** integration.

### 🔑 Key Technologies

* **Backend**: FastAPI, Uvicorn, Motor (Async Mongo), PyODBC (SQL Server), Pydantic (Validation), Redis (Caching).
* **Frontend**: React Native, Expo, TypeScript, Zustand (State Management), Jest (Testing).
* **Infrastructure**: Docker Compose, Nginx (Reverse Proxy), OpenTelemetry (Observability).

---

## 2. Detailed File Structure

### 📂 Root Directory

```text
STOCK_VERIFY_2-db-maped/
├── agents/                 # AI Agents (CrewAI)
├── backend/                # FastAPI Application
│   ├── api/                # API Route Handlers (v1 & v2)
│   ├── core/               # Core Logic (Lifespan, DB connection)
│   ├── db/                 # Database Initialization & Migrations
│   ├── middleware/         # Custom Middleware (Auth, Logging)
│   ├── models/             # Pydantic Models & Schemas
│   ├── services/           # Business Logic Services
│   ├── utils/              # Utility Functions
│   ├── config.py           # App Configuration (Pydantic)
│   ├── db_mapping_config.py# SQL Server -> App Schema Mapping
│   ├── server.py           # Main Application Entry Point
│   └── requirements.txt    # Python Dependencies
├── frontend/               # React Native Application
│   ├── src/
│   │   ├── components/     # Reusable UI Components
│   │   ├── services/       # API Clients & Logic
│   │   ├── store/          # State Management (Zustand)
│   │   └── types/          # TypeScript Definitions
│   ├── app.json            # Expo Configuration
│   └── package.json        # Frontend Dependencies
├── docker-compose.yml      # Container Orchestration
├── Makefile                # Build & Automation Commands
└── README.md               # Project Documentation
```

---

## 3. Relevant Dependencies & Configuration

### 🐍 Backend (`backend/requirements.txt`)

Key libraries defining the backend capabilities:

* **Core**: `fastapi`, `uvicorn[standard]`, `pydantic`, `python-dotenv`
* **Database**: `motor` (MongoDB Async), `pyodbc` (SQL Server), `redis`
* **Security**: `pyjwt`, `bcrypt`, `passlib`, `bandit` (Security Scanning)
* **Observability**: `opentelemetry-api`, `opentelemetry-sdk`
* **AI/Agents**: `copilotkit`, `crewai` (in `agents/`)

### ⚛️ Frontend (`frontend/package.json`)

Key libraries for the mobile experience:

* **Core**: `expo (~54.0.0)`, `react-native`, `react`
* **State/Storage**: `@react-native-async-storage/async-storage`, `zustand` (implied usage)
* **UI**: `@expo/vector-icons`, `@expo-google-fonts/inter`
* **Dev/Test**: `jest`, `typescript`, `eslint-config-expo`

### ⚙️ Configuration Files

#### `backend/config.py`

Uses **Pydantic Settings** for type-safe configuration.

* **Environment**: Manages `DEBUG`, `ENVIRONMENT` (dev/prod).
* **Database**: Configures `MONGO_URL` with auto-detection for local ports.
* **Versioning**: Enforces `MIN_CLIENT_VERSION` for app compatibility.

#### `backend/db_mapping_config.py`

**Critical File**: Defines the translation layer between the legacy SQL Server schema and the modern application domain.

* **`TABLE_MAPPINGS`**: Maps `items` → `Products`, `stock_flow` → `StockFlow`.
* **`SQL_TEMPLATES`**: Contains raw SQL queries (CTEs) for complex data retrieval like "Last Purchase Info".

#### `docker-compose.yml`

Orchestrates the local development environment:

* **Backend**: Builds from `./backend`, exposes port `8001`.
* **Mongo**: Runs MongoDB v6.0 on port `27017`.
* **Volumes**: Persists MongoDB data in `mongo_data`.

---

## 4. Major Source Code Parts

### 🚀 Backend Entry: `backend/server.py`

The central hub of the backend application.

* **Router Mounting**: Aggregates over 30+ API routers (e.g., `auth`, `erp_api`, `enhanced_item_api`).
* **Lifespan Management**: Handles startup/shutdown logic for DB connections and caches via `backend.core.lifespan`.
* **Middleware**: Configures CORS, Authentication, and Logging.

### 🗺️ Data Mapping: `backend/db_mapping_config.py`

This file isolates the legacy database structure from the application logic.

* **Purpose**: Allows the backend to query SQL Server without hardcoding table names in every service.
* **Key Components**: `PRODUCTS_COLUMN_MAP`, `BATCH_COLUMN_MAP`, and `SQL_TEMPLATES`.

### 🤖 AI Agents: `agents/stock_verify_crew.py`

A standalone multi-agent system for development assistance.

* **Framework**: Built with **CrewAI**.
* **Capabilities**: Can read files, list directories, and search code patterns.
* **Tasks**: Configured to perform Code Review, Testing, and Documentation generation.

### 📱 Frontend Structure: `frontend/src/`

* **`services/api/`**: Likely contains the API client that normalizes backend `snake_case` data to frontend `camelCase`.
* **`store/`**: Global state management (Zustand) for handling offline data and user sessions.

---

## 5. Detailed Descriptions for AI Analysis

### 🧠 Architecture Patterns

* **Read-Only Legacy Integration**: The system **never** writes to the SQL Server. All inventory adjustments or counts are stored in MongoDB as "discrepancies" or "sessions" and must be reconciled manually or via a separate process.
* **Offline-First**: The frontend is designed to work without a constant network connection, syncing data when connectivity is restored.

### 🛡️ Security Constraints

* **Parameterized Queries**: All SQL interaction **MUST** use `?` placeholders. String interpolation (f-strings) in SQL queries is strictly forbidden to prevent Injection attacks.
* **CORS**: Wildcard origins (`*`) are prohibited. Specific origins must be defined in `backend/config.py`.

### 🤖 AI Integration Points

* **CopilotKit**: Integrated into the backend (`copilotkit` dependency), suggesting features for in-app AI assistance.
* **CrewAI**: The `agents/` directory suggests a workflow where AI agents are used to maintain and verify the codebase itself.

### ⚠️ Critical Rules for AI Suggestions

1. **Do not suggest writing to SQL Server**.
2. **Always check `db_mapping_config.py`** before writing SQL queries.
3. **Respect the Hybrid Model**: Data flows `SQL -> Mongo -> App`.
4. **Mobile Compatibility**: Ensure API changes are backward compatible or versioned, as mobile apps may not update immediately.
