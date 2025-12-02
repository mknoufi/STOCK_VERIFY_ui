#!/bin/bash

echo "🛑 Stopping all services..."

# Kill backend server
echo "Stopping backend server..."
pkill -f "python.*server.py" || pkill -f "uvicorn.*server:app"

# Kill Expo/Metro bundler
echo "Stopping frontend (Expo)..."
pkill -f "expo start" || pkill -f "react-native start"

# Wait a moment
sleep 2

echo "✅ All services stopped"
echo ""
echo "🚀 Starting services..."
echo ""

# Start backend
echo "Starting backend server on port 8001..."
cd /Users/noufi1/STOCK_VERIFY_2-db-maped/backend
python3 server.py &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Wait for backend to initialize
sleep 3

# Start frontend
echo ""
echo "Starting frontend (Expo)..."
cd /Users/noufi1/STOCK_VERIFY_2-db-maped/frontend
npx expo start --clear &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "✅ All services restarted!"
echo ""
echo "Backend:  http://192.168.1.32:8001"
echo "Frontend: http://localhost:8081"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
wait
