#!/bin/bash

echo "🚀 STARTING STOCK VERIFICATION SYSTEM"
echo "====================================="
echo ""

# Navigate to project root
cd /Users/noufi1/STOCK_VERIFY_2-db-maped

# Create logs directory
mkdir -p logs

echo "📊 Starting Enhanced Admin Panel..."
cd admin-panel

# Start the enhanced admin panel in background
/Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python enhanced-server.py &
ADMIN_PID=$!
echo "✅ Admin Panel started (PID: $ADMIN_PID) - http://localhost:3000/dashboard.html"

cd ..
sleep 3

echo "🔧 Starting Backend API Server..."  
cd backend

# Start backend server in background
/Users/noufi1/STOCK_VERIFY_2-db-maped/.venv/bin/python server.py &
BACKEND_PID=$!
echo "✅ Backend API started (PID: $BACKEND_PID) - http://localhost:8000"

cd ..
sleep 3

echo "📱 Starting Frontend Development Server..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend server in background
npx expo start --web &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID) - http://localhost:19006"

cd ..

# Save PIDs
echo $ADMIN_PID > logs/admin.pid
echo $BACKEND_PID > logs/backend.pid
echo $FRONTEND_PID > logs/frontend.pid

echo ""
echo "🎉 ALL SERVICES STARTED SUCCESSFULLY!"
echo "===================================="
echo ""
echo "🔗 ACCESS URLS:"
echo "📊 Enhanced Dashboard: http://localhost:3000/dashboard.html"
echo "🔧 Legacy Admin:      http://localhost:3000/index.html"
echo "🌐 Backend API:       http://localhost:8000"
echo "📚 API Docs:          http://localhost:8000/docs"
echo "📱 Frontend Web:      http://localhost:19006"
echo ""
echo "📝 Process IDs saved in logs/ directory"
echo "🛑 To stop: kill $ADMIN_PID $BACKEND_PID $FRONTEND_PID"
echo ""