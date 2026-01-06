#!/bin/bash
# Production Deployment Script
# Stock Verify v2.1 - Quick Deploy

set -e

echo "🚀 Stock Verify - Production Deployment"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Step 1: Checking Prerequisites${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker installed${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose installed${NC}"

# Check environment file
echo -e "\n${YELLOW}Step 2: Checking Environment Configuration${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found. Creating from template...${NC}"
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example .env.production
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.production with your production values before continuing!${NC}"
        echo -e "${YELLOW}   Required values: JWT_SECRET, JWT_REFRESH_SECRET, MONGO_URL, SQL_SERVER credentials${NC}"
        read -p "Press Enter after editing .env.production..."
    else
        echo -e "${RED}❌ Template file backend/.env.example not found${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Environment file exists${NC}"

# Check SSL certificates (optional)
echo -e "\n${YELLOW}Step 3: Checking SSL Certificates (Optional)${NC}"

if [ ! -d "nginx/ssl" ]; then
    echo -e "${YELLOW}⚠️  SSL certificates not found. Creating directory...${NC}"
    mkdir -p nginx/ssl
    echo -e "${YELLOW}   To enable HTTPS, place your certificates in nginx/ssl/${NC}"
    echo -e "${YELLOW}   - nginx/ssl/cert.pem${NC}"
    echo -e "${YELLOW}   - nginx/ssl/key.pem${NC}"
fi

# Build and deploy
echo -e "\n${YELLOW}Step 4: Building Docker Images${NC}"

docker-compose -f docker-compose.prod.yml build

echo -e "${GREEN}✅ Images built successfully${NC}"

# Deploy
echo -e "\n${YELLOW}Step 5: Starting Services${NC}"

docker-compose -f docker-compose.prod.yml up -d

echo -e "${GREEN}✅ Services started${NC}"

# Wait for services to be ready
echo -e "\n${YELLOW}Step 6: Waiting for Services to Initialize${NC}"

BACKEND_READY=false
MAX_ATTEMPTS=30
ATTEMPT=0

while [ "$BACKEND_READY" = false ] && [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo -e "   Attempt $ATTEMPT/$MAX_ATTEMPTS..."

    if curl -s http://localhost/api/health > /dev/null 2>&1; then
        BACKEND_READY=true
        echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
        sleep 2
    fi
done

if [ "$BACKEND_READY" = false ]; then
    echo -e "${RED}❌ Backend failed to start. Check logs: docker-compose -f docker-compose.prod.yml logs backend${NC}"
    exit 1
fi

# Verification
echo -e "\n${YELLOW}Step 7: Verification${NC}"

echo -e "\n📊 Deployment Status:"
docker-compose -f docker-compose.prod.yml ps

echo -e "\n${GREEN}✅ Deployment Complete!${NC}"
echo -e "\n📝 Access Points:"
echo -e "   Backend API: http://localhost/api"
echo -e "   API Docs: http://localhost/api/docs"
echo -e "   Health Check: http://localhost/api/health"

echo -e "\n🔍 Useful Commands:"
echo -e "   View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo -e "   Stop services: docker-compose -f docker-compose.prod.yml down"
echo -e "   Restart: docker-compose -f docker-compose.prod.yml restart"

echo -e "\n⚠️  Next Steps:"
echo -e "   1. Configure your domain DNS to point to this server"
echo -e "   2. Setup SSL certificates in nginx/ssl/"
echo -e "   3. Configure monitoring (see docs/PRODUCTION_DEPLOYMENT_GUIDE.md)"
echo -e "   4. Setup backups (see docs/PRODUCTION_DEPLOYMENT_GUIDE.md)"
echo -e "   5. Test with mobile app by updating EXPO_PUBLIC_BACKEND_URL"

echo -e "\n${GREEN}🎉 Happy deploying!${NC}"
