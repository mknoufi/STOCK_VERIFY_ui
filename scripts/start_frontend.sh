#!/bin/bash
# Start Frontend (Expo) - Ensures only one instance runs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

cd "$FRONTEND_DIR"

echo "🔍 Checking for existing frontend instances..."

# Kill existing Expo/Metro processes
pkill -f "expo" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "node.*expo" 2>/dev/null || true

# Kill processes on common ports
lsof -ti:8081 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:19000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:19001 2>/dev/null | xargs kill -9 2>/dev/null || true

# Wait for ports to be released
sleep 2

echo "🚀 Starting frontend (Expo)..."

# Update IP address in .env based on backend_port.json
echo "🔄 Updating Frontend configuration..."
npm run update-ip

# Clear caches and start
rm -rf .metro-cache node_modules/.cache ~/.expo/cache .expo 2>/dev/null || true

npx expo start --web --clear
