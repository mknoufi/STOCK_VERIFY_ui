#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8001
FRONTEND_PORT=8081
ADMIN_PORT=5173 # Default Vite port

echo -e "${GREEN}🚀 Starting All Stock Verify Services...${NC}"

# Function to check and kill process on port
check_and_kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)

    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}⚠️  Port $port is busy (PID: $pid). Killing...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Clean up ports automatically
check_and_kill_port $BACKEND_PORT
check_and_kill_port $FRONTEND_PORT
# Admin port might vary, but let's try to clean default
check_and_kill_port $ADMIN_PORT

# Start Backend
echo -e "${GREEN}📦 Starting Backend Server...${NC}"
osascript <<EOF
tell application "Terminal"
    do script "cd '$SCRIPT_DIR/backend' && export PYTHONPATH='$SCRIPT_DIR' && echo '🚀 Backend Server' && uvicorn backend.server:app --host 0.0.0.0 --port $BACKEND_PORT --reload"
end tell
EOF

sleep 2

# Start Frontend
echo -e "${GREEN}📱 Starting Frontend (Expo)...${NC}"
osascript <<EOF
tell application "Terminal"
    do script "cd '$SCRIPT_DIR/frontend' && echo '🚀 Frontend Server' && npm start"
end tell
EOF

sleep 2

# Start Admin Panel
echo -e "${GREEN}📊 Starting Admin Panel...${NC}"
osascript <<EOF
tell application "Terminal"
    do script "cd '$SCRIPT_DIR/admin-panel' && echo '🚀 Admin Panel' && npm run dev"
end tell
EOF

echo -e "${GREEN}✅ All services launched in separate windows!${NC}"
