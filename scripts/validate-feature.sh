#!/bin/bash
# Feature Branch Validation Script
# Runs all CI checks to ensure the feature is ready for merge

set -e

echo "🔍 Starting feature branch validation..."

# 1. Run CI checks (Linting, Typechecking, Tests)
echo "🚀 Running CI checks..."
make ci

echo "✅ Feature branch validation successful!"
