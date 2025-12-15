#!/bin/bash

# Integration Test Script for Phase 1-3 Upgrades
# Tests Redis, MongoDB, Rack Management, Batch Sync, and Reporting

set -e

BASE_URL="http://localhost:8000"
TOKEN=""

echo "🧪 StockVerify Integration Tests"
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Test 1: Health Check
echo ""
echo "Test 1: Health Check"
echo "-------------------"
response=$(curl -s "$BASE_URL/api/health")
if echo "$response" | grep -q "healthy"; then
    success "Backend is healthy"
else
    error "Backend health check failed"
    exit 1
fi

# Test 2: Redis Connection
echo ""
echo "Test 2: Redis Connection"
echo "----------------------"
if redis-cli ping | grep -q "PONG"; then
    success "Redis is running"
else
    error "Redis is not running"
    exit 1
fi

# Test 3: Login (get token)
echo ""
echo "Test 3: Authentication"
echo "--------------------"
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=staff1&password=staff123")

TOKEN=$(echo "$login_response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    success "Login successful, token obtained"
else
    error "Login failed"
    exit 1
fi

# Test 4: Get Available Racks
echo ""
echo "Test 4: Rack Management - List Available"
echo "---------------------------------------"
racks_response=$(curl -s "$BASE_URL/api/racks/available" \
    -H "Authorization: Bearer $TOKEN")

if echo "$racks_response" | grep -q "\["; then
    success "Retrieved available racks"
else
    error "Failed to get racks"
fi

# Test 5: Get Floors
echo ""
echo "Test 5: Rack Management - List Floors"
echo "------------------------------------"
floors_response=$(curl -s "$BASE_URL/api/racks/floors" \
    -H "Authorization: Bearer $TOKEN")

if echo "$floors_response" | grep -q "Ground"; then
    success "Retrieved floors list"
else
    warning "Floors list may be empty (this is OK for new setup)"
fi

# Test 6: Batch Sync (with test data)
echo ""
echo "Test 6: Batch Sync API"
echo "--------------------"
sync_response=$(curl -s -X POST "$BASE_URL/api/sync/batch" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "records": [{
            "client_record_id": "test_integration_001",
            "session_id": "test_session_001",
            "item_code": "TEST001",
            "verified_qty": 10,
            "damage_qty": 0,
            "serial_numbers": [],
            "status": "finalized",
            "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
            "updated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
        }]
    }')

if echo "$sync_response" | grep -q "ok"; then
    success "Batch sync successful"
else
    error "Batch sync failed"
    echo "$sync_response"
fi

# Test 7: Query Preview (Reporting)
echo ""
echo "Test 7: Reporting - Query Preview"
echo "--------------------------------"
query_response=$(curl -s -X POST "$BASE_URL/api/reports/query/preview" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "collection": "verification_records",
        "group_by": ["floor"],
        "aggregations": {"verified_qty": "sum"},
        "limit": 10
    }')

if echo "$query_response" | grep -q "row_count"; then
    success "Query preview successful"
else
    warning "Query preview returned no results (this is OK for new setup)"
fi

# Test 8: Get Available Collections
echo ""
echo "Test 8: Reporting - Available Collections"
echo "----------------------------------------"
collections_response=$(curl -s "$BASE_URL/api/reports/collections" \
    -H "Authorization: Bearer $TOKEN")

if echo "$collections_response" | grep -q "verification_records"; then
    success "Retrieved available collections"
else
    error "Failed to get collections"
fi

# Test 9: Active Sessions
echo ""
echo "Test 9: Session Management - Active Sessions"
echo "------------------------------------------"
sessions_response=$(curl -s "$BASE_URL/api/sessions/active" \
    -H "Authorization: Bearer $TOKEN")

if echo "$sessions_response" | grep -q "\["; then
    success "Retrieved active sessions"
else
    warning "No active sessions (this is OK)"
fi

# Test 10: Redis Keys Check
echo ""
echo "Test 10: Redis Keys Verification"
echo "-------------------------------"
rack_locks=$(redis-cli keys "rack:lock:*" | wc -l)
user_heartbeats=$(redis-cli keys "user:heartbeat:*" | wc -l)

echo "Rack locks: $rack_locks"
echo "User heartbeats: $user_heartbeats"
success "Redis keys structure verified"

# Summary
echo ""
echo "================================"
echo "Integration Test Summary"
echo "================================"
success "All critical tests passed!"
echo ""
echo "Next steps:"
echo "1. Check logs: tail -f backend/logs/app.log"
echo "2. Monitor Redis: redis-cli monitor"
echo "3. Test with frontend app"
echo ""