#!/bin/bash

# 🧹 PORT CLEANUP UTILITY
# =======================
# Ensures all necessary ports are free before startup

echo "🧹 Checking and freeing ports..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# List of ports to check
# 8000/8001: Backend
# 3000: Admin Panel / Frontend
# 8081: Metro Bundler
# 19000-19006: Expo legacy ports
PORTS=(8000 8001 3000 8081 19000 19001 19002 19006)

kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)

    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}⚠️  Port $port is in use by PID $pid. Killing...${NC}"
        kill -9 $pid 2>/dev/null
        echo -e "${GREEN}✅ Port $port freed.${NC}"
    else
        echo -e "${GREEN}✅ Port $port is free.${NC}"
    fi
}

for port in "${PORTS[@]}"; do
    kill_port $port
done

# Also kill any lingering node/python processes related to our app
echo "🧹 Cleaning up lingering processes..."
pkill -f "enhanced-server.py" 2>/dev/null
pkill -f "server.py" 2>/dev/null
pkill -f "expo start" 2>/dev/null
pkill -f "react-native" 2>/dev/null

echo -e "${GREEN}✨ All ports are clear and ready for startup!${NC}"
