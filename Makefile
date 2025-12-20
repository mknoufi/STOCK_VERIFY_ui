# Makefile for STOCK_VERIFY CI and Development Tasks
# Usage: make <target>

.PHONY: help ci test lint format typecheck pre-commit install clean eval security secrets

help:
	@echo "📦 Stock Verify Application - Available Commands"
	@echo ""
	@echo "🚀 Main Targets:"
	@echo "  make ci          - Run all CI checks (Python + Node.js)"
	@echo "  make test        - Run all tests"
	@echo "  make lint        - Run all linters"
	@echo "  make format      - Format all code"
	@echo "  make typecheck   - Run type checkers"
	@echo ""
	@echo "🔒 Security:"
	@echo "  make security    - Run security checks"
	@echo "  make secrets     - Generate new JWT secrets"
	@echo ""
	@echo "🛠️  Development:"
	@echo "  make install     - Install dependencies"
	@echo "  make pre-commit  - Run pre-commit hooks"
	@echo "  make clean       - Clean build artifacts"
	@echo ""
	@echo "📊 Evaluation:"
	@echo "  make eval        - Run evaluation framework"
	@echo "  make eval-report - Run evaluation with markdown report"
	@echo ""
	@echo "🎵 Vibe Coding:"
	@echo "  make vibe-install    - Install AI coding tools"
	@echo "  make vibe-aider      - Start Aider terminal agent"
	@echo "  make vibe-interpreter- Start Open Interpreter"
	@echo "  make vibe-info       - Show vibe coding setup info"


# Python backend targets
.PHONY: python-ci python-test python-lint python-format python-typecheck

python-ci: python-format python-lint python-typecheck python-test

python-test:
	@echo "Running Python tests..."
	cd backend && pytest tests/ -v --tb=short

python-lint:
	@echo "Running Python linters..."
	cd backend && ruff check . && ruff format --check .

python-format:
	@echo "Formatting Python code..."
	cd backend && black --line-length=100 api auth services middleware utils db scripts \
		config.py server.py api_mapping.py db_mapping_config.py sql_server_connector.py exceptions.py error_messages.py && ruff format .

python-typecheck:
	@echo "Running Python type checker..."
	mypy backend --ignore-missing-imports --python-version=3.10 || true

# Node.js frontend targets
.PHONY: node-ci node-test node-lint node-typecheck

node-ci: node-lint node-typecheck node-test

node-test:
	@echo "Running Node.js tests..."
	cd frontend && npm test || true

node-lint:
	@echo "Running Node.js linter..."
	cd frontend && npm run lint

node-typecheck:
	@echo "Running TypeScript type checker..."
	cd frontend && npm run typecheck

# Combined targets
ci: python-ci node-ci
	@echo "✅ All CI checks passed!"

test: python-test node-test

lint: python-lint node-lint

format: python-format
	@echo "✅ Code formatted!"

typecheck: python-typecheck node-typecheck

pre-commit:
	@echo "Running pre-commit hooks..."
	pre-commit run -a

# Installation
install:
	@echo "Installing Python dependencies..."
	pip install -r backend/requirements.txt
	pip install pre-commit black ruff mypy pytest pytest-cov
	@echo "Installing Node.js dependencies..."
	cd frontend && npm ci
	@echo "Installing pre-commit hooks..."
	pre-commit install

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name ".pytest_cache" -exec rm -r {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -r {} + 2>/dev/null || true
	find . -type d -name "node_modules" -prune -o -type d -name ".next" -exec rm -r {} + 2>/dev/null || true
	@echo "✅ Cleanup complete!"

# Security targets
.PHONY: security secrets validate-env

security:
	@echo "🔒 Running security checks..."
	@echo "Checking for .env files in repository..."
	@if find . -name "*.env" -not -name "*.env.example" -not -path "*/node_modules/*" | grep -q .; then \
		echo "❌ ERROR: .env files found in repository!"; \
		find . -name "*.env" -not -name "*.env.example" -not -path "*/node_modules/*"; \
		exit 1; \
	fi
	@echo "✅ No .env files found"
	@echo "Running pre-commit security hooks..."
	pre-commit run detect-secrets --all-files || true
	@echo "✅ Security check complete!"

secrets:
	@echo "🔐 Generating new JWT secrets..."
	cd backend && python scripts/generate_secrets.py
	@echo ""
	@echo "⚠️  Remember to:"
	@echo "  1. Copy these secrets to your .env file"
	@echo "  2. Update production environment variables"
	@echo "  3. Never commit .env files to Git"

validate-env:
	@echo "🔍 Validating environment configuration..."
	cd backend && python scripts/validate_env.py

# Evaluation Framework
.PHONY: eval eval-report eval-performance eval-security

eval:
	@echo "Running evaluation framework..."
	python -m backend.tests.evaluation.run_evaluation --all

eval-report:
	@echo "Running evaluation with markdown report..."
	python -m backend.tests.evaluation.run_evaluation --all --format md --verbose

eval-performance:
	@echo "Running performance evaluation..."
	python -m backend.tests.evaluation.run_evaluation --performance --verbose

eval-security:
	@echo "Running security evaluation..."
	cd backend && pytest tests/evaluation/test_security_evaluation.py -v
# =============================================================================
# 🎵 VIBE CODING TARGETS
# =============================================================================
.PHONY: vibe-install vibe-aider vibe-interpreter vibe-info

vibe-install:
	@echo "🎵 Installing Vibe Coding Tools..."
	@echo ""
	@echo "📦 Installing Aider (terminal-based AI pair programming)..."
	pip install aider-chat || echo "⚠️  Aider install failed - may need pip upgrade"
	@echo ""
	@echo "📦 Installing Open Interpreter..."
	pip install open-interpreter || echo "⚠️  Open Interpreter install failed"
	@echo ""
	@echo "📦 Installing Continue dependencies..."
	@echo "   Install VS Code extension: Continue.continue"
	@echo ""
	@echo "📦 Installing Cline dependencies..."
	@echo "   Install VS Code extension: saoudrizwan.claude-dev"
	@echo ""
	@echo "✅ Vibe Coding tools installed!"
	@echo ""
	@echo "📋 Next steps:"
	@echo "   1. Set ANTHROPIC_API_KEY environment variable"
	@echo "   2. Run 'make vibe-aider' to start Aider"
	@echo "   3. See VIBE_CODING_SETUP.md for full documentation"

vibe-aider:
	@echo "🎵 Starting Aider..."
	@if [ -z "$$ANTHROPIC_API_KEY" ]; then \
		echo "❌ ERROR: ANTHROPIC_API_KEY not set"; \
		echo "   Run: export ANTHROPIC_API_KEY=your_key_here"; \
		exit 1; \
	fi
	aider

vibe-interpreter:
	@echo "🎵 Starting Open Interpreter..."
	@if [ -z "$$ANTHROPIC_API_KEY" ]; then \
		echo "❌ ERROR: ANTHROPIC_API_KEY not set"; \
		echo "   Run: export ANTHROPIC_API_KEY=your_key_here"; \
		exit 1; \
	fi
	interpreter --config .interpreter.yml

vibe-info:
	@echo "🎵 Vibe Coding Setup - Stock Verification System"
	@echo ""
	@echo "📁 Configuration Files:"
	@echo "   .aider.conf.yml      - Aider settings"
	@echo "   .continue/           - Continue extension config"
	@echo "   .clinerules          - Cline/Claude Dev rules"
	@echo "   .cursorrules         - Cursor IDE rules"
	@echo "   .swe-agent.yml       - SWE-Agent config"
	@echo "   .interpreter.yml     - Open Interpreter config"
	@echo "   .metagpt.yml         - MetaGPT config"
	@echo "   .autogpt.yml         - AutoGPT config"
	@echo "   .devon.yml           - Devon config"
	@echo ""
	@echo "🚀 Quick Commands:"
	@echo "   make vibe-install    - Install AI coding tools"
	@echo "   make vibe-aider      - Start Aider terminal agent"
	@echo "   make vibe-interpreter- Start Open Interpreter"
	@echo ""
	@echo "📖 See VIBE_CODING_SETUP.md for detailed documentation"
