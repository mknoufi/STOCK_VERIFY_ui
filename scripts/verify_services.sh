#!/bin/bash
# Verify All Services Are Running

echo "🔍 Verifying Services Status..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check MongoDB
echo "1. MongoDB:"
if pgrep -x "mongod" > /dev/null; then
    MONGODB_PID=$(pgrep -x mongod)
    echo -e "   ${GREEN}✅ Running${NC} (PID: $MONGODB_PID)"

    # Try to connect
    if command -v mongo > /dev/null || command -v mongosh > /dev/null; then
        echo "   📊 Connection: Testing..."
        if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1 || mongo --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
            echo -e "   ${GREEN}✅ Connected${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Process running but connection failed${NC}"
        fi
    fi
else
    echo -e "   ${RED}❌ Not Running${NC}"
fi

echo ""

# Check Backend
echo "2. Backend (Python/FastAPI):"
BACKEND_PID=$(pgrep -f "python.*server.py")
if [ -n "$BACKEND_PID" ]; then
    echo -e "   ${GREEN}✅ Running${NC} (PID: $BACKEND_PID)"

    # Check port 8000 or 8001
    BACKEND_PORT=""
    if lsof -ti:8000 > /dev/null 2>&1; then
        BACKEND_PORT="8000"
    elif lsof -ti:8001 > /dev/null 2>&1; then
        BACKEND_PORT="8001"
    fi

    if [ -n "$BACKEND_PORT" ]; then
        echo "   📍 Port: $BACKEND_PORT"
        echo "   🔗 Testing connection..."

        # Try to connect
        if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
            echo -e "   ${GREEN}✅ API Responding${NC}"
            echo "   🌐 URL: http://localhost:$BACKEND_PORT"
        else
            echo -e "   ${YELLOW}⚠️  Process running but API not responding${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️  Process running but no port detected${NC}"
    fi
else
    echo -e "   ${RED}❌ Not Running${NC}"
fi

echo ""

# Check Frontend
echo "3. Frontend (Expo):"
FRONTEND_PID=$(pgrep -f "expo start")
if [ -n "$FRONTEND_PID" ]; then
    echo -e "   ${GREEN}✅ Running${NC} (PID: $FRONTEND_PID)"

    # Check Expo ports
    EXPO_PORT=""
    if lsof -ti:19000 > /dev/null 2>&1; then
        EXPO_PORT="19000"
    elif lsof -ti:19001 > /dev/null 2>&1; then
        EXPO_PORT="19001"
    fi

    if [ -n "$EXPO_PORT" ]; then
        echo "   📍 Metro Port: $EXPO_PORT"
    fi

    # Check web port
    if lsof -ti:8081 > /dev/null 2>&1; then
        echo "   🌐 Web Port: 8081"
        echo "   🔗 URL: http://localhost:8081"
    fi

    echo "   📱 Scan QR code in Expo Go app"
else
    echo -e "   ${RED}❌ Not Running${NC}"
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo ""

MONGODB_STATUS=$([ -n "$(pgrep -x mongod)" ] && echo "✅" || echo "❌")
BACKEND_STATUS=$([ -n "$BACKEND_PID" ] && echo "✅" || echo "❌")
FRONTEND_STATUS=$([ -n "$FRONTEND_PID" ] && echo "✅" || echo "❌")

echo "   MongoDB:  $MONGODB_STATUS"
echo "   Backend:  $BACKEND_STATUS"
echo "   Frontend: $FRONTEND_STATUS"
echo ""

if [ -n "$(pgrep -x mongod)" ] && [ -n "$BACKEND_PID" ] && [ -n "$FRONTEND_PID" ]; then
    echo -e "${GREEN}✅ All services are running!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some services are not running${NC}"
    exit 1
fi
