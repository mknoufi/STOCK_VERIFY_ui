# Stock Verify AI Agents

This directory contains AI agent integrations for accelerating development on the Stock Verify project.

## Quick Start

### 1. Install Dependencies

```bash
cd agents
pip install -r requirements.txt
```

### 2. Set API Key

```bash
# Option A: OpenAI
export OPENAI_API_KEY=your-openai-key

# Option B: Groq (faster, cheaper)
export GROQ_API_KEY=your-groq-key
```

### 3. Run Agents

```bash
# Security audit
python -m agents.stock_verify_crew --task security --file backend/server.py

# Code review
python -m agents.stock_verify_crew --task review --file backend/api/items.py

# Generate tests
python -m agents.stock_verify_crew --task test --file backend/db_mapping_config.py

# Generate documentation
python -m agents.stock_verify_crew --task docs --file backend/config.py

# Debug an issue
python -m agents.stock_verify_crew --task debug --error "TypeError: 'NoneType' object is not subscriptable in server.py line 42"

# Full review (security + code + tests)
python -m agents.stock_verify_crew --task full --file backend/server.py
```

## Available Agents

| Agent | Purpose | Best For |
|-------|---------|----------|
| **Security Auditor** | OWASP Top 10 scanning | SQL injection, auth issues, CORS |
| **Code Reviewer** | Quality & patterns | Maintainability, type hints, docstrings |
| **Test Engineer** | Test generation | pytest tests, edge cases, mocks |
| **Documentation Writer** | Doc generation | Docstrings, README, API docs |
| **Debugger** | Root cause analysis | Error investigation, fix proposals |

## GitHub Copilot Prompts

We've also added Copilot prompts in `.github/prompts/`:

| Prompt | Usage |
|--------|-------|
| `security-audit.prompt.md` | Type `/security-audit file=backend/server.py` |
| `code-review.prompt.md` | Type `/code-review file=backend/api/items.py` |
| `generate-tests.prompt.md` | Type `/generate-tests file=backend/config.py` |
| `debug-issue.prompt.md` | Type `/debug-issue error="Your error message"` |
| `generate-docs.prompt.md` | Type `/generate-docs file=backend/db_mapping_config.py` |
| `refactor-code.prompt.md` | Type `/refactor-code file=backend/server.py` |

## APM Integration

These agents complement the Agentic Project Management (APM) system already installed:

```
/.apm/                    # APM memory and guides
/.cursor/commands/        # APM slash commands
  apm-1-initiate-setup.md
  apm-2-initiate-manager.md
  apm-3-initiate-implementation.md
  ...
```

## Architecture

```
agents/
├── __init__.py           # Package exports
├── stock_verify_crew.py  # CrewAI multi-agent system
├── requirements.txt      # Python dependencies
└── README.md            # This file

.github/prompts/          # GitHub Copilot prompts
├── security-audit.prompt.md
├── code-review.prompt.md
├── generate-tests.prompt.md
├── debug-issue.prompt.md
├── generate-docs.prompt.md
└── refactor-code.prompt.md
```

## Configuration

### Using Groq (Recommended for Speed)

```python
# In your .env file
GROQ_API_KEY=your-groq-key

# Agents automatically detect and use Groq's llama-3 or mixtral models
```

### Using Local Models (Ollama)

```python
# Start Ollama
ollama serve

# Pull a model
ollama pull llama3

# Set environment
export OLLAMA_MODEL=llama3
```

## Extending

### Add a New Agent

```python
from crewai import Agent

def create_my_agent() -> Agent:
    return Agent(
        role="Your Role",
        goal="What the agent accomplishes",
        backstory="Agent's expertise and context",
        tools=[read_file_tool, search_code_tool],
        verbose=True
    )
```

### Add a New Task

```python
from crewai import Task

def create_my_task(agent: Agent) -> Task:
    return Task(
        description="What to do",
        expected_output="Expected format",
        agent=agent
    )
```

## Troubleshooting

### "No API key found"
```bash
export OPENAI_API_KEY=your-key
# or
export GROQ_API_KEY=your-key
```

### "Module not found"
```bash
pip install -r agents/requirements.txt
```

### Slow responses
Use Groq instead of OpenAI for 10x faster inference:
```bash
export GROQ_API_KEY=your-groq-key
```

## Related Resources

- [CrewAI Documentation](https://docs.crewai.com/)
- [Awesome AI Agents](https://github.com/e2b-dev/awesome-ai-agents)
- [APM Documentation](https://agentic-project-management.dev)
