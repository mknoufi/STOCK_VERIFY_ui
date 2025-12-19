#!/bin/bash
# Start Frontend Development Server
cd /Users/noufi1/STOCK_VERIFY_2-db-maped/frontend

echo "📱 Starting Frontend Development Server..."
echo "🌐 Frontend URL: http://localhost:19006"
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

npx expo start --clear
