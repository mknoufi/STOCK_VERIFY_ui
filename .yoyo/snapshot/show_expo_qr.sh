#!/bin/bash

# Quick script to show Expo QR code
# Run this in your terminal to see the QR code

cd "$(dirname "$0")/frontend"

echo "📱 EXPO QR CODE GENERATOR"
echo "========================"
echo ""
echo "Starting Expo development server..."
echo "The QR code will appear below."
echo ""
echo "📱 Instructions:"
echo "   1. Install 'Expo Go' app on your mobile device"
echo "   2. Scan the QR code that appears below"
echo "   3. Your app will load on your mobile device"
echo ""
echo "🌐 Web version: Press 'w' in the Expo terminal"
echo "🛑 Press Ctrl+C to stop"
echo ""

# Start Expo with QR code display
npx expo start --clear

