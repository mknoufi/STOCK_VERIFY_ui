#!/bin/bash
# Stop All Services

echo "🛑 Stopping all services..."

# Kill backend
pkill -f "python.*server.py" 2>/dev/null || true
pkill -f "uvicorn.*server" 2>/dev/null || true

# Kill frontend
pkill -f "expo" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
pkill -f "node.*expo" 2>/dev/null || true

# Kill processes on ports
lsof -ti:8000,8001,8002,8003,8004,8005,8081,19000,19001 2>/dev/null | xargs kill -9 2>/dev/null || true

sleep 2

echo "✅ All services stopped"
