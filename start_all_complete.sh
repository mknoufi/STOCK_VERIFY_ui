#!/bin/bash

# 🚀 STOCK VERIFICATION SYSTEM - COMPLETE STARTUP
# =================================================
# Starts all components of the Stock Verification System
# - Enhanced Admin Panel (Port 3000)
# - Backend API (Port 8001)
# - Frontend Development Server (Port 8081)

echo "🚀 STOCK VERIFICATION SYSTEM - COMPLETE STARTUP"
echo "================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}🔧 Stopping existing service on port $port (PID: $pid)${NC}"
        kill $pid 2>/dev/null
        sleep 2
    fi
}

# Check and prepare environment
echo -e "${BLUE}🔍 Checking environment...${NC}"

# Check Python virtual environment
if [ ! -f ".venv/bin/python" ]; then
    echo -e "${RED}❌ Python virtual environment not found${NC}"
    echo -e "${YELLOW}💡 Creating virtual environment...${NC}"
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.production.txt
else
    echo -e "${GREEN}✅ Python virtual environment found${NC}"
fi

# Check MongoDB
echo -e "${BLUE}🍃 Checking MongoDB...${NC}"
if pgrep mongod > /dev/null; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB not detected - attempting to start...${NC}"
    # Try to start MongoDB
    if command -v brew &> /dev/null && brew services list | grep mongodb &> /dev/null; then
        brew services start mongodb-community
        sleep 3
    elif command -v mongod &> /dev/null; then
        mongod --fork --logpath /tmp/mongod.log --dbpath /usr/local/var/mongodb
        sleep 3
    else
        echo -e "${RED}❌ MongoDB not found - please install and start MongoDB${NC}"
        exit 1
    fi
fi

# Clean up existing processes on our ports
echo -e "${BLUE}🧹 Cleaning up existing processes...${NC}"
chmod +x ensure_ports_free.sh
./ensure_ports_free.sh

# Wait for ports to be free
sleep 2

# Create log directory
mkdir -p logs

echo ""
echo -e "${PURPLE}🎯 Starting all services...${NC}"
echo ""

# 1. Start Enhanced Admin Panel (Port 3000)
echo -e "${CYAN}📊 Starting Enhanced Admin Panel...${NC}"
cd admin-panel
chmod +x ../start_admin.sh
nohup ../start_admin.sh > ../logs/admin-panel.log 2>&1 &
ADMIN_PID=$!
echo -e "${GREEN}✅ Admin Panel started (PID: $ADMIN_PID)${NC}"
echo -e "${BLUE}   📊 Dashboard: http://localhost:3000/dashboard.html${NC}"
echo -e "${BLUE}   🔧 Legacy: http://localhost:3000/index.html${NC}"
cd ..

sleep 3

# 2. Start Backend API (Port 8001)
echo -e "${CYAN}🔧 Starting Backend API...${NC}"
chmod +x start_backend_venv.sh
nohup ./start_backend_venv.sh > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend API started (PID: $BACKEND_PID)${NC}"
echo -e "${BLUE}   🌐 API: http://localhost:8001${NC}"
echo -e "${BLUE}   📚 Docs: http://localhost:8001/docs${NC}"

sleep 5

# 3. Start Frontend Development Server (Port 8081)
echo -e "${CYAN}📱 Starting Frontend Development Server...${NC}"
chmod +x start_frontend_expo.sh
nohup ./start_frontend_expo.sh > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${BLUE}   📱 Frontend: http://localhost:8081${NC}"

# Save PIDs for cleanup
echo "$ADMIN_PID" > logs/admin.pid
echo "$BACKEND_PID" > logs/backend.pid
echo "$FRONTEND_PID" > logs/frontend.pid

sleep 3

echo ""
echo -e "${GREEN}🎉 STOCK VERIFICATION SYSTEM STARTED SUCCESSFULLY!${NC}"
echo -e "${GREEN}===================================================${NC}"
echo ""
echo -e "${PURPLE}🔗 SERVICE URLS:${NC}"
echo -e "${CYAN}📊 Enhanced Admin Dashboard: http://localhost:3000/dashboard.html${NC}"
echo -e "${CYAN}🔧 Legacy Admin Panel:      http://localhost:3000/index.html${NC}"
echo -e "${CYAN}🌐 Backend API:             http://localhost:8001${NC}"
echo -e "${CYAN}📚 API Documentation:       http://localhost:8001/docs${NC}"
echo -e "${CYAN}📱 Frontend Web:            http://localhost:8081${NC}"
echo ""
echo -e "${PURPLE}📋 SERVICE STATUS:${NC}"
echo -e "${GREEN}✅ Enhanced Admin Panel (PID: $ADMIN_PID)${NC}"
echo -e "${GREEN}✅ Backend API Server (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}✅ Frontend Dev Server (PID: $FRONTEND_PID)${NC}"
echo ""
echo -e "${YELLOW}📝 LOGS:${NC}"
echo -e "${BLUE}   Admin Panel: tail -f logs/admin-panel.log${NC}"
echo -e "${BLUE}   Backend API: tail -f logs/backend.log${NC}"
echo -e "${BLUE}   Frontend:    tail -f logs/frontend.log${NC}"
echo ""
echo -e "${YELLOW}🛑 TO STOP ALL SERVICES:${NC}"
echo -e "${BLUE}   ./stop_all_services.sh${NC}"
echo -e "${BLUE}   OR: kill $ADMIN_PID $BACKEND_PID $FRONTEND_PID${NC}"
echo ""
echo -e "${PURPLE}🎯 Press Ctrl+C to stop all services${NC}"

# Wait for interrupt
trap 'echo -e "\n${YELLOW}🛑 Stopping all services...${NC}"; kill $ADMIN_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f logs/*.pid; echo -e "${GREEN}✅ All services stopped${NC}"; exit 0' INT

# Keep script running
echo -e "${BLUE}⏳ System running... (Press Ctrl+C to stop all services)${NC}"
wait
