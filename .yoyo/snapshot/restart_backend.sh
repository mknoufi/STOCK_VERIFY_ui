#!/bin/bash

echo "🔧 RESTARTING BACKEND SERVER"
echo "============================"
echo ""

cd /Users/noufi1/STOCK_VERIFY_2-db-maped

# Kill any existing backend processes
echo "🛑 Stopping existing backend processes..."
pkill -f "server.py" 2>/dev/null || true
lsof -ti:8001 | xargs kill -9 2>/dev/null || true

sleep 2

echo "🚀 Starting fresh backend server..."

# Ensure logs directory exists
mkdir -p logs

# Start backend in background with proper Python path
export PYTHONPATH="/Users/noufi1/STOCK_VERIFY_2-db-maped"
nohup /Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python -m backend.server > logs/backend.log 2>&1 &
BACKEND_PID=$!

echo "✅ Backend started with PID: $BACKEND_PID"
echo $BACKEND_PID > ../logs/backend.pid

cd ..

echo "⏳ Waiting for backend to start..."
sleep 5

# Test the backend
echo "🧪 Testing backend..."
if curl -s -f http://localhost:8001/health >/dev/null 2>&1; then
    echo "✅ Backend is running and responding!"
    echo "🌐 Local: http://localhost:8001" 
    echo "📚 Docs: http://localhost:8001/docs"
    echo "📱 Mobile: http://192.168.1.32:8001"
    echo ""
    echo "✅ Your mobile app should now be able to connect!"
else
    echo "❌ Backend not responding"
    echo "📋 Check logs:"
    echo "   tail -f logs/backend.log"
    
    if [ -f "logs/backend.log" ]; then
        echo ""
        echo "--- Last 15 lines of backend log ---"
        tail -n 15 logs/backend.log
    fi
fi

echo ""
echo "🔍 Current processes on port 8001:"
lsof -i :8001 2>/dev/null || echo "No processes found on port 8001"