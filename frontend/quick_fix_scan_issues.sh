#!/bin/bash

echo "🔧 Quick Fix Script for QR Scan Loading Issues"
echo "==============================================="

echo "1. Restarting Expo with clear cache..."
cd "$(dirname "$0")"
npx expo start --clear &

echo "2. Checking backend connectivity..."
curl -s http://192.168.0.114:8001/health > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend is accessible"
else
    echo "❌ Backend not accessible - check if backend is running"
fi

echo "3. Checking package dependencies..."
npx expo doctor

echo "4. Fixing common package issues..."
npx expo install --fix

echo "5. Checking for TypeScript errors..."
npx tsc --noEmit --skipLibCheck

echo ""
echo "📱 Manual Testing Steps:"
echo "1. Clear app data on mobile device"
echo "2. Login with valid credentials"
echo "3. Navigate to Scan screen"
echo "4. Grant camera permissions"
echo "5. Test QR scanning"
echo ""
echo "🔍 If still stuck, check:"
echo "- Network connectivity (same WiFi)"
echo "- Authentication status"
echo "- Camera permissions"
echo "- Expo dev tools console for errors"
