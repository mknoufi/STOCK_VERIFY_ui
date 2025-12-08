#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8001
FRONTEND_PORTS=(8081 19000 19001 19002 19006)

echo -e "${GREEN}🛑 Stopping all existing servers...${NC}"

# Kill all existing processes
pkill -f "uvicorn.*backend.server" 2>/dev/null
pkill -f "expo\|metro" 2>/dev/null
lsof -ti :8001 | xargs kill -9 2>/dev/null
for port in "${FRONTEND_PORTS[@]}"; do
    lsof -ti :$port | xargs kill -9 2>/dev/null
done

# Clean up PID files
rm -f "$SCRIPT_DIR/logs/backend.pid" "$SCRIPT_DIR/logs/frontend.pid"

sleep 2
echo -e "${GREEN}✅ All servers stopped${NC}"
echo ""

echo -e "${GREEN}🚀 Starting servers in separate Terminal windows...${NC}"

# Start Backend in new Terminal window
echo -e "${YELLOW}📦 Starting Backend Server in new window...${NC}"
osascript <<EOF
tell application "Terminal"
    activate
    set backendWindow to do script "cd '$SCRIPT_DIR' && source .venv/bin/activate && cd backend && export PYTHONPATH='$SCRIPT_DIR' && clear && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '🚀 BACKEND SERVER' && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '📍 API URL: http://localhost:$BACKEND_PORT' && echo '📍 API Docs: http://localhost:$BACKEND_PORT/docs' && echo '📍 Health: http://localhost:$BACKEND_PORT/api/health' && echo '' && echo 'Press Ctrl+C to stop' && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '' && uvicorn backend.server:app --host 0.0.0.0 --port $BACKEND_PORT --reload"
    set custom title of backendWindow to "Backend Server - Port $BACKEND_PORT"
end tell
EOF

# Wait a moment for backend to start
sleep 3

# Start Admin Panel in new Terminal window
echo -e "${YELLOW}📊 Starting Admin Panel in new window...${NC}"
osascript <<EOF
tell application "Terminal"
    activate
    set adminWindow to do script "cd '$SCRIPT_DIR/admin-panel' && '$SCRIPT_DIR/.venv/bin/python' enhanced-server.py"
    set custom title of adminWindow to "Admin Panel - Port 3000"
end tell
EOF

sleep 2

# Start Frontend in new Terminal window
echo -e "${YELLOW}📱 Starting Frontend Server in new window...${NC}"
osascript <<EOF
tell application "Terminal"
    activate
    set frontendWindow to do script "cd '$SCRIPT_DIR/frontend' && clear && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '🚀 FRONTEND SERVER (EXPO)' && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '📍 Scan QR code with Expo Go app' && echo '📍 Or press w for web version' && echo '' && echo 'Press Ctrl+C to stop' && echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' && echo '' && npm start"
    set custom title of frontendWindow to "Frontend Server - Expo"
end tell
EOF

echo ""
echo -e "${GREEN}✅ Both servers started in separate Terminal windows!${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   • Backend: http://localhost:$BACKEND_PORT"
echo "   • Frontend: Check Expo window for QR code"
echo "   • To stop: Press Ctrl+C in each window"
echo "   • Or run: ./stop.sh"
echo ""
