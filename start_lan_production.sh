#!/bin/bash
# ============================================
# Stock Verify - LAN Production Start Script
# ============================================
# Usage: ./start_lan_production.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Stock Verify (LAN Production)${NC}"
echo "================================================"

# Get LAN IP
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")
echo -e "${YELLOW}📍 Your LAN IP: ${LAN_IP}${NC}"

# Check MongoDB
echo -n "Checking MongoDB... "
if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    echo "Starting MongoDB..."
    brew services start mongodb-community 2>/dev/null || sudo systemctl start mongod 2>/dev/null || echo "Please start MongoDB manually"
fi

# Navigate to project directory
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

# Check if backend .env.production exists
if [ ! -f "backend/.env.production" ]; then
    echo -e "${RED}Error: backend/.env.production not found${NC}"
    echo "Please create it first (see docs/LAN_DEPLOYMENT_PLAN.md)"
    exit 1
fi

# Export production environment
echo "Loading production environment..."
set -a
source backend/.env.production
set +a

# Kill any existing backend process
echo "Checking for existing backend processes..."
pkill -f "uvicorn backend.server:app" 2>/dev/null || true
sleep 1

# Start backend
echo -e "${GREEN}Starting backend server...${NC}"
cd backend
export PYTHONPATH=..
uvicorn backend.server:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# Verify backend is running
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend running on port 8001${NC}"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
    exit 1
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Stock Verify is running!${NC}"
echo "================================================"
echo ""
echo "📱 Mobile App Connection:"
echo "   Backend URL: http://${LAN_IP}:8001"
echo "   API URL:     http://${LAN_IP}:8001/api"
echo ""
echo "🔗 Quick Links:"
echo "   Health Check: http://${LAN_IP}:8001/api/health"
echo "   API Docs:     http://${LAN_IP}:8001/api/docs"
echo ""
echo "📋 To start frontend (in new terminal):"
echo "   cd frontend && npm start -- --lan"
echo ""
echo "🛑 To stop: pkill -f 'uvicorn backend.server:app'"
echo ""

# Keep script running
wait $BACKEND_PID
