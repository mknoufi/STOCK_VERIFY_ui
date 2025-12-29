# 👨‍💻 Developer Checklist - Stock Verify

This checklist is designed to help developers ensure code quality, consistency, and stability when working on the Stock Verify project.

## 🚀 1. Onboarding & Setup
*Ensure your environment is correctly configured before starting development.*

- [ ] **Read Documentation**:
  - [ ] `START_HERE.md` (Project overview)
  - [ ] `CONTRIBUTING.md` (Contribution guidelines)
  - [ ] `README.md` (System architecture)
- [ ] **Environment Setup**:
  - [ ] Python 3.10+ installed
  - [ ] Node.js & npm installed
  - [ ] Docker & Docker Compose installed
  - [ ] Git configured
- [ ] **Backend Setup**:
  - [ ] Virtual environment created (`python3 -m venv venv`)
  - [ ] Dependencies installed (`pip install -r backend/requirements.txt`)
  - [ ] `.env` file created from example
  - [ ] Secrets configured (JWT_SECRET, etc.)
- [ ] **Frontend Setup**:
  - [ ] Dependencies installed (`cd frontend && npm install`)
  - [ ] `.env` file created
- [ ] **Verify Setup**:
  - [ ] Backend runs (`./start.sh` or `make run-backend`)
  - [ ] Frontend runs (`cd frontend && npm start`)
  - [ ] Tests pass (`make test`)

## 🔄 2. Daily Workflow
*Routine steps to keep your local environment in sync.*

- [ ] **Sync Codebase**:
  - [ ] `git checkout main`
  - [ ] `git pull origin main`
- [ ] **Update Dependencies**:
  - [ ] Backend: `pip install -r backend/requirements.txt`
  - [ ] Frontend: `npm install` (in `frontend/`)
- [ ] **Create Feature Branch**:
  - [ ] `git checkout -b feature/your-feature-name`

## 💻 3. Development Standards
*Follow these rules to maintain code quality.*

### Backend (Python/FastAPI)
- [ ] **Type Hinting**: Use type hints for all function arguments and return values.
- [ ] **Async/Await**: Use `async` for I/O bound operations (DB, Network).
- [ ] **Error Handling**: Use `HTTPException` with proper status codes.
- [ ] **Logging**: Use the configured logger, not `print()`.
- [ ] **Configuration**: Use `backend/config.py` for settings, not hardcoded values.
- [ ] **Database**:
  - [ ] Use `db_mapping_config.py` for SQL mappings.
  - [ ] Parameterize all SQL queries (prevent SQL Injection).

### Frontend (React Native/TypeScript)
- [ ] **TypeScript**: No `any` types; define interfaces/types.
- [ ] **Components**: Functional components with Hooks.
- [ ] **State Management**: Use Zustand for global state.
- [ ] **Styling**: Use the theme system (don't hardcode colors).
- [ ] **API Calls**: Use centralized services in `frontend/services/`.

## 🧪 4. Testing Checklist
*Verify your changes before committing.*

- [ ] **Unit Tests**:
  - [ ] Write tests for new logic.
  - [ ] Run backend tests: `pytest backend/tests/`
- [ ] **Integration Tests**:
  - [ ] Verify API endpoints work with the frontend.
  - [ ] Check database interactions (MongoDB/SQL Server).
- [ ] **Manual Testing**:
  - [ ] Test the feature in the simulator/device.
  - [ ] Verify edge cases and error states.

## ✅ 5. Pre-Commit Checklist
*Run these checks before pushing your code.*

- [ ] **Linting & Formatting**:
  - [ ] Backend: `make lint` (Ruff/Black)
  - [ ] Frontend: `npm run lint`
- [ ] **Type Checking**:
  - [ ] Backend: `mypy backend/`
  - [ ] Frontend: `npm run typecheck`
- [ ] **Clean Up**:
  - [ ] Remove debug print statements.
  - [ ] Remove unused imports and variables.
  - [ ] Update documentation if needed.

## 📝 6. Pull Request Checklist
*Prepare your PR for review.*

- [ ] **Title**: Clear and descriptive (e.g., `feat: add barcode scanning`).
- [ ] **Description**:
  - [ ] What does this change do?
  - [ ] Why is it needed?
  - [ ] How was it tested?
- [ ] **Screenshots/Videos**: Attach for UI changes.
- [ ] **Linked Issues**: Link to relevant Jira/GitHub issues.
- [ ] **Self-Review**: Review your own code diff before submitting.

## 🛠️ 7. Troubleshooting
*Common issues and fixes.*

- **Backend won't start**: Check `.env` variables and port availability (8001).
- **Database connection failed**: Check Docker containers (`docker ps`) and connection strings.
- **Frontend errors**: Clear Metro bundler cache (`npm start -- --reset-cache`).
- **Test failures**: Ensure test database is clean/available.

---
*Keep this checklist handy to ensure a smooth development process!*
