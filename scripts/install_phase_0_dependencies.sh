#!/bin/bash

# Phase 0 Dependencies Installation Script
# Stock Verify v2.1 Enhancement

set -e

echo "🚀 Installing Phase 0 Dependencies for Stock Verify v2.1"
echo "========================================================="
echo ""

# Change to frontend directory
cd "$(dirname "$0")/../frontend" || exit 1

echo "📦 Current directory: $(pwd)"
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Install required dependencies
echo "📥 Installing required dependencies..."
echo ""

echo "1️⃣ Installing Voice Control (expo-speech)..."
npm install expo-speech

echo ""
echo "2️⃣ Installing Chart Libraries (react-native-chart-kit, react-native-svg)..."
npm install react-native-chart-kit react-native-svg

echo ""
echo "3️⃣ Installing AI Features (optional - for web platform)..."
read -p "Install AI features (TensorFlow.js, Tesseract.js)? This is optional and only works on web. (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install --save-dev @tensorflow/tfjs @tensorflow-models/mobilenet tesseract.js
    echo "✅ AI features installed"
else
    echo "⏭️  Skipping AI features (can install later if needed)"
fi

echo ""
echo "========================================================="
echo "✅ Installation Complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ expo-speech (Voice Control)"
echo "  ✅ react-native-chart-kit (Analytics Charts)"
echo "  ✅ react-native-svg (Chart Rendering)"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  ✅ AI Features (TensorFlow.js, Tesseract.js)"
fi
echo ""
echo "🎯 Next Steps:"
echo "  1. Run 'npm start' to start the development server"
echo "  2. Test voice control on a physical device"
echo "  3. Check analytics dashboard at /admin/analytics"
echo "  4. Integrate camera enhancements into scan screen"
echo ""
echo "📚 Documentation:"
echo "  - Integration Guide: docs/INTEGRATION_GUIDE.md"
echo "  - Component Guide: docs/NEW_COMPONENTS_GUIDE.md"
echo "  - Scan Example: docs/SCAN_SCREEN_INTEGRATION_EXAMPLE.md"
echo ""
echo "🎉 Happy coding!"