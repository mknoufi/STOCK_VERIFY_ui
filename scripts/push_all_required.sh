#!/bin/bash
set -e

# Define the source and destination
SRC="/Users/noufi1/cursor new/STOCK_VERIFY_2-db-maped"
DEST="/tmp/stock-verify-system-temp-v2"

# Create destination directory
mkdir -p "$DEST"

# Copy root files
cp "$SRC/Makefile" "$DEST/"
cp "$SRC/README.md" "$DEST/"
cp "$SRC/docker-compose.yml" "$DEST/"
cp "$SRC/package.json" "$DEST/"
cp "$SRC/pyproject.toml" "$DEST/"
cp "$SRC/requirements.production.txt" "$DEST/"
cp "$SRC/start_app.sh" "$DEST/"
cp "$SRC/stop.sh" "$DEST/"
cp "$SRC/.gitignore" "$DEST/"
cp "$SRC/app.json" "$DEST/"

# Copy .github folder
cp -r "$SRC/.github" "$DEST/"

# Copy backend (excluding unnecessary files)
mkdir -p "$DEST/backend"
rsync -av --exclude='.*' --exclude='__pycache__' --exclude='venv' --exclude='.venv' --exclude='*.log' --exclude='coverage_html' --exclude='bandit_report.json' --exclude='.pytest_cache' --exclude='.ruff_cache' "$SRC/backend/" "$DEST/backend/"

# Copy frontend (excluding unnecessary files)
mkdir -p "$DEST/frontend"
rsync -av --exclude='.*' --exclude='node_modules' --exclude='.expo' --exclude='dist' --exclude='playwright-report' --exclude='test-results' --exclude='*.log' "$SRC/frontend/" "$DEST/frontend/"

# Initialize git and push
cd "$DEST"
git init
git checkout -b main
git add .
git commit -m "Initial commit: Required files and CI/CD workflows"
git remote add origin https://github.com/mknoufi/stock-verify-system.git
git push -u origin main --force
