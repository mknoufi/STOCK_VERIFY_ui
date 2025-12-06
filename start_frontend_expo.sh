#!/bin/bash
# Start Frontend Development Server

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# Navigate to frontend
cd backfron || exit

echo "📱 Starting Frontend Development Server..."

# 1. Detect LAN IP
# Try en0 (WiFi) first, then en1, then fallback to generic lookup
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null)
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(ipconfig getifaddr en1 2>/dev/null)
fi
if [ -z "$LAN_IP" ]; then
    # Fallback for other systems or if ipconfig fails
    LAN_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
fi

if [ -z "$LAN_IP" ]; then
    echo "⚠️  Could not detect LAN IP, defaulting to localhost"
    LAN_IP="localhost"
else
    echo "✅ Detected LAN IP: $LAN_IP"
fi

# 2. Update .env file
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    # Update EXPO_PUBLIC_BACKEND_URL
    # We use a temporary file to avoid issues with sed in-place on different OS versions
    sed "s|EXPO_PUBLIC_BACKEND_URL=.*|EXPO_PUBLIC_BACKEND_URL=http://$LAN_IP:8001|g" "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
    echo "✅ Updated .env with Backend URL: http://$LAN_IP:8001"
else
    echo "⚠️  .env file not found in frontend directory!"
fi

echo "🌐 Frontend URL: http://localhost:8081"
echo "📱 Mobile: Use Expo Go app to scan QR code"
echo ""

# Install dependencies if needed and start
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Clear Metro cache to avoid bundling errors
echo "🧹 Clearing Metro cache..."
rm -rf .metro-cache

# 3. Enforce Port 8081
npx expo start --clear --port 8081
