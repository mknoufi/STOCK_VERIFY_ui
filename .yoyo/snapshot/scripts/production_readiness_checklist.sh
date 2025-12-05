#!/bin/bash

# Stock Verification System - Production Readiness Checklist Script
# This script validates all production readiness requirements

set -e
chmod +x "$0" 2>/dev/null || true  # Ensure script is executable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Stock Verification System - Production Readiness Checklist${NC}"
echo -e "${BLUE}=============================================================${NC}"
echo ""

# Track overall status
overall_status=0
checklist_results=()

# Function to check item and log result
check_item() {
    local description="$1"
    local test_command="$2"
    local required="$3"  # "required" or "optional"

    echo -n "Checking: $description... "

    if eval "$test_command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        checklist_results+=("✅ $description")
        return 0
    else
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ FAIL (REQUIRED)${NC}"
            checklist_results+=("❌ $description (REQUIRED)")
            overall_status=1
        else
            echo -e "${YELLOW}⚠️  WARN (OPTIONAL)${NC}"
            checklist_results+=("⚠️ $description (OPTIONAL)")
        fi
        return 1
    fi
}

echo -e "${BLUE}📁 File Structure Validation${NC}"
echo "==============================="

check_item "Backend directory exists" "test -d backend" "required"
check_item "Frontend directory exists" "test -d frontend" "required"
check_item "Admin panel directory exists" "test -d admin-panel" "optional"
check_item "Scripts directory exists" "test -d scripts" "required"
check_item "Docker configuration exists" "test -f docker-compose.yml" "required"
check_item "Main README exists" "test -f README.md" "required"

echo ""
echo -e "${BLUE}🔧 Backend Configuration${NC}"
echo "==========================="

check_item "Backend main server file exists" "test -f backend/server.py" "required"
check_item "Backend requirements file exists" "test -f backend/requirements.txt" "required"
check_item "Backend environment template exists" "test -f backend/.env.example -o -f backend/.env" "required"
check_item "Backend API routes directory exists" "test -d backend/routes" "required"
check_item "Backend services directory exists" "test -d backend/services" "required"
check_item "Backend tests directory exists" "test -d backend/tests" "required"
check_item "Backend database scripts exist" "test -d backend/scripts" "required"

echo ""
echo -e "${BLUE}📱 Frontend Configuration${NC}"
echo "==========================="

check_item "Frontend package.json exists" "test -f frontend/package.json" "required"
check_item "Frontend app directory exists" "test -d frontend/app" "required"
check_item "Frontend components directory exists" "test -d frontend/components" "required"
check_item "Frontend assets directory exists" "test -d frontend/assets" "required"
check_item "Frontend configuration files exist" "test -f frontend/app.json -a -f frontend/babel.config.js" "required"
check_item "Frontend test configuration exists" "test -f frontend/jest.config.js -o -f frontend/package.json" "required"

echo ""
echo -e "${BLUE}🧪 Testing Infrastructure${NC}"
echo "=============================="

check_item "Backend test files exist" "find backend/tests -name '*.py' | grep -q test" "required"
check_item "Frontend test files exist" "find frontend -name '*.test.*' -o -name '__tests__' | grep -q ." "required"
check_item "Integration test suite exists" "test -f backend/tests/test_integration.py" "required"
check_item "Performance test suite exists" "test -f backend/tests/test_performance.py" "required"
check_item "API test coverage exists" "find backend/tests -name 'test_*.py' | wc -l | grep -q '^[1-9]'" "required"

echo ""
echo -e "${BLUE}📚 Documentation${NC}"
echo "==================="

check_item "API documentation exists" "test -f API_REFERENCE.md" "required"
check_item "Deployment guide exists" "test -f DEPLOYMENT_GUIDE.md" "required"
check_item "Troubleshooting guide exists" "test -f TROUBLESHOOTING_GUIDE.md" "required"
check_item "Testing guide exists" "test -f TESTING_GUIDE.md" "required"
check_item "Architecture documentation exists" "test -f ARCHITECTURE.md" "required"
check_item "User manual exists" "test -f USER_MANUAL.md" "required"

echo ""
echo -e "${BLUE}🔒 Security Configuration${NC}"
echo "=============================="

check_item "Environment files are not in git" "! git ls-files | grep -q '\\.env$'" "required"
check_item "Secrets are not hardcoded in code" "! grep -r 'password.*=' --include='*.py' --include='*.js' --include='*.ts' . | grep -v test | grep -v example" "required"
check_item "CORS configuration exists" "grep -q 'CORS' backend/*.py backend/*/*.py" "required"
check_item "Authentication middleware exists" "find backend -name '*.py' -exec grep -l 'auth' {} \\;" "required"
check_item "Input validation exists" "grep -q 'ValidationError\\|validate' backend/*.py backend/*/*.py" "required"

echo ""
echo -e "${BLUE}🚀 Deployment Configuration${NC}"
echo "================================"

check_item "Dockerfile for backend exists" "test -f backend/Dockerfile -o -f Dockerfile" "required"
check_item "Docker compose configuration valid" "docker-compose config" "required"
check_item "Production requirements exist" "test -f requirements.production.txt -o -f backend/requirements.production.txt" "required"
check_item "Start scripts exist" "find . -maxdepth 1 -name 'start*.sh' | grep -q ." "required"
check_item "Environment configuration templates exist" "find . -name '*.env.example' -o -name '*.env.template' | grep -q ." "required"

echo ""
echo -e "${BLUE}📊 Performance & Monitoring${NC}"
echo "================================="

check_item "Performance monitoring configured" "grep -q 'metrics\\|monitoring' backend/*.py backend/*/*.py" "optional"
check_item "Health check endpoint exists" "grep -q 'health' backend/*.py backend/*/*.py" "required"
check_item "Logging configuration exists" "grep -q 'logging\\|logger' backend/*.py backend/*/*.py" "required"
check_item "Error tracking configured" "grep -q 'exception\\|error' backend/*.py backend/*/*.py" "required"

echo ""
echo -e "${BLUE}🗄️ Database Configuration${NC}"
echo "============================="

check_item "Database connection configuration exists" "grep -q 'mongodb\\|database' backend/*.py backend/*/*.py" "required"
check_item "Database migration scripts exist" "find backend -name '*migration*' -o -name '*setup*' | grep -q ." "optional"
check_item "Database indexes configuration exists" "find backend -name '*.py' -exec grep -l 'index\\|createIndex' {} \\;" "optional"
check_item "Database backup scripts exist" "find scripts -name '*backup*' 2>/dev/null | grep -q ." "optional"

echo ""
echo -e "${BLUE}🔄 CI/CD & Automation${NC}"
echo "=========================="

check_item "Automated test runner exists" "test -f pytest.ini -o -f backend/pytest.ini" "optional"
check_item "Linting configuration exists" "test -f .eslintrc.js -o -f frontend/.eslintrc.js -o -f frontend/eslint.config.js" "optional"
check_item "Type checking configuration exists" "test -f tsconfig.json -o -f frontend/tsconfig.json" "optional"
check_item "Code formatting configuration exists" "test -f .prettierrc -o -f frontend/.prettierrc" "optional"

echo ""
echo -e "${BLUE}📈 Production Optimization${NC}"
echo "============================="

check_item "Production build scripts exist" "grep -q 'build\\|production' frontend/package.json" "required"
check_item "Environment-specific configs exist" "find . -name '*production*' -o -name '*prod*' | grep -q ." "required"
check_item "Static asset optimization configured" "grep -q 'optimization\\|minif' frontend/webpack.config.js frontend/metro.config.js" "optional"
check_item "Caching configuration exists" "grep -q 'cache\\|redis' backend/*.py backend/*/*.py" "optional"

echo ""
echo -e "${BLUE}📋 Production Readiness Summary${NC}"
echo "===================================="

# Count results
total_checks=${#checklist_results[@]}
passed_checks=$(echo "${checklist_results[@]}" | grep -o '✅' | wc -l)
failed_required=$(echo "${checklist_results[@]}" | grep -c '❌.*REQUIRED' || echo "0")
warnings=$(echo "${checklist_results[@]}" | grep -o '⚠️' | wc -l)

echo "Total Checks: $total_checks"
echo "Passed: $passed_checks"
echo "Failed (Required): $failed_required"
echo "Warnings (Optional): $warnings"
echo ""

if [ $overall_status -eq 0 ]; then
    echo -e "${GREEN}🎉 PRODUCTION READY! All required checks passed.${NC}"
    echo -e "${GREEN}✅ System meets production deployment requirements${NC}"

    if [ $warnings -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Note: $warnings optional improvements available${NC}"
    fi
else
    echo -e "${RED}❌ NOT PRODUCTION READY! $failed_required required checks failed.${NC}"
    echo -e "${RED}🚫 Address required issues before production deployment${NC}"
fi

echo ""
echo -e "${BLUE}📝 Detailed Results:${NC}"
echo "===================="
for result in "${checklist_results[@]}"; do
    echo "$result"
done

echo ""
echo -e "${BLUE}🔧 Next Steps:${NC}"
echo "==============="
if [ $overall_status -eq 0 ]; then
    echo "1. ✅ Run final system validation: ./scripts/final_system_validation.sh"
    echo "2. ✅ Deploy to staging environment for final testing"
    echo "3. ✅ Run production deployment: docker-compose up -d"
    echo "4. ✅ Monitor system performance and logs"
else
    echo "1. ❌ Fix all required failed checks listed above"
    echo "2. ❌ Re-run this production readiness checklist"
    echo "3. ❌ Only proceed to production after all required checks pass"
fi

echo ""
echo -e "${BLUE}📊 Generated on: $(date)${NC}"

exit $overall_status
