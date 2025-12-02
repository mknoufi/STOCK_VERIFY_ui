#!/bin/bash

# Enhanced Admin Panel Launcher
# Starts the advanced monitoring dashboard for Stock Verification System

echo "🚀 STOCK_VERIFY - Enhanced Admin Panel"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "enhanced-server.py" ]; then
    echo "❌ Error: enhanced-server.py not found"
    echo "📁 Please run this script from the admin-panel directory"
    exit 1
fi

# Check Python version
python_cmd="python3"
if ! command -v $python_cmd &> /dev/null; then
    python_cmd="python"
    if ! command -v $python_cmd &> /dev/null; then
        echo "❌ Error: Python not found"
        echo "📦 Please install Python 3.7+ to run the admin panel"
        exit 1
    fi
fi

echo "🐍 Using Python: $($python_cmd --version)"

# Check for required Python packages
echo "📦 Checking dependencies..."
required_packages=("psutil")
missing_packages=()

for package in "${required_packages[@]}"; do
    if ! $python_cmd -c "import $package" 2>/dev/null; then
        missing_packages+=("$package")
    fi
done

# Install missing packages
if [ ${#missing_packages[@]} -gt 0 ]; then
    echo "📥 Installing missing packages: ${missing_packages[*]}"
    $python_cmd -m pip install "${missing_packages[@]}"
    
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install required packages"
        echo "💡 Try: pip install psutil"
        exit 1
    fi
fi

# Check if port 3000 is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3000 is already in use"
    echo "🔧 Attempting to stop existing server..."
    
    # Try to kill existing process
    pid=$(lsof -ti:3000)
    if [ ! -z "$pid" ]; then
        kill $pid 2>/dev/null
        sleep 2
    fi
    
    # Check again
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ Error: Could not free port 3000"
        echo "💡 Manually kill the process using: lsof -ti:3000 | xargs kill"
        exit 1
    fi
fi

echo "✅ Dependencies verified"
echo ""

# Start the enhanced server
echo "🌟 Starting Enhanced Admin Dashboard..."
echo "📊 Dashboard URL: http://localhost:3000/dashboard.html"
echo "🔧 Legacy Panel: http://localhost:3000/index.html"
echo "📡 API Endpoints: http://localhost:3000/api/*"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Run the server with error handling
trap 'echo -e "\n🛑 Stopping Enhanced Admin Panel..."; exit 0' INT

$python_cmd enhanced-server.py

echo "✅ Enhanced Admin Panel stopped"