#!/bin/bash

echo "🔍 STOCK VERIFICATION SYSTEM - STATUS CHECK"
echo "=========================================="
echo ""

# Function to check port status
check_port() {
    local port=$1
    local service=$2
    local pid=$(lsof -ti :$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo "✅ $service: RUNNING (Port $port, PID: $pid)"
        return 0
    else
        echo "❌ $service: NOT RUNNING (Port $port)"
        return 1
    fi
}

# Check service ports
echo "📊 SERVICE STATUS:"
check_port 3000 "Enhanced Admin Panel"
check_port 8000 "Backend API Server"
check_port 19006 "Frontend Dev Server"

echo ""
echo "📂 LOG FILES:"
if [ -d "logs" ]; then
    if [ -f "logs/admin.pid" ]; then
        admin_pid=$(cat logs/admin.pid 2>/dev/null)
        if kill -0 $admin_pid 2>/dev/null; then
            echo "✅ Admin Panel PID file exists and process is running ($admin_pid)"
        else
            echo "⚠️  Admin Panel PID file exists but process is dead ($admin_pid)"
        fi
    else
        echo "❌ Admin Panel PID file not found"
    fi
    
    if [ -f "logs/backend.pid" ]; then
        backend_pid=$(cat logs/backend.pid 2>/dev/null)
        if kill -0 $backend_pid 2>/dev/null; then
            echo "✅ Backend API PID file exists and process is running ($backend_pid)"
        else
            echo "⚠️  Backend API PID file exists but process is dead ($backend_pid)"
        fi
    else
        echo "❌ Backend API PID file not found"
    fi
    
    if [ -f "logs/frontend.pid" ]; then
        frontend_pid=$(cat logs/frontend.pid 2>/dev/null)
        if kill -0 $frontend_pid 2>/dev/null; then
            echo "✅ Frontend PID file exists and process is running ($frontend_pid)"
        else
            echo "⚠️  Frontend PID file exists but process is dead ($frontend_pid)"
        fi
    else
        echo "❌ Frontend PID file not found"
    fi
else
    echo "❌ Logs directory does not exist"
fi

echo ""
echo "🐍 PYTHON ENVIRONMENT:"
if [ -f ".venv/bin/python" ]; then
    echo "✅ Virtual environment exists"
    echo "   Python: $(.venv/bin/python --version)"
    echo "   Path: $(pwd)/.venv/bin/python"
else
    echo "❌ Virtual environment not found"
fi

echo ""
echo "🍃 MONGODB STATUS:"
if pgrep mongod > /dev/null; then
    echo "✅ MongoDB is running"
else
    echo "❌ MongoDB not detected"
fi

echo ""
echo "📁 PROJECT STRUCTURE:"
echo "✅ Admin Panel: $([ -d "admin-panel" ] && echo "EXISTS" || echo "MISSING")"
echo "✅ Backend: $([ -d "backend" ] && echo "EXISTS" || echo "MISSING")"  
echo "✅ Frontend: $([ -d "frontend" ] && echo "EXISTS" || echo "MISSING")"

# Check key files
echo ""
echo "🔧 KEY FILES:"
echo "Enhanced Server: $([ -f "admin-panel/enhanced-server.py" ] && echo "✅ EXISTS" || echo "❌ MISSING")"
echo "Backend Server: $([ -f "backend/server.py" ] && echo "✅ EXISTS" || echo "❌ MISSING")"
echo "Frontend Config: $([ -f "frontend/package.json" ] && echo "✅ EXISTS" || echo "❌ MISSING")"

echo ""
echo "🚀 STARTUP SCRIPTS:"
echo "Quick Start: $([ -f "quick_start.sh" ] && echo "✅ READY" || echo "❌ MISSING")"
echo "Stop Services: $([ -f "stop_all_services.sh" ] && echo "✅ READY" || echo "❌ MISSING")"

echo ""
echo "🔗 ACCESS URLS (if running):"
echo "📊 Enhanced Dashboard: http://localhost:3000/dashboard.html"
echo "🔧 Legacy Admin:      http://localhost:3000/index.html"
echo "🌐 Backend API:       http://localhost:8000"
echo "📚 API Docs:          http://localhost:8000/docs"
echo "📱 Frontend Web:      http://localhost:19006"

echo ""
if ! lsof -ti :3000 >/dev/null 2>&1 && ! lsof -ti :8000 >/dev/null 2>&1 && ! lsof -ti :19006 >/dev/null 2>&1; then
    echo "💡 SYSTEM IS NOT RUNNING - To start:"
    echo "   chmod +x quick_start.sh && ./quick_start.sh"
else
    echo "🎯 SOME SERVICES ARE RUNNING"
    echo "   To stop all: chmod +x stop_all_services.sh && ./stop_all_services.sh"
    echo "   To restart: ./stop_all_services.sh && ./quick_start.sh"
fi

echo ""