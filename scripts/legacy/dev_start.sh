#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Stock Verify Development Environment...${NC}"

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local name=$2

    echo -e "${YELLOW}Checking port $port ($name)...${NC}"

    # Find PID using lsof
    local pid=$(lsof -t -i:$port)

    if [ -n "$pid" ]; then
        echo -e "${RED}Killing existing process on port $port (PID: $pid)${NC}"
        kill -9 $pid
        sleep 1
    else
        echo -e "${GREEN}Port $port is free.${NC}"
    fi
}

# Cleanup ports
kill_port 8000 "Backend"
kill_port 8081 "Frontend"

# Trap Ctrl+C to kill child processes
trap 'kill 0' SIGINT

# Start Backend
echo -e "${GREEN}🚀 Starting Backend (FastAPI)...${NC}"
# Activate venv if it exists (adjust path as needed)
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi
uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start Frontend
echo -e "${GREEN}🚀 Starting Frontend (Expo)...${NC}"
cd frontend
npx expo start

# Cleanup when frontend exits
kill $BACKEND_PID
