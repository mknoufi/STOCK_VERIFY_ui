#!/usr/bin/env bash
set -euo pipefail

# Repo cleanup: remove generated artifacts, logs, archives, caches, and local venvs not used
# Safe list only; does not touch source code.

ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
cd "$ROOT_DIR"

echo "Cleaning repository at: $ROOT_DIR"

# Files (root)
rm -f app.log backend.log backend.pid backend_port.json debug_backend.log \
      logs.zip logs_2.zip frontend.zip test.log \
      testsprite-testsprite-mcp-0.0.18.tgz tscli-beta-0.0.6.tgz \
      .DS_Store

# Backend logs and coverage
rm -f backend/app.log backend/backend.log backend/backend_manual.log \
      backend/backend_startup.log backend/debug_startup.log backend/uvicorn.log \
      backend/.DS_Store
rm -rf backend/htmlcov backend/.mypy_cache backend/.pytest_cache backend/.ruff_cache

# Local virtualenvs inside backend (use repo .venv instead)
rm -rf backend/venv backend/venv_test

# Caches and metadata (root)
rm -rf .mypy_cache .pytest_cache .ruff_cache

# Logs folder archives
find logs -type f -name '*.log' -delete || true

# Mac metadata across repo
find . -name '.DS_Store' -type f -delete || true

# Large archives anywhere
find . -type f \( -name '*.zip' -o -name '*.tar.gz' -o -name '*.tgz' -o -name '*.tar' \) -delete || true

# Backup markdown bundles
rm -rf .backup_md_files_* || true

echo "Cleanup complete."
