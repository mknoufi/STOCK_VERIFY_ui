#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8001
FRONTEND_PORTS=(8081 19000 19001 19002 19006)

echo -e "${GREEN}🚀 Starting Stock Verify Application...${NC}"

# Function to check and kill process on port
check_and_kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}⚠️  Port $port is busy (PID: $pid)${NC}"
        read -p "Kill process on port $port? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $pid 2>/dev/null
            sleep 1
            echo -e "${GREEN}✅ Process killed on port $port${NC}"
            return 0
        else
            echo -e "${RED}❌ Port $port is still busy. Exiting...${NC}"
            return 1
        fi
    fi
    return 0
}

# Check backend port
if ! check_and_kill_port $BACKEND_PORT; then
    exit 1
fi

# Check frontend ports
for port in "${FRONTEND_PORTS[@]}"; do
    if ! check_and_kill_port $port; then
        exit 1
    fi
done

# Kill any existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
pkill -f "uvicorn.*backend.server" 2>/dev/null
pkill -f "expo\|metro" 2>/dev/null
sleep 2

# Start Backend in new Terminal window
echo -e "${GREEN}📦 Starting Backend Server...${NC}"
osascript <<EOF
tell application "Terminal"
    activate
    set backendWindow to do script "cd '$SCRIPT_DIR/backend' && export PYTHONPATH='$SCRIPT_DIR' && echo '🚀 Backend Server (Port $BACKEND_PORT)' && echo '📍 API: http://localhost:$BACKEND_PORT' && echo 'Press Ctrl+C to stop' && echo '' && uvicorn backend.server:app --host 0.0.0.0 --port $BACKEND_PORT --reload"
    set custom title of backendWindow to "Backend Server"
end tell
EOF

# Wait a moment for backend to start
sleep 3

# Start Frontend in new Terminal window
echo -e "${GREEN}📱 Starting Frontend Server...${NC}"
osascript <<EOF
tell application "Terminal"
    activate
    set frontendWindow to do script "cd '$SCRIPT_DIR/frontend' && echo '🚀 Frontend Server (Expo)' && echo 'Press Ctrl+C to stop' && echo '' && npm start"
    set custom title of frontendWindow to "Frontend Server"
end tell
EOF

echo -e "${GREEN}✅ Both servers started in separate Terminal windows!${NC}"
echo -e "${YELLOW}💡 To stop servers, run: ./stop.sh${NC}"

