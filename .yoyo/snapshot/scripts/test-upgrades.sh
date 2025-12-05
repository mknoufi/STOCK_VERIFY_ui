#!/bin/bash
# Test Upgrades Script
# Runs comprehensive tests for all upgrades

set -e

echo "🧪 Testing All Upgrades"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test and track results
run_test() {
    local test_name=$1
    local test_command=$2

    echo -n "Testing $test_name... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo -e "${RED}Error: backend directory not found${NC}"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}Error: frontend directory not found${NC}"
    exit 1
fi

echo "1. Testing Enhanced Connection Pool..."
echo "----------------------------------------"
cd backend
run_test "Enhanced Connection Pool" "python -m pytest tests/test_enhanced_connection_pool.py -v --tb=short"
cd ..

echo ""
echo "2. Testing API v2 Endpoints..."
echo "--------------------------------"
cd backend
run_test "API v2 Endpoints" "python -m pytest tests/test_api_v2.py -v --tb=short"
cd ..

echo ""
echo "3. Checking Backend Files..."
echo "----------------------------"
run_test "Enhanced Connection Pool File" "test -f backend/services/enhanced_connection_pool.py"
run_test "API v2 Router" "test -f backend/api/v2/__init__.py"
run_test "Response Models" "test -f backend/api/response_models.py"
run_test "Metrics Endpoint" "test -f backend/api/v2/metrics.py"

echo ""
echo "4. Checking Frontend Files..."
echo "-----------------------------"
run_test "Enhanced API Client" "test -f frontend/services/enhancedApiClient.ts"
run_test "Request Deduplication" "test -f frontend/services/requestDeduplication.ts"
run_test "API Types" "test -f frontend/types/api.ts"
run_test "Optimized ItemDisplay" "test -f frontend/components/scan/ItemDisplay.tsx"
run_test "Optimized QuantityInputForm" "test -f frontend/components/scan/QuantityInputForm.tsx"

echo ""
echo "5. Checking Documentation..."
echo "----------------------------"
run_test "Upgrade Summary" "test -f UPGRADE_COMPLETE_SUMMARY.md"
run_test "API Upgrade Summary" "test -f API_BACKEND_UPGRADE_SUMMARY.md"
run_test "Suggestions" "test -f SUGGESTIONS.md"
run_test "Next Steps" "test -f NEXT_STEPS.md"

echo ""
echo "========================"
echo "Test Results Summary"
echo "========================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
