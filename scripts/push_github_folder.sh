#!/bin/bash
set -e

# Define the source and destination
SRC="/Users/noufi1/cursor new/STOCK_VERIFY_2-db-maped"
DEST="/tmp/stock-verify-system-temp-github"

# Create destination directory
mkdir -p "$DEST"

# Copy .github folder
cp -r "$SRC/.github" "$DEST/"

# Initialize git and push
cd "$DEST"
git init
git checkout -b main
git remote add origin https://github.com/mknoufi/stock-verify-system.git
git add .
git commit -m "Add CI/CD workflows"
git push -u origin main
