#!/bin/bash

echo "🚀 Starting Stock Verification System with Expo QR Code"
echo "======================================================="
echo ""

# Navigate to project root
cd /Users/noufi1/STOCK_VERIFY_2-db-maped

# Create logs directory
mkdir -p logs

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

sleep 2

# 1. Start Enhanced Admin Panel
echo "📊 Starting Enhanced Admin Panel..."
cd admin-panel
nohup /Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python enhanced-server.py > ../logs/admin.log 2>&1 &
ADMIN_PID=$!
echo "✅ Admin Panel started (PID: $ADMIN_PID)"
echo "   📊 Dashboard: http://localhost:3000/dashboard.html"
cd ..

sleep 3

# 2. Start Backend API
echo "🔧 Starting Backend API Server..."
# Run from root as module to fix imports
nohup /Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python -m backend.server > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend API started (PID: $BACKEND_PID)"
echo "   🌐 API: http://localhost:8001"

sleep 3

# 3. Start Frontend with Expo QR Code
echo "📱 Starting Frontend with Expo QR Code..."
cd frontend

# Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo ""
echo "🎯 EXPO DEVELOPMENT SERVER STARTING..."
echo "======================================="
echo "📱 Scan the QR code with Expo Go app on your mobile device"
echo "🌐 Web version will be available at: http://localhost:8081"
echo "🔄 Metro bundler will start automatically"
echo ""
echo "📋 ACTIVE SERVICES:"
echo "   📊 Enhanced Dashboard: http://localhost:3000/dashboard.html"
echo "   🔧 Backend API: http://localhost:8001"
echo "   📱 Frontend Mobile: Use QR code below"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo ""

# Save PIDs for cleanup
echo $ADMIN_PID > ../logs/admin.pid
echo $BACKEND_PID > ../logs/backend.pid

# Start Expo with QR code (foreground to show QR)
npx expo start --clear

# Cleanup on exit
trap 'echo ""; echo "🛑 Stopping all services..."; kill $ADMIN_PID $BACKEND_PID 2>/dev/null; rm -f ../logs/*.pid; echo "✅ All services stopped"; exit 0' INT

cd ..
