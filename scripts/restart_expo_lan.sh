#!/bin/bash
# Restart Expo in LAN mode with correct IP (en0)
# Fixes "Stuck on opening project" and 502 Tunnel errors

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Get WiFi IP
WIFI_IP=$(ipconfig getifaddr en0)
if [ -z "$WIFI_IP" ]; then
    echo "⚠️  Could not detect WiFi IP (en0). Falling back to auto-detection."
else
    echo "✅ Detected WiFi IP: $WIFI_IP"
    export REACT_NATIVE_PACKAGER_HOSTNAME="$WIFI_IP"
    export EXPO_DEV_CLIENT_NETWORK_INSPECTOR=false
fi

echo "🛑 Stopping existing Expo processes..."
pkill -f "expo start" || true

echo "🧹 Clearing Metro bundler cache..."
rm -rf "$PROJECT_ROOT/frontend/.expo"
rm -rf "$PROJECT_ROOT/frontend/node_modules/.cache"

echo "🔄 Updating frontend configuration..."
# This runs the updated update-ip.js which now prioritizes en0
node "$PROJECT_ROOT/frontend/scripts/update-ip.js"

echo "🚀 Restarting Expo (LAN Mode)..."

osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    do script "cd '$PROJECT_ROOT/frontend' && export REACT_NATIVE_PACKAGER_HOSTNAME='$WIFI_IP' && echo '🚀 Expo LAN Mode on $WIFI_IP' && npx expo start --lan --clear"
end tell
APPLESCRIPT

echo "✅ Expo LAN session started."
echo "📱 Please scan the NEW QR code in the opened window."
