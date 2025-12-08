#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_PORT=8001
FRONTEND_PORTS=(8081 19000 19001 19002 19006)

echo -e "${YELLOW}🛑 Stopping Stock Verify Application...${NC}"

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)

    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}   Killing process on port $port (PID: $pid)...${NC}"
        kill -9 $pid 2>/dev/null
        return 0
    fi
    return 1
}

# Kill backend processes
echo -e "${GREEN}📦 Stopping Backend Server...${NC}"
if kill_port $BACKEND_PORT; then
    echo -e "${GREEN}   ✅ Backend stopped${NC}"
else
    echo -e "${YELLOW}   ℹ️  Backend not running${NC}"
fi

# Kill backend by process name
pkill -f "uvicorn.*backend.server" 2>/dev/null

# Kill frontend processes
echo -e "${GREEN}📱 Stopping Frontend Server...${NC}"
frontend_found=false
for port in "${FRONTEND_PORTS[@]}"; do
    if kill_port $port; then
        frontend_found=true
    fi
done

if [ "$frontend_found" = true ]; then
    echo -e "${GREEN}   ✅ Frontend stopped${NC}"
else
    echo -e "${YELLOW}   ℹ️  Frontend not running${NC}"
fi

# Kill frontend by process name
pkill -f "expo\|metro\|react-native" 2>/dev/null

# Wait a moment
sleep 1

# Verify all ports are free
echo -e "${GREEN}🔍 Verifying all ports are free...${NC}"
all_free=true

if lsof -ti :$BACKEND_PORT 2>/dev/null > /dev/null; then
    echo -e "${RED}   ⚠️  Port $BACKEND_PORT is still busy${NC}"
    all_free=false
fi

for port in "${FRONTEND_PORTS[@]}"; do
    if lsof -ti :$port 2>/dev/null > /dev/null; then
        echo -e "${RED}   ⚠️  Port $port is still busy${NC}"
        all_free=false
    fi
done

if [ "$all_free" = true ]; then
    echo -e "${GREEN}✅ All servers stopped successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Some ports may still be in use. You may need to manually kill processes.${NC}"
    echo -e "${YELLOW}   Run: lsof -ti :PORT | xargs kill -9${NC}"
fi
