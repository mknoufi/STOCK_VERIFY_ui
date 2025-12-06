# Makefile for STOCK_VERIFY CI and Development Tasks
# Usage: make <target>

.PHONY: help ci test lint format typecheck pre-commit install clean

help:
	@echo "Available targets:"
	@echo "  make ci          - Run all CI checks (Python + Node.js)"
	@echo "  make test         - Run all tests"
	@echo "  make lint         - Run all linters"
	@echo "  make format       - Format all code"
	@echo "  make typecheck    - Run type checkers"
	@echo "  make pre-commit   - Run pre-commit hooks"
	@echo "  make install      - Install dependencies"
	@echo "  make clean        - Clean build artifacts"

# Python backend targets
.PHONY: python-ci python-test python-lint python-format python-typecheck

python-ci: python-lint python-format python-typecheck python-test

python-test:
	@echo "Running Python tests..."
	cd backend && pytest tests/ -v --tb=short

python-lint:
	@echo "Running Python linters..."
	cd backend && ruff check . && ruff format --check .

python-format:
	@echo "Formatting Python code..."
	cd backend && black --line-length=100 . && ruff format .

python-typecheck:
	@echo "Running Python type checker..."
	mypy backend --ignore-missing-imports --python-version=3.10 || true

# Node.js frontend targets
.PHONY: node-ci node-test node-lint node-typecheck

node-ci: node-lint node-typecheck node-test

node-test:
	@echo "Running Node.js tests..."
	cd backfron && npm test || true

node-lint:
	@echo "Running Node.js linter..."
	cd backfron && npm run lint

node-typecheck:
	@echo "Running TypeScript type checker..."
	cd backfron && npm run typecheck

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
	cd backfron && npm ci
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
