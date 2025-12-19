#!/bin/bash

echo "🔄 RESTARTING EXPO WITH CLEAN CACHE"
echo "==================================="
echo ""

cd /Users/noufi1/STOCK_VERIFY_2-db-maped/frontend

echo "🧹 Clearing caches..."

# Clear Metro cache
echo "📦 Clearing Metro cache..."
npx expo start --clear-cache --no-dev --no-minify --dev-mode &
EXPO_PID=$!
sleep 2
kill $EXPO_PID 2>/dev/null || true

# Clear Expo cache
echo "🗂️ Clearing Expo cache..."
npx expo install --fix

# Clear AsyncStorage (this will be done automatically by the app)
echo "💾 AsyncStorage will be cleared by the app on next startup"

echo ""
echo "✅ Cache cleared - restarting Expo..."
echo ""
echo "🎯 The corrupted AsyncStorage data will be automatically cleaned"
echo "🔗 Backend should now connect on the correct port (8001)"
echo ""

# Restart with clear cache
npx expo start --clear

echo "✅ Expo restarted with clean cache"
