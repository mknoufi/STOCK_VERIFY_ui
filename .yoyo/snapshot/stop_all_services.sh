#!/bin/bash

# 🛑 STOCK VERIFICATION SYSTEM - GRACEFUL SHUTDOWN
# ================================================
# Stops all components of the Stock Verification System

echo "🛑 STOCK VERIFICATION SYSTEM - GRACEFUL SHUTDOWN"
echo "================================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to kill process on port
kill_port() {
    local port=$1
    local service_name=$2
    local pid=$(lsof -ti:$port 2>/dev/null)

    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}🔧 Stopping $service_name (Port $port, PID: $pid)${NC}"
        kill $pid 2>/dev/null
        sleep 2

        # Force kill if still running
        if kill -0 $pid 2>/dev/null; then
            echo -e "${RED}⚠️  Force killing $service_name${NC}"
            kill -9 $pid 2>/dev/null
        fi

        echo -e "${GREEN}✅ $service_name stopped${NC}"
    else
        echo -e "${BLUE}ℹ️  $service_name not running on port $port${NC}"
    fi
}

# Function to kill by PID file
kill_by_pid_file() {
    local pid_file=$1
    local service_name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${YELLOW}🔧 Stopping $service_name (PID: $pid)${NC}"
            kill $pid 2>/dev/null
            sleep 2

            # Force kill if still running
            if kill -0 $pid 2>/dev/null; then
                echo -e "${RED}⚠️  Force killing $service_name${NC}"
                kill -9 $pid 2>/dev/null
            fi

            echo -e "${GREEN}✅ $service_name stopped${NC}"
        else
            echo -e "${BLUE}ℹ️  $service_name process not found${NC}"
        fi

        rm -f "$pid_file"
    else
        echo -e "${BLUE}ℹ️  No PID file found for $service_name${NC}"
    fi
}

echo -e "${BLUE}🔍 Stopping services...${NC}"
echo ""

# Stop by PID files first (if they exist)
if [ -d "logs" ]; then
    kill_by_pid_file "logs/admin.pid" "Enhanced Admin Panel"
    kill_by_pid_file "logs/backend.pid" "Backend API Server"
    kill_by_pid_file "logs/frontend.pid" "Frontend Dev Server"
fi

echo ""
echo -e "${BLUE}🔍 Checking ports for remaining processes...${NC}"

# Stop by ports (fallback)
kill_port 3000 "Admin Panel"
kill_port 8001 "Backend API"
kill_port 8081 "Frontend Server"

# Clean up any remaining processes
echo ""
echo -e "${BLUE}🧹 Cleaning up remaining processes...${NC}"

# Kill any remaining Python processes from our project
pkill -f "enhanced-server.py" 2>/dev/null
pkill -f "server.py" 2>/dev/null
pkill -f "expo start" 2>/dev/null

# Remove log directory if empty
if [ -d "logs" ] && [ -z "$(ls -A logs)" ]; then
    rmdir logs
fi

echo ""
echo -e "${GREEN}✅ STOCK VERIFICATION SYSTEM STOPPED${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${BLUE}📝 All services have been gracefully stopped${NC}"
echo -e "${BLUE}🔄 You can restart with: ./start_all_complete.sh${NC}"
echo ""
