#!/bin/bash
# Fix Expo Stuck Issue by restarting with Tunnel and clearing cache

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🛑 Stopping existing Expo processes..."
pkill -f "expo start" || true

echo "🧹 Clearing Metro bundler cache..."
rm -rf "$PROJECT_ROOT/frontend/.expo"
rm -rf "$PROJECT_ROOT/frontend/node_modules/.cache"

echo "🚀 Restarting Expo with Tunnel connection..."

osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    do script "cd '$PROJECT_ROOT/frontend' && echo '🚀 Restarting Expo (Tunnel Mode)...' && npm run update-ip && npx expo start --tunnel --clear"
end tell
APPLESCRIPT

echo "✅ New Expo Tunnel session started in a separate window."
echo "📱 Please scan the NEW QR code."
