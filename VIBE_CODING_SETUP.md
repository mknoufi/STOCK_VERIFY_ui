# Vibe Coding Setup Guide 🎵

This repository is configured for **vibe coding** - the AI-first development paradigm where you describe what you want in natural language and let AI tools generate the code.

## Available AI Agent Configurations

| Tool | Config File | Purpose |
|------|-------------|---------|
| **Cursor** | `.cursorrules` | Primary IDE rules |
| **GitHub Copilot** | `.github/copilot-instructions.md` | VS Code integration |
| **Aider** | `.aider.conf.yml` | Terminal-based pair programming |
| **Continue** | `.continue/config.json` | Open-source IDE extension |
| **Cline** | `.clinerules` | Claude Dev / Cline extension |
| **SWE-Agent** | `.swe-agent.yml` | Princeton's autonomous agent |
| **MetaGPT** | `.metagpt.yml` | Multi-agent team simulation |
| **AutoGPT** | `.autogpt.yml` | Autonomous agent platform |
| **Devon** | `.devon.yml` | Open-source pair programmer |
| **Open Interpreter** | `.interpreter.yml` | Natural language computer use |
| **GPT Engineer** | `prompt` | Full project generation |

## Quick Start

### 1. Aider (Recommended for Terminal)

```bash
# Install
pip install aider-chat

# Set API key
export ANTHROPIC_API_KEY=your_key_here

# Run in repo
aider
```

Aider will automatically use `.aider.conf.yml` for project-specific settings.

### 2. Continue (VS Code Extension)

1. Install [Continue extension](https://marketplace.visualstudio.com/items?itemName=Continue.continue)
2. Config is in `.continue/config.json`
3. Add API keys:
   ```bash
   export ANTHROPIC_API_KEY=your_key
   export OPENAI_API_KEY=your_key
   ```

### 3. Cline / Claude Dev

1. Install [Cline extension](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev)
2. Rules are in `.clinerules`
3. The agent will follow project constraints automatically

### 4. Open Interpreter

```bash
# Install
pip install open-interpreter

# Run with config
interpreter --config .interpreter.yml
```

## MCP Servers (VS Code)

The `.vscode/mcp.json` configures these Model Context Protocol servers:

- **TestSprite** - Automated testing
- **Context7** - Library documentation lookup
- **Playwright** - Browser automation
- **Memory** - Persistent context
- **Filesystem** - File operations

## Project Rules (All Agents Follow)

1. **SQL Server is READ-ONLY** - All writes go to MongoDB
2. **Parameterized Queries** - Use `?` placeholders, never string concat
3. **JWT Auth Required** - All `/api/*` endpoints need auth
4. **Test Before Commit** - Run `make test` before any changes
5. **Follow Patterns** - Use existing code patterns, don't add frameworks

## Common Vibe Coding Prompts

### Security Audit
```
Check the codebase for SQL injection vulnerabilities, especially in discover_tables.py
```

### Add Feature
```
Add a new endpoint /api/items/search that searches items by name with pagination
```

### Refactor
```
Refactor the test_all_methods function to reduce complexity and improve maintainability
```

### Debug
```
The barcode scanner is returning 404 errors. Debug and fix the issue.
```

### Test
```
Add comprehensive unit tests for the authentication flow
```

## Architecture Summary

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Native  │────▶│   FastAPI       │────▶│   MongoDB       │
│   Expo (TS)     │     │   Python 3.10+  │     │   (Primary)     │
│   Port 8081     │     │   Port 8001     │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 │ READ-ONLY
                                 ▼
                        ┌─────────────────┐
                        │   SQL Server    │
                        │   (ERP Source)  │
                        └─────────────────┘
```

## Useful Commands

```bash
# Start everything
./start.sh

# Run tests
make test

# Lint and format
make lint
make format

# Full CI
make ci

# Docker
docker-compose up --build
```

## API Keys Required

Create a `.env` file with:

```bash
# For AI agents
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key

# For the app
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
MONGODB_URI=mongodb://localhost:27017
```

## Contributing with AI

1. Describe your task in natural language
2. Let the AI generate code following project rules
3. Review the changes
4. Run `make ci` to verify
5. Commit with conventional commit format

Happy vibe coding! 🎵
