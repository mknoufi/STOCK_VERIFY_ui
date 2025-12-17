# ⚡ Quick Start: Vibe Coding Today

**Time to First Contribution:** ~2 hours  
**Difficulty:** Beginner-Friendly  
**Last Updated:** December 17, 2025

---

## 🎯 Goal

Get you writing code and making contributions TODAY using AI-assisted development.

---

## ✅ Pre-flight Checklist (15 minutes)

### 1. Clone & Navigate
```bash
# You should already have this
cd /path/to/STOCK_VERIFY_ui

# Verify you're in the right place
ls -la  # Should see backend/, frontend/, docs/, etc.
```

### 2. Check Python & Node
```bash
# Python 3.10+ required
python3 --version  # Should be 3.10 or higher

# Node 18+ required  
node --version     # Should be 18 or higher
npm --version      # Should be 9 or higher
```

### 3. Install Core Dependencies
```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install ruff black mypy pytest

# Frontend
cd ../frontend
npm install

# Return to root
cd ..
```

### 4. Environment Setup
```bash
# Create backend .env
cp backend/.env.example backend/.env

# Generate secrets
cd backend
python scripts/generate_secrets.py

# Edit backend/.env with a text editor
# Paste the generated JWT secrets
# Configure your SQL Server details (or use defaults for now)
```

### 5. Verify Installation
```bash
# Test backend
cd backend
python -m pytest tests/ -v --tb=short

# Expected: Tests should run (some may fail without DB, that's OK for now)

# Test frontend
cd ../frontend
npm run typecheck
# Expected: Should complete without errors
```

✅ **If you got this far, you're ready to code!**

---

## 🚀 Your First Vibe Coding Task (1 hour)

### Task: Add Better Error Messages

**What you'll do:** Improve user-facing error messages in the mobile app

**Why this is perfect for learning:**
- ✅ Small scope (won't break things)
- ✅ Touches multiple files (learn structure)
- ✅ Immediate visual impact
- ✅ No complex logic
- ✅ Easy to test

### Step-by-Step Guide

#### 1. Start Your AI Assistant

Choose one:
- **Cursor:** Open project in Cursor IDE
- **GitHub Copilot Chat:** Open in VS Code
- **Aider:** Run `aider` in terminal
- **Cline:** Open VS Code with Cline extension

#### 2. First AI Prompt

Copy and paste this exact prompt:

```
I'm working on the Stock Verify mobile app (React Native + Expo). I want to improve error messages shown to users when API calls fail. Currently, users see technical error messages. I want to replace them with friendly, actionable messages.

First, show me:
1. Where API calls are made (likely in frontend/services/api.ts)
2. Current error handling implementation
3. Examples of error messages users currently see

Then suggest a plan to improve them following the existing code patterns.
```

#### 3. Review the Response

Your AI will show you the current code. Look for:
- `frontend/services/api.ts` - API client
- Error handling in `catch` blocks
- Any existing error message constants

#### 4. Next Prompt (After Reviewing)

```
Create a new file frontend/constants/errorMessages.ts that maps error codes to user-friendly messages. Include messages for:
- Network errors (no connection)
- Authentication errors (401, 403)
- Not found errors (404)
- Server errors (500)
- Timeout errors

Follow TypeScript best practices and the existing code style in this project.
```

#### 5. Implement the File

Your AI will generate the code. Review it and create the file:

```bash
# The AI will show you the code, then you create it:
cd frontend
# Create constants/errorMessages.ts with the generated code
```

#### 6. Update API Service

Next prompt:
```
Now update frontend/services/api.ts to use the new error messages. Replace technical errors with user-friendly messages from errorMessages.ts. Show me the changes needed.
```

#### 7. Test Your Changes

```bash
cd frontend

# Type check
npm run typecheck

# If there are errors, ask AI:
"Fix these TypeScript errors: [paste errors]"
```

#### 8. Manual Testing

```bash
# Start the backend (in one terminal)
cd backend
source .venv/bin/activate
uvicorn backend.server:app --reload --port 8001

# Start the frontend (in another terminal)
cd frontend
npm start

# Test scenarios:
# 1. Turn off backend → should show "connection error" message
# 2. Invalid login → should show "invalid credentials" message
# 3. etc.
```

#### 9. Commit Your Work

```bash
git add frontend/constants/errorMessages.ts
git add frontend/services/api.ts
git commit -m "feat: add user-friendly error messages"

# Or ask AI to generate commit message:
"Generate a conventional commit message for these changes"
```

✅ **Congratulations! You just made your first vibe coding contribution!**

---

## 🎯 Next Tasks (Choose Your Own Adventure)

### Path A: UI/UX Improvements (Beginner-Friendly)

**Task 1: Loading States** (2 hours)
```
Add loading spinners to all screens in the mobile app. Use the existing design system from frontend/theme/modernDesignSystem.ts. Show me screens that need loading states and suggest implementation.
```

**Task 2: Empty States** (2 hours)
```
Add empty state messages when lists are empty (no items, no sessions, etc.). Make them helpful and actionable. Show me components that need empty states.
```

**Task 3: Success Feedback** (2 hours)
```
Add success toast notifications when users complete actions (item scanned, session created, etc.). Use a toast library compatible with React Native. Show implementation examples.
```

### Path B: Feature Enhancements (Intermediate)

**Task 1: Search History** (4 hours)
```
Implement search history for the item search. Store recent searches in AsyncStorage, display them as quick access chips. Show me the search component and suggest implementation.
```

**Task 2: Barcode History** (4 hours)
```
Add a "recently scanned" section showing the last 10 barcodes scanned. Allow quick re-scan from history. Integrate with the scan screen.
```

**Task 3: Session Filters** (4 hours)
```
Add filter options to the sessions list (filter by status, date range, warehouse). Implement using React state and query parameters.
```

### Path C: Backend Improvements (Intermediate-Advanced)

**Task 1: API Documentation** (3 hours)
```
Improve API documentation in the OpenAPI schema. Add examples, better descriptions, and response schemas. Review backend/api/*.py files and enhance docstrings.
```

**Task 2: Input Validation** (4 hours)
```
Add comprehensive input validation using Pydantic models. Review all API endpoints and ensure all inputs are validated. Show me endpoints missing validation.
```

**Task 3: Error Logging** (3 hours)
```
Improve error logging with structured logging. Add context (user_id, session_id) to all error logs. Review backend/server.py logging setup.
```

---

## 📚 Learning Resources Built Into This Project

### 1. Code Examples (Read These First)
```bash
# Well-written backend API
backend/api/sessions_api.py

# Well-written frontend screen
frontend/app/scan.tsx

# Comprehensive tests
backend/tests/test_sessions_api.py

# Type definitions
frontend/types/session.ts
```

### 2. Documentation to Read
```
docs/codebase_memory_v2.1.md        # Architecture overview
docs/STOCK_VERIFY_2.1_cursor_rules.md  # Coding standards
VIBE_CODING_NEXT_STEPS.md          # Detailed guide (you're here!)
VIBE_CODING_SETUP.md               # Tool setup
```

### 3. Ask AI to Explain
```
"Explain the authentication flow in this app"
"How does the barcode scanner work?"
"Show me how sessions are created and managed"
"Explain the database schema for items"
```

---

## 🎓 Vibe Coding Workflow (Use Every Time)

### The 5-Step Loop

```
1. 📖 UNDERSTAND
   → "Show me the current implementation of [feature]"
   
2. 📋 PLAN
   → "Create a plan to add [improvement]"
   
3. ⚙️ IMPLEMENT
   → "Implement [specific part] following [existing pattern]"
   
4. ✅ TEST
   → Run tests, type check, manual testing
   
5. 🔄 ITERATE
   → "Fix [issue]" or "Improve [aspect]"
```

### Example Conversation

**You:**
```
Show me the current implementation of the barcode scanner in frontend/app/scan.tsx
```

**AI:**
```
[Shows code and explains how it works]
```

**You:**
```
I want to add a visual flash effect when a barcode is successfully scanned. How should I implement this following React Native best practices?
```

**AI:**
```
[Suggests implementation using Animated API]
```

**You:**
```
Implement that in scan.tsx. Show me the complete updated code.
```

**AI:**
```
[Provides updated code]
```

**You:**
```
Add tests for the new flash animation effect
```

**AI:**
```
[Creates test file]
```

---

## 🚨 Troubleshooting

### Problem: Tests Failing

**Solution:**
```bash
# Make sure you're in the right directory
cd backend
source .venv/bin/activate

# Install test dependencies
pip install pytest pytest-cov

# Run tests with more info
pytest tests/ -v --tb=short

# Ask AI for help:
"These tests are failing: [paste error]. Help me fix them."
```

### Problem: TypeScript Errors

**Solution:**
```bash
cd frontend

# Check what's wrong
npm run typecheck

# Ask AI:
"Fix these TypeScript errors: [paste errors]"
```

### Problem: Import Errors

**Solution:**
```bash
# Python
cd backend
pip install -r requirements.txt

# Node
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Problem: Environment Variables

**Solution:**
```bash
# Verify .env exists
ls -la backend/.env

# If not:
cp backend/.env.example backend/.env

# Generate secrets
cd backend
python scripts/generate_secrets.py

# Edit .env and paste secrets
```

---

## ✅ Daily Checklist

Before you start coding each day:

```bash
# 1. Update code
git pull

# 2. Install any new dependencies
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# 3. Run tests to verify everything works
cd backend && pytest tests/ -v
cd ../frontend && npm run typecheck

# 4. Start coding!
```

Before you commit:

```bash
# 1. Type check
cd frontend && npm run typecheck

# 2. Lint
make lint

# 3. Run tests
cd backend && pytest tests/ -v

# 4. Review changes
git diff

# 5. Commit with conventional format
git commit -m "type: description"
# Types: feat, fix, docs, style, refactor, test, chore
```

---

## 🎁 Bonus: AI Prompt Templates

### For Understanding Code
```
"Explain [file/function/concept] in this codebase in simple terms"
"What does [code section] do and why?"
"Show me all usages of [function/class]"
"Trace the flow of [feature] from frontend to backend"
```

### For Implementation
```
"Implement [feature] following the pattern in [example file]"
"Add [functionality] to [file] without breaking existing code"
"Refactor [code] to be more [readable/efficient/testable]"
"Convert [old pattern] to [new pattern] following [example]"
```

### For Testing
```
"Create tests for [function] covering happy path and edge cases"
"Add integration tests for [API endpoint]"
"Review test coverage and suggest missing tests"
"Mock [dependency] in this test following [example]"
```

### For Debugging
```
"This error is occurring: [error]. Help me debug it."
"Why isn't [feature] working as expected?"
"Compare [broken code] with [working example]"
"Add logging to help debug [issue]"
```

### For Security Review
```
"Review [code] for security vulnerabilities"
"Is this implementation safe from SQL injection?"
"Check for XSS vulnerabilities in [frontend code]"
"Review authentication logic for security issues"
```

---

## 🎯 Your Goals This Week

### Day 1 (Today)
- [x] Set up development environment
- [x] Complete "First Vibe Coding Task"
- [ ] Make first commit

### Day 2-3
- [ ] Pick a Path A task (UI/UX)
- [ ] Complete and commit
- [ ] Learn one new part of codebase

### Day 4-5
- [ ] Pick a Path B task (Features)
- [ ] Complete and commit
- [ ] Write tests for your changes

### End of Week
- [ ] Have 3-5 commits merged
- [ ] Understand app architecture
- [ ] Feel confident with vibe coding workflow

---

## 🚀 Ready?

**Your first command:**

```
"I'm ready to start vibe coding on the Stock Verify project. I want to improve error messages in the mobile app. Show me frontend/services/api.ts and explain the current error handling."
```

**Then follow the steps in "Your First Vibe Coding Task" above!**

---

**Remember:** 
- Start small ✅
- Ask lots of questions ✅  
- Test frequently ✅
- Have fun! ✅

**Questions?** Just ask your AI assistant! That's what they're here for. 🎵

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2025  
**Time to Complete:** ~2 hours for first task
