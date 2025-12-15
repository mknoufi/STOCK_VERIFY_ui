# Vibe Coding Workflow for Stock Verification System

> A comprehensive workflow integrating modern AI coding tools for maximum productivity.

## 🎯 Philosophy

**Vibe Coding** (coined by Andrej Karpathy): *"Fully give in to the vibes, embrace exponentials, and forget that the code even exists. You just see stuff, say stuff, run stuff, and it mostly works."*

---

## 🔄 Development Workflow

### Phase 1: Planning & Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     PLANNING & DESIGN                            │
├─────────────────────────────────────────────────────────────────┤
│  Tool                │ Purpose                                   │
├──────────────────────┼──────────────────────────────────────────┤
│  v0.dev              │ Rapid UI prototyping, generate React     │
│  Lovable.dev         │ Full-stack app scaffolding               │
│  Claude Task Master  │ Break down complex features into tasks   │
│  AGENTS.md           │ Document agent behavior expectations     │
└─────────────────────────────────────────────────────────────────┘
```

**Workflow:**
1. **Sketch UI** → Use [v0.dev](https://v0.dev) for React Native components
2. **Define Tasks** → Use Claude Task Master to break epics into subtasks
3. **Update AGENTS.md** → Keep `.github/copilot-instructions.md` current

### Phase 2: Active Development

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACTIVE DEVELOPMENT                            │
├─────────────────────────────────────────────────────────────────┤
│  Tool                │ Usage                                     │
├──────────────────────┼──────────────────────────────────────────┤
│  GitHub Copilot      │ Primary AI assistant (VS Code)           │
│  Cursor              │ Alternative IDE with deep AI integration │
│  Cline/Roo Code      │ Autonomous agent tasks via CLI           │
│  aider               │ Terminal-based pair programming          │
│  Claude Code         │ Complex multi-file refactoring           │
└─────────────────────────────────────────────────────────────────┘
```

**Daily Workflow:**
```bash
# Start development environment
./start.sh                          # Backend + Frontend

# Or use VS Code tasks
# Ctrl+Shift+P → "Tasks: Run Task" → "Start Backend"
```

**AI-Assisted Coding Patterns:**

| Task | Tool | Command/Action |
|------|------|----------------|
| Quick code completion | GitHub Copilot | `Tab` to accept suggestions |
| Explain complex code | Copilot Chat | `Cmd+I` → "Explain this" |
| Generate tests | Copilot | `/tests` in chat |
| Refactor function | Claude Code | `claude "refactor X for Y"` |
| Multi-file changes | Cline | VS Code extension autonomous mode |
| Terminal pair prog | aider | `aider --model gpt-4` |

### Phase 3: Testing & Quality

```
┌─────────────────────────────────────────────────────────────────┐
│                    TESTING & QUALITY                             │
├─────────────────────────────────────────────────────────────────┤
│  Action              │ Command                                   │
├──────────────────────┼──────────────────────────────────────────┤
│  Run all tests       │ make test                                │
│  Lint Python         │ make lint                                │
│  Type check          │ make typecheck                           │
│  Format code         │ make format                              │
│  Full CI             │ make ci                                  │
└─────────────────────────────────────────────────────────────────┘
```

**AI-Assisted Testing:**
```bash
# Generate tests with Copilot
# In VS Code: Select code → Cmd+I → "/tests"

# Run specific tests
cd backend && pytest tests/test_auth.py -v

# Coverage report
cd backend && pytest tests/ --cov=backend --cov-report=html
```

### Phase 4: Documentation

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENTATION                                 │
├─────────────────────────────────────────────────────────────────┤
│  Tool                │ Purpose                                   │
├──────────────────────┼──────────────────────────────────────────┤
│  CodeGuide           │ Auto-generate project documentation      │
│  Copilot Chat        │ Generate docstrings and comments         │
│  AGENTS.md format    │ Machine-readable agent instructions      │
└─────────────────────────────────────────────────────────────────┘
```

**Generate Docstrings:**
```python
# Select function → Cmd+I → "Add Google-style docstring"
def process_barcode(barcode: str, session_id: str) -> dict:
    """Process a barcode scan and update count.
    
    Args:
        barcode: The scanned barcode string
        session_id: Active counting session ID
        
    Returns:
        Dict with item details and count status
        
    Raises:
        HTTPException: If session not found or barcode invalid
    """
```

---

## 🛠️ Tool-Specific Integration

### GitHub Copilot (Primary)
```yaml
# Already configured in .github/copilot-instructions.md
Features:
  - Code completion
  - Chat assistant (Cmd+I)
  - Agent mode for complex tasks
  - /tests, /fix, /explain commands
```

### Cursor IDE (Alternative)
```yaml
# If using Cursor instead of VS Code
Settings:
  - Import .github/copilot-instructions.md as rules
  - Enable "Always Allow" for trusted commands
  - Configure Claude as chat model
```

### Claude Code (CLI Agent)
```bash
# Install
npm install -g @anthropic-ai/claude-code

# Use for complex refactoring
claude "Add rate limiting to all /api/mapping endpoints"

# Multi-file changes
claude "Update all MongoDB queries to use proper error handling"
```

### aider (Terminal Pair Programming)
```bash
# Install
pip install aider-chat

# Start session
cd /path/to/STOCK_VERIFY_2-db-maped
aider --model claude-3-sonnet

# Commands in aider
/add backend/server.py          # Add file to context
/ask What does this endpoint do? # Ask questions
/code Add pagination to /api/items # Generate code
```

### Cline/Roo Code (VS Code Extension)
```yaml
# Install from VS Code Marketplace
Configuration:
  - Set API key for preferred model
  - Enable autonomous mode for trusted repos
  - Configure allowed commands (from .cursorrules)
```

---

## 📋 Task Management Integration

### Claude Task Master Setup
```bash
# Add to project
npx claude-task-master init

# Define tasks in tasks.json
{
  "tasks": [
    {
      "id": "auth-refresh",
      "description": "Implement JWT refresh token rotation",
      "files": ["backend/auth.py", "frontend/services/auth.ts"],
      "status": "in-progress"
    }
  ]
}
```

### Boomerang Tasks (Roo Code)
```yaml
# Automatically breaks down:
"Add barcode scanning with camera" →
  1. Add expo-camera dependency
  2. Create CameraScanner component
  3. Integrate with barcode lookup API
  4. Handle scan results
  5. Add error states
```

---

## 🌐 Browser-Based Tools

### Quick Prototyping
| Scenario | Tool | URL |
|----------|------|-----|
| Design new React component | v0.dev | https://v0.dev |
| Full-stack prototype | Bolt.new | https://bolt.new |
| Rapid iteration | Lovable | https://lovable.dev |
| AI experiments | Replit | https://replit.com |

### Workflow Example
```
1. Prototype in v0.dev → Generate React Native component
2. Copy to frontend/components/
3. Adapt for Expo (remove web-only APIs)
4. Integrate with existing services
5. Test with Copilot-generated tests
```

---

## 🔐 Security Workflow

### AI-Assisted Security Review
```bash
# Use Copilot for security scanning
# Select code → Cmd+I → "Check for security vulnerabilities"

# Specific checks:
- SQL injection (parameterized queries)
- XSS prevention
- JWT validation
- CORS configuration
- Input sanitization
```

### Automated Checks
```bash
# Run security linting
make lint  # Includes ruff security rules

# Check for secrets
# (pre-commit hooks catch common patterns)
```

---

## 📊 Workflow Commands Reference

### Daily Development
```bash
# Start everything
./start.sh

# Or use VS Code tasks (Cmd+Shift+B)
# → "Start Backend"
# → "Start Frontend"

# Check health
curl http://localhost:8001/api/health
```

### Before Committing
```bash
# Format and lint
make format
make lint
make typecheck

# Run tests
make test

# Full CI check
make ci
```

### AI Commands (Copilot Chat)
```
/explain     - Explain selected code
/fix         - Fix issues in selection
/tests       - Generate unit tests
/doc         - Generate documentation
@workspace   - Ask about entire codebase
#file        - Reference specific file
```

---

## 🎨 Component Generation Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   v0.dev     │───▶│   Copilot    │───▶│   Review     │
│  Prototype   │    │   Refine     │    │   & Test     │
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
   Generate            Adapt to            Run tests
   React UI           Expo/RN             make test
```

---

## 📁 File Structure for AI Context

```
.github/
├── copilot-instructions.md   # Primary agent instructions
├── AGENTS.md                 # Additional agent guidelines
└── workflows/                # CI/CD workflows

docs/
├── ARCHITECTURE.md           # System overview
├── API_CONTRACTS.md          # API specifications
├── API_REFERENCE.md          # Endpoint documentation
└── VIBE_CODING_WORKFLOW.md   # This file

specs/
└── *.md                      # Feature specifications
```

---

## 🚀 Quick Reference Card

| Action | Tool | Shortcut/Command |
|--------|------|------------------|
| Code completion | Copilot | `Tab` |
| Inline chat | Copilot | `Cmd+I` |
| Full chat | Copilot | `Cmd+Shift+I` |
| Generate UI | v0.dev | Browser |
| Complex refactor | Claude Code | `claude "..."` |
| Terminal pairing | aider | `aider` |
| Run tests | Make | `make test` |
| Format code | Make | `make format` |
| Start dev | Script | `./start.sh` |

---

## 📚 Resources

- [Awesome Vibe Coding](https://github.com/filipecalegario/awesome-vibe-coding)
- [Andrej Karpathy's Vibe Coding](https://x.com/karpathy/status/1886192184808149383)
- [GitHub Copilot Docs](https://docs.github.com/copilot)
- [Claude Code](https://github.com/anthropics/claude-code)
- [aider](https://aider.chat/)
- [Cline](https://cline.bot/)

---

*Last updated: December 2024*
