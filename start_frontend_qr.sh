#!/bin/bash

echo "📱 Starting Frontend with Expo QR Code"
echo "======================================"
echo ""

cd /Users/noufi1/STOCK_VERIFY_2-db-maped/frontend

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
    echo ""
fi

echo "🎯 EXPO QR CODE GENERATOR"
echo "========================="
echo ""
echo "📱 Instructions:"
echo "   1. Install 'Expo Go' app on your mobile device"
echo "   2. Scan the QR code that appears below"
echo "   3. Your app will load on your mobile device"
echo ""
echo "🌐 Web version: http://localhost:19006"
echo "🔄 Metro bundler starting..."
echo ""
echo "🛑 Press Ctrl+C to stop"
echo ""

# Start Expo with clear cache and QR code display
npx expo start --clear

echo ""
echo "✅ Expo development server stopped"
