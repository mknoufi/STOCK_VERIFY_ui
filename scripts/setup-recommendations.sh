#!/bin/bash

# Stock Verification System - Setup Recommendations Implementation
# This script implements the key recommendations from the diagnostic report

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Implementing System Recommendations                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Create logs directory
echo -e "${BLUE}[1/6]${NC} Creating logs directory..."
mkdir -p logs
echo -e "${GREEN}✅ Logs directory created${NC}"
echo ""

# 2. Setup virtual environment
echo -e "${BLUE}[2/6]${NC} Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${YELLOW}⚠️  Virtual environment already exists${NC}"
fi

# Activate and install dependencies
source .venv/bin/activate
echo -e "${BLUE}Installing Python dependencies...${NC}"
cd backend && pip install -q -r requirements.txt && cd ..
echo -e "${GREEN}✅ Python dependencies installed${NC}"
echo ""

# 3. Install ruff linter
echo -e "${BLUE}[3/6]${NC} Installing Python linter (ruff)..."
pip install -q ruff
echo -e "${GREEN}✅ Ruff linter installed${NC}"
echo ""

# 4. Install frontend dependencies
echo -e "${BLUE}[4/6]${NC} Installing frontend dependencies..."
cd frontend && npm install --silent
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
cd ..
echo ""

# 5. Check MongoDB status
echo -e "${BLUE}[5/6]${NC} Checking MongoDB status..."
if pgrep -x mongod > /dev/null; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB is not running${NC}"
    echo "   Start with: brew services start mongodb-community"
fi
echo ""

# 6. Create .env if not exists
echo -e "${BLUE}[6/6]${NC} Checking environment configuration..."
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env not found${NC}"
    echo "   Create one based on backend/.env.example"
else
    echo -e "${GREEN}✅ backend/.env exists${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Setup Complete                                      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ All recommendations implemented!${NC}"
echo ""
echo "Next steps:"
echo "  1. Activate virtual environment: source .venv/bin/activate"
echo "  2. Start services: make start"
echo "  3. Run tests: make test"
echo "  4. Check status: ./scripts/quick-status.sh"
echo ""
