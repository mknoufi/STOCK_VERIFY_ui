#!/bin/bash

# Stock Verification System - Final System Validation Script
# This script performs comprehensive end-to-end testing to validate all components work together

set -e  # Exit on any error
chmod +x "$0" 2>/dev/null || true  # Ensure script is executable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8000"
ADMIN_PANEL_URL="http://localhost:3000"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-test@example.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-testpassword123}"
# SECURITY: Use environment variable for test password in production
# Set TEST_USER_PASSWORD environment variable to override default
VALIDATION_LOG="/tmp/system_validation.log"

echo -e "${BLUE}🚀 Stock Verification System - Final System Validation${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo "Starting comprehensive end-to-end system validation..."
echo "Log file: $VALIDATION_LOG"
echo ""

# Initialize log file
cat > "$VALIDATION_LOG" << EOF
Stock Verification System - Final System Validation
Date: $(date)
====================================================

EOF

# Function to log messages
log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$VALIDATION_LOG"

    case "$level" in
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
    esac
}

# Function to check if service is running
check_service() {
    local service_name="$1"
    local port="$2"
    local url="$3"

    log_message "INFO" "Checking $service_name service on port $port..."

    if netstat -tuln | grep -q ":$port "; then
        log_message "SUCCESS" "$service_name is running on port $port"

        if [ -n "$url" ]; then
            if curl -s -f "$url" > /dev/null; then
                log_message "SUCCESS" "$service_name is responding to HTTP requests"
                return 0
            else
                log_message "ERROR" "$service_name is not responding to HTTP requests"
                return 1
            fi
        fi
        return 0
    else
        log_message "ERROR" "$service_name is not running on port $port"
        return 1
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local data="$4"
    local headers="$5"

    log_message "INFO" "Testing $method $endpoint"

    local curl_cmd="curl -s -w '%{http_code}' -o /tmp/api_response.json"

    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd -H '$headers'"
    fi

    if [ -n "$data" ] && [ "$method" != "GET" ]; then
        curl_cmd="$curl_cmd -X $method -d '$data' -H 'Content-Type: application/json'"
    else
        curl_cmd="$curl_cmd -X $method"
    fi

    curl_cmd="$curl_cmd '$BACKEND_URL$endpoint'"

    local response_code=$(eval $curl_cmd)

    if [ "$response_code" = "$expected_status" ]; then
        log_message "SUCCESS" "$method $endpoint returned expected status $expected_status"
        return 0
    else
        log_message "ERROR" "$method $endpoint returned $response_code, expected $expected_status"
        return 1
    fi
}

# Function to validate database connection
validate_database() {
    log_message "INFO" "Validating database connection..."

    # Test MongoDB connection
    if command -v mongo >/dev/null 2>&1; then
        if mongo --eval "db.runCommand('ping')" --quiet stock_verification >/dev/null 2>&1; then
            log_message "SUCCESS" "MongoDB connection successful"

            # Check collections
            local collections=$(mongo stock_verification --eval "db.getCollectionNames()" --quiet)
            if echo "$collections" | grep -q "items\|users\|verifications"; then
                log_message "SUCCESS" "Required database collections exist"
            else
                log_message "WARNING" "Some database collections may be missing"
            fi
        else
            log_message "ERROR" "MongoDB connection failed"
            return 1
        fi
    else
        log_message "WARNING" "MongoDB client not available for testing"
    fi

    return 0
}

# Function to validate Redis connection
validate_redis() {
    log_message "INFO" "Validating Redis connection..."

    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping | grep -q "PONG"; then
            log_message "SUCCESS" "Redis connection successful"
        else
            log_message "ERROR" "Redis connection failed"
            return 1
        fi
    else
        log_message "WARNING" "Redis client not available for testing"
    fi

    return 0
}

# Function to perform authentication test
test_authentication() {
    log_message "INFO" "Testing authentication workflow..."

    # Test user registration (if endpoint exists)
    test_api_endpoint "POST" "/auth/register" "201" "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\",\"role\":\"staff\"}" || true

    # Test user login
    if test_api_endpoint "POST" "/auth/login" "200" "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}"; then
        # Extract token from response
        local token=$(cat /tmp/api_response.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

        if [ -n "$token" ]; then
            log_message "SUCCESS" "Authentication successful, token received"

            # Test authenticated endpoint
            if test_api_endpoint "GET" "/auth/me" "200" "" "Authorization: Bearer $token"; then
                log_message "SUCCESS" "Authenticated API access working"
            else
                log_message "ERROR" "Authenticated API access failed"
                return 1
            fi
        else
            log_message "ERROR" "No authentication token received"
            return 1
        fi
    else
        log_message "ERROR" "Authentication failed"
        return 1
    fi

    return 0
}

# Function to test item management workflow
test_item_management() {
    log_message "INFO" "Testing item management workflow..."

    # Get auth token first
    local auth_response=$(curl -s -X POST "$BACKEND_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}")

    local token=$(echo "$auth_response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

    if [ -z "$token" ]; then
        log_message "ERROR" "Could not get authentication token for item management test"
        return 1
    fi

    local auth_header="Authorization: Bearer $token"

    # Test getting items list
    if test_api_endpoint "GET" "/items" "200" "" "$auth_header"; then
        log_message "SUCCESS" "Items list retrieval working"
    else
        log_message "ERROR" "Items list retrieval failed"
        return 1
    fi

    # Test creating a new item
    local test_item="{\"barcode\":\"TEST123456\",\"name\":\"Test Item\",\"category\":\"Electronics\",\"location\":\"A1-B2\",\"quantity\":10,\"unit_price\":29.99}"

    if test_api_endpoint "POST" "/items" "201" "$test_item" "$auth_header"; then
        log_message "SUCCESS" "Item creation working"

        # Extract created item ID
        local item_id=$(cat /tmp/api_response.json | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || echo "")

        if [ -n "$item_id" ]; then
            # Test updating the item
            local updated_item="{\"name\":\"Updated Test Item\",\"quantity\":15}"
            if test_api_endpoint "PUT" "/items/$item_id" "200" "$updated_item" "$auth_header"; then
                log_message "SUCCESS" "Item update working"
            else
                log_message "ERROR" "Item update failed"
            fi

            # Test item verification
            local verification_data="{\"item_id\":\"$item_id\",\"verified_quantity\":15,\"notes\":\"Test verification\"}"
            if test_api_endpoint "POST" "/verifications" "201" "$verification_data" "$auth_header"; then
                log_message "SUCCESS" "Item verification working"
            else
                log_message "ERROR" "Item verification failed"
            fi

            # Clean up - delete test item
            test_api_endpoint "DELETE" "/items/$item_id" "204" "" "$auth_header" || true
        fi
    else
        log_message "ERROR" "Item creation failed"
        return 1
    fi

    return 0
}

# Function to test performance benchmarks
test_performance() {
    log_message "INFO" "Running performance benchmarks..."

    # Test API response time
    local start_time=$(date +%s.%N)
    curl -s "$BACKEND_URL/health" > /dev/null
    local end_time=$(date +%s.%N)
    local response_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")

    if (( $(echo "$response_time < 2.0" | bc -l 2>/dev/null) )); then
        log_message "SUCCESS" "API response time: ${response_time}s (< 2.0s target)"
    else
        log_message "WARNING" "API response time: ${response_time}s (exceeds 2.0s target)"
    fi

    # Test concurrent requests
    log_message "INFO" "Testing concurrent request handling..."

    local concurrent_test_script="/tmp/concurrent_test.sh"
    cat > "$concurrent_test_script" << 'EOF'
#!/bin/bash
for i in {1..10}; do
    curl -s "http://localhost:8000/health" > /dev/null &
done
wait
EOF
    chmod +x "$concurrent_test_script"

    local concurrent_start=$(date +%s.%N)
    bash "$concurrent_test_script"
    local concurrent_end=$(date +%s.%N)
    local concurrent_time=$(echo "$concurrent_end - $concurrent_start" | bc -l 2>/dev/null || echo "0")

    if (( $(echo "$concurrent_time < 5.0" | bc -l 2>/dev/null) )); then
        log_message "SUCCESS" "Concurrent requests completed in ${concurrent_time}s"
    else
        log_message "WARNING" "Concurrent requests took ${concurrent_time}s (may indicate performance issues)"
    fi

    rm -f "$concurrent_test_script"
    return 0
}

# Function to validate system configuration
validate_configuration() {
    log_message "INFO" "Validating system configuration..."

    # Check environment files
    if [ -f "backend/.env" ]; then
        log_message "SUCCESS" "Backend environment configuration found"

        # Check for required environment variables
        local required_vars=("MONGODB_URI" "JWT_SECRET" "REDIS_URL")
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" "backend/.env"; then
                log_message "SUCCESS" "Required environment variable $var is configured"
            else
                log_message "WARNING" "Environment variable $var may not be configured"
            fi
        done
    else
        log_message "WARNING" "Backend environment configuration not found"
    fi

    # Check Docker configuration
    if [ -f "docker-compose.yml" ]; then
        log_message "SUCCESS" "Docker Compose configuration found"

        # Validate Docker Compose syntax
        if command -v docker-compose >/dev/null 2>&1; then
            if docker-compose config >/dev/null 2>&1; then
                log_message "SUCCESS" "Docker Compose configuration is valid"
            else
                log_message "ERROR" "Docker Compose configuration has syntax errors"
                return 1
            fi
        fi
    else
        log_message "WARNING" "Docker Compose configuration not found"
    fi

    return 0
}

# Function to run automated test suites
run_test_suites() {
    log_message "INFO" "Running automated test suites..."

    # Backend tests
    if [ -d "backend/tests" ]; then
        log_message "INFO" "Running backend test suite..."

        cd backend
        if [ -f "venv/bin/activate" ]; then
            source venv/bin/activate

            if command -v pytest >/dev/null 2>&1; then
                if pytest tests/ -v --tb=short > /tmp/backend_test_results.log 2>&1; then
                    log_message "SUCCESS" "Backend tests passed"
                    local test_count=$(grep -c "PASSED\|FAILED" /tmp/backend_test_results.log || echo "0")
                    log_message "INFO" "Backend test results: $test_count tests executed"
                else
                    log_message "ERROR" "Backend tests failed"
                    local failed_tests=$(grep "FAILED" /tmp/backend_test_results.log | wc -l || echo "0")
                    log_message "ERROR" "Failed tests count: $failed_tests"
                fi
            else
                log_message "WARNING" "pytest not available in virtual environment"
            fi

            deactivate
        else
            log_message "WARNING" "Backend virtual environment not found"
        fi
        cd ..
    else
        log_message "WARNING" "Backend tests directory not found"
    fi

    # Frontend tests
    if [ -d "backfron/__tests__" ] || [ -d "backfron/tests" ]; then
        log_message "INFO" "Running frontend test suite..."

        cd backfron
        if [ -f "package.json" ] && command -v npm >/dev/null 2>&1; then
            if npm test -- --watchAll=false --coverage=false > /tmp/frontend_test_results.log 2>&1; then
                log_message "SUCCESS" "Frontend tests passed"
                local test_count=$(grep -c "✓\|✗" /tmp/frontend_test_results.log || echo "0")
                log_message "INFO" "Frontend test results: $test_count tests executed"
            else
                log_message "ERROR" "Frontend tests failed"
            fi
        else
            log_message "WARNING" "npm not available or package.json not found"
        fi
        cd ..
    else
        log_message "WARNING" "Frontend tests directory not found"
    fi

    return 0
}

# Function to generate validation report
generate_validation_report() {
    log_message "INFO" "Generating validation report..."

    local report_file="/tmp/system_validation_report.md"

    cat > "$report_file" << EOF
# Stock Verification System - Final Validation Report

**Date:** $(date)
**System:** Stock Verification System
**Validation Type:** End-to-End System Testing

## Summary

This report contains the results of comprehensive end-to-end system validation testing.

## Test Results

$(cat "$VALIDATION_LOG")

## Validation Checklist

- [x] Service Availability Testing
- [x] Database Connection Validation
- [x] Authentication Workflow Testing
- [x] Item Management Workflow Testing
- [x] Performance Benchmark Testing
- [x] Configuration Validation
- [x] Automated Test Suite Execution

## Performance Metrics

- API Response Time: Measured during validation
- Concurrent Request Handling: 10 simultaneous requests tested
- Database Operations: Connection and query testing performed

## Recommendations

1. Monitor the issues flagged during validation
2. Address any failed tests or warnings
3. Continue regular performance monitoring
4. Maintain automated testing schedules

---

*Generated by Final System Validation Script*
*Stock Verification System v2.0*
EOF

    log_message "SUCCESS" "Validation report generated: $report_file"
    echo ""
    echo -e "${GREEN}📊 Full validation report available at: $report_file${NC}"
}

# Main validation execution
main() {
    local overall_status=0

    echo "Phase 1: Service Availability Testing"
    echo "====================================="
    check_service "Backend API" "8000" "$BACKEND_URL/health" || overall_status=1
    check_service "Admin Panel" "3000" "$ADMIN_PANEL_URL" || true  # Optional
    check_service "MongoDB" "27017" || overall_status=1
    check_service "Redis" "6379" || true  # Optional
    echo ""

    echo "Phase 2: Database Validation"
    echo "============================"
    validate_database || overall_status=1
    validate_redis || true  # Optional
    echo ""

    echo "Phase 3: API Testing"
    echo "===================="
    test_api_endpoint "GET" "/health" "200"
    test_api_endpoint "GET" "/docs" "200" || true  # Optional
    echo ""

    echo "Phase 4: Authentication Testing"
    echo "================================"
    test_authentication || overall_status=1
    echo ""

    echo "Phase 5: Item Management Testing"
    echo "================================="
    test_item_management || overall_status=1
    echo ""

    echo "Phase 6: Performance Testing"
    echo "============================"
    test_performance
    echo ""

    echo "Phase 7: Configuration Validation"
    echo "=================================="
    validate_configuration || overall_status=1
    echo ""

    echo "Phase 8: Automated Test Suites"
    echo "==============================="
    run_test_suites
    echo ""

    # Generate final report
    generate_validation_report

    echo ""
    echo -e "${BLUE}=================================================${NC}"
    if [ $overall_status -eq 0 ]; then
        log_message "SUCCESS" "Final System Validation COMPLETED SUCCESSFULLY"
        echo -e "${GREEN}🎉 System validation completed successfully!${NC}"
        echo -e "${GREEN}✅ All critical components are functioning properly${NC}"
        echo -e "${GREEN}✅ System is ready for production deployment${NC}"
    else
        log_message "ERROR" "Final System Validation COMPLETED WITH ISSUES"
        echo -e "${YELLOW}⚠️  System validation completed with some issues${NC}"
        echo -e "${YELLOW}⚠️  Please review the validation log for details${NC}"
        echo -e "${YELLOW}⚠️  Address critical issues before production deployment${NC}"
    fi

    echo ""
    echo -e "${BLUE}📋 Validation Log: $VALIDATION_LOG${NC}"
    echo -e "${BLUE}📊 Detailed Report: /tmp/system_validation_report.md${NC}"
    echo ""

    return $overall_status
}

# Run main validation
main "$@"
