#!/bin/bash

# Enhanced Admin Panel - Quick Test Script
echo "🧪 Testing Enhanced Admin Panel Components..."

# Check if files exist
echo "📁 Checking files..."
files=("dashboard.html" "dashboard.js" "enhanced-styles.css" "enhanced-server.py" "start-enhanced.sh")

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - MISSING"
    fi
done

# Make scripts executable
echo "🔧 Setting permissions..."
chmod +x start-enhanced.sh
chmod +x start.sh
echo "  ✅ Scripts made executable"

# Check Python availability
echo "🐍 Checking Python..."
if command -v python3 &> /dev/null; then
    echo "  ✅ Python3 available: $(python3 --version)"
elif command -v python &> /dev/null; then
    echo "  ✅ Python available: $(python --version)"
else
    echo "  ❌ Python not found"
    exit 1
fi

# Check psutil package
echo "📦 Checking psutil..."
if python3 -c "import psutil" 2>/dev/null; then
    echo "  ✅ psutil installed"
else
    echo "  ⚠️  psutil not installed - installing..."
    python3 -m pip install psutil
    if [ $? -eq 0 ]; then
        echo "  ✅ psutil installed successfully"
    else
        echo "  ❌ Failed to install psutil"
        exit 1
    fi
fi

# Check port availability
echo "🔌 Checking port 3000..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ⚠️  Port 3000 in use"
    pid=$(lsof -ti:3000)
    echo "  📝 Process PID: $pid"
else
    echo "  ✅ Port 3000 available"
fi

echo ""
echo "🎉 ENHANCED ADMIN PANEL - READY TO LAUNCH!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Enhanced Dashboard: ./start-enhanced.sh"
echo "🌐 URL: http://localhost:3000/dashboard.html"
echo "🔧 Legacy Panel: http://localhost:3000/index.html"
echo ""
echo "🚀 Run: ./start-enhanced.sh"
echo "💡 Or:  python3 enhanced-server.py"