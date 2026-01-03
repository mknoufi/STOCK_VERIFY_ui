#!/bin/bash

# Stock Verification System - Quick Status Check
# Usage: ./scripts/quick-status.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Stock Verification System - Quick Status Check     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Backend
echo -e "${BLUE}🔧 Backend API (Port 8001):${NC}"
if lsof -i :8001 | grep -q LISTEN; then
    PID=$(lsof -i :8001 | grep LISTEN | awk '{print $2}' | head -1)
    echo -e "${GREEN}✅ Running${NC} (PID: $PID)"

    # Health check
    if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health endpoint responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Health endpoint not responding${NC}"
    fi
else
    echo -e "${RED}❌ Stopped${NC}"
    echo "   To start: make backend"
fi
echo ""

# Check Frontend
echo -e "${BLUE}📱 Frontend (Expo Metro):${NC}"
if lsof -i :8081 | grep -q LISTEN; then
    PID=$(lsof -i :8081 | grep LISTEN | awk '{print $2}' | head -1)
    echo -e "${GREEN}✅ Running${NC} (PID: $PID) on port 8081"
    # Also check if web dev server is on 19006
    if lsof -i :19006 | grep -q LISTEN; then
        echo -e "${GREEN}✅ Web server on port 19006${NC}"
    fi
else
    echo -e "${RED}❌ Stopped${NC}"
    echo "   To start: make frontend (or: cd frontend && npx expo start)"
fi
echo ""

# Check MongoDB
echo -e "${BLUE}🍃 MongoDB (Port 27017):${NC}"
if pgrep -x mongod > /dev/null; then
    PID=$(pgrep -x mongod)
    echo -e "${GREEN}✅ Running${NC} (PID: $PID)"
else
    echo -e "${RED}❌ Stopped${NC}"
    echo "   To start: brew services start mongodb-community"
fi
echo ""

# Check Admin Panel
echo -e "${BLUE}📊 Admin Panel (Port 3000):${NC}"
if lsof -i :3000 | grep -q LISTEN; then
    PID=$(lsof -i :3000 | grep LISTEN | awk '{print $2}' | head -1)
    echo -e "${GREEN}✅ Running${NC} (PID: $PID)"
else
    echo -e "${YELLOW}⚠️  Stopped${NC} (optional service)"
fi
echo ""

# Check Virtual Environment
echo -e "${BLUE}🐍 Python Environment:${NC}"
if [ -d ".venv" ]; then
    echo -e "${GREEN}✅ Virtual environment exists${NC}"
    if [ -n "$VIRTUAL_ENV" ]; then
        echo -e "${GREEN}✅ Virtual environment activated${NC}"
    else
        echo -e "${YELLOW}⚠️  Virtual environment not activated${NC}"
        echo "   To activate: source .venv/bin/activate"
    fi
else
    echo -e "${RED}❌ Virtual environment not found${NC}"
    echo "   To create: python3 -m venv .venv"
fi
echo ""

# Quick Git Status
echo -e "${BLUE}🔄 Git Status:${NC}"
BRANCH=$(git branch --show-current)
echo "   Branch: $BRANCH"
CHANGES=$(git status --short | wc -l | xargs)
if [ "$CHANGES" -eq 0 ]; then
    echo -e "${GREEN}   ✅ Working tree clean${NC}"
else
    echo -e "${YELLOW}   ⚠️  $CHANGES uncommitted changes${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Quick Actions                                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Start all services:     make start"
echo "  Run all tests:          make test"
echo "  Run CI checks:          make ci"
echo "  Format code:            make format"
echo "  View logs:              tail -f logs/*.log"
echo "  Full diagnostic:        ./scripts/production_readiness_checklist.sh"
echo ""
