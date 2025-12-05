#!/bin/bash

echo "🚀 LAUNCHING STOCK VERIFICATION SYSTEM"
echo "======================================"

# Set working directory
cd /Users/noufi1/STOCK_VERIFY_2-db-maped

# Ensure logs directory exists
mkdir -p logs

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:19006 | xargs kill -9 2>/dev/null || true

sleep 2

echo ""
echo "Starting services..."
echo ""

# 1. Enhanced Admin Panel (Port 3000)
echo "📊 Starting Enhanced Admin Panel..."
cd admin-panel
nohup /Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python enhanced-server.py > ../logs/admin.log 2>&1 &
echo $! > ../logs/admin.pid
echo "✅ Admin Panel: http://localhost:3000/dashboard.html"
cd ..

sleep 3

# 2. Backend API (Port 8000)
echo "🔧 Starting Backend API..."
cd backend
nohup /Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python server.py > ../logs/backend.log 2>&1 &
echo $! > ../logs/backend.pid
echo "✅ Backend API: http://localhost:8000"
cd ..

sleep 3

# 3. Frontend (Port 19006)
echo "📱 Starting Frontend..."
cd frontend
nohup npx expo start --web > ../logs/frontend.log 2>&1 &
echo $! > ../logs/frontend.pid
echo "✅ Frontend: http://localhost:19006"
cd ..

sleep 3

echo ""
echo "🎉 SYSTEM STARTUP COMPLETE!"
echo "========================="
echo ""
echo "🌟 ENHANCED DASHBOARD: http://localhost:3000/dashboard.html"
echo "🔧 LEGACY ADMIN:       http://localhost:3000/index.html"
echo "🌐 BACKEND API:        http://localhost:8000"
echo "📚 API DOCS:           http://localhost:8000/docs"
echo "📱 FRONTEND WEB:       http://localhost:19006"
echo ""
echo "📋 Process IDs:"
cat logs/admin.pid | xargs echo "   📊 Admin Panel PID:"
cat logs/backend.pid | xargs echo "   🔧 Backend PID:"
cat logs/frontend.pid | xargs echo "   📱 Frontend PID:"
echo ""
echo "📝 View logs:"
echo "   tail -f logs/admin.log"
echo "   tail -f logs/backend.log"
echo "   tail -f logs/frontend.log"
echo ""
echo "🛑 To stop all: ./stop_all_services.sh"
echo ""
