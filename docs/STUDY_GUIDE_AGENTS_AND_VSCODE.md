# Study Guide: Agents + VS Code Workspace (Stock Verify)

This guide is a single place to find “agent” docs and the VS Code workspace setup in this repo.

## 1) Agent Docs (AI helpers)

### 1.1 CrewAI / Multi-agent scripts (local Python)
- Entry docs: `agents/README.md`
- Code:
  - `agents/stock_verify_crew.py`
  - `agents/requirements.txt`

What it’s for:
- Running local “tasks” like security audit, code review, test generation, docs generation, debugging.

### 1.2 GitHub Copilot Prompt Agents (VS Code Chat “/” commands)
- Folder: `.github/prompts/`
- Notable prompts:
  - `security-audit.prompt.md`
  - `code-review.prompt.md`
  - `generate-tests.prompt.md`
  - `debug-issue.prompt.md`
  - `generate-docs.prompt.md`
  - `refactor-code.prompt.md`

What it’s for:
- Reusable, consistent prompt templates when using Copilot Chat.

### 1.3 Planning templates that mention “agent context”
- Planning workflow template: `templates/commands/plan.md`
- Placeholder template for an agent context file: `templates/agent-file-template.md`

Note:
- Some docs reference an `AGENTS.md`, but this repo doesn’t currently contain an `AGENTS.md` file.

### 1.4 Example standalone agent app
- Cooking agent code: `cooking_agent/app.py` and `cooking_agent/test_agent.py`

## 2) VS Code Workspace (.vscode)

### 2.1 Workspace rules
- `.vscode/README.md`

Highlights:
- Stack summary (FastAPI, Expo/React Native, MongoDB, SQL Server read-only, Redis)
- AI usage rules and reminders (don’t redesign architecture, don’t write back to ERP)

### 2.2 Recommended extensions
- `.vscode/extensions.json`

### 2.3 Workspace settings
- `.vscode/settings.json`

Includes:
- Copilot enable/disable rules by file type
- Python analysis strictness (`python.analysis.typeCheckingMode: strict`)
- Format-on-save + ESLint fix on save

### 2.4 VS Code tasks
- `.vscode/tasks.json`

Tasks included:
- Open FastAPI docs
- Open MongoDB docs
- Open React Native docs
- Open Expo docs
- Open Redis docs

## 3) Other docs worth studying
- Contribution + doc locations: `CONTRIBUTING.md`
- Architecture and reference docs: `docs/` (start with `docs/REFERENCES.md`, `docs/SRS.md`, and `docs/TECHNICAL_SPECIFICATION.md`)
