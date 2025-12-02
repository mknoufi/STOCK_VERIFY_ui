#!/bin/bash

echo "🔍 CHECKING BACKEND SERVER STATUS"
echo "================================="
echo ""

# Check if backend is running on port 8001
echo "📡 Checking port 8001..."
if lsof -Pi :8001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    pid=$(lsof -ti:8001)
    echo "✅ Backend server is running on port 8001 (PID: $pid)"
    
    # Test if it's responding
    echo "🧪 Testing backend response..."
    if curl -s -f http://localhost:8001/health >/dev/null 2>&1; then
        echo "✅ Backend is responding to health checks"
    else
        echo "⚠️  Backend is running but not responding"
        echo "📋 Checking backend logs..."
        if [ -f "logs/backend.log" ]; then
            echo "--- Last 10 lines of backend log ---"
            tail -n 10 logs/backend.log
        fi
    fi
else
    echo "❌ No service running on port 8001"
    echo ""
    echo "🚀 Starting backend server..."
    
    cd /Users/noufi1/STOCK_VERIFY_2-db-maped/backend
    echo "📂 Current directory: $(pwd)"
    echo "🐍 Starting with: /Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python server.py"
    
    # Start backend
    /Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python server.py &
    BACKEND_PID=$!
    
    echo "🔄 Backend started with PID: $BACKEND_PID"
    echo "⏳ Waiting 5 seconds for startup..."
    sleep 5
    
    # Test again
    if curl -s -f http://localhost:8001/health >/dev/null 2>&1; then
        echo "✅ Backend is now responding!"
        echo "🌐 Backend API: http://localhost:8001"
        echo "📚 API Docs: http://localhost:8001/docs"
    else
        echo "❌ Backend still not responding"
        echo "📋 Check logs with: tail -f logs/backend.log"
    fi
fi

echo ""
echo "🔗 MOBILE ACCESS:"
echo "   The mobile app is trying to connect to: http://192.168.1.32:8001"
echo "   Make sure the backend is accessible from your network interface"
echo ""

# Show network interfaces
echo "📱 Network interfaces:"
ifconfig | grep -A 1 "inet " | grep -v "127.0.0.1" | head -10