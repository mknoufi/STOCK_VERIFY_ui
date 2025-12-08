#!/bin/bash

# Stock Verification System - System Health Monitor
# Comprehensive system monitoring and health validation

set -e
chmod +x "$0" 2>/dev/null || true  # Ensure script is executable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8000"
ADMIN_URL="http://localhost:3000"
MONGODB_HOST="localhost:27017"
REDIS_HOST="localhost:6379"
LOG_FILE="/tmp/system_health_monitor.log"

echo -e "${BLUE}🏥 Stock Verification System - Health Monitor${NC}"
echo -e "${BLUE}=============================================${NC}"
echo "Monitoring system health and performance..."
echo "Log: $LOG_FILE"
echo ""

# Initialize log
echo "System Health Monitor - $(date)" > "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

# Function to log with timestamp
log_with_timestamp() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Function to display status with color
show_status() {
    local component="$1"
    local status="$2"
    local details="$3"

    case "$status" in
        "HEALTHY")
            echo -e "${GREEN}✅ $component: HEALTHY${NC} $details"
            log_with_timestamp "INFO" "$component is HEALTHY - $details"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $component: WARNING${NC} $details"
            log_with_timestamp "WARNING" "$component has warnings - $details"
            ;;
        "CRITICAL")
            echo -e "${RED}❌ $component: CRITICAL${NC} $details"
            log_with_timestamp "ERROR" "$component is CRITICAL - $details"
            ;;
        "UNKNOWN")
            echo -e "${PURPLE}❓ $component: UNKNOWN${NC} $details"
            log_with_timestamp "WARNING" "$component status unknown - $details"
            ;;
    esac
}

# Function to check service health
check_service_health() {
    local service_name="$1"
    local url="$2"
    local port="$3"

    echo -e "${BLUE}🔍 Checking $service_name...${NC}"

    # Check if port is listening
    if lsof -i :$port 2>/dev/null | grep -q LISTEN; then
        # Check HTTP response if URL provided
        if [ -n "$url" ]; then
            local response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 5 "$url" 2>/dev/null)
            if [ "$response" = "200" ]; then
                # Get response time
                local response_time=$(curl -w "%{time_total}" -s -o /dev/null --connect-timeout 5 "$url" 2>/dev/null)
                if (( $(echo "$response_time > 2.0" | bc -l 2>/dev/null || echo "0") )); then
                    show_status "$service_name" "WARNING" "(Response time: ${response_time}s - slow)"
                else
                    show_status "$service_name" "HEALTHY" "(Response time: ${response_time}s)"
                fi
            else
                show_status "$service_name" "CRITICAL" "(HTTP $response)"
            fi
        else
            show_status "$service_name" "HEALTHY" "(Port $port active)"
        fi
    else
        show_status "$service_name" "CRITICAL" "(Port $port not listening)"
    fi
}

# Function to check database health
check_database_health() {
    echo -e "${BLUE}🗄️  Checking Database Health...${NC}"

    # MongoDB health check
    if command -v mongo >/dev/null 2>&1; then
        if mongo --eval "db.runCommand('ping')" --quiet stock_verification >/dev/null 2>&1; then
            # Check database stats
            local db_stats=$(mongo stock_verification --eval "db.stats()" --quiet 2>/dev/null)
            if echo "$db_stats" | grep -q '"ok" : 1'; then
                local db_size=$(mongo stock_verification --eval "Math.round(db.stats().dataSize/1024/1024)" --quiet 2>/dev/null)
                show_status "MongoDB" "HEALTHY" "(Database size: ${db_size}MB)"

                # Check collection counts
                local items_count=$(mongo stock_verification --eval "db.items.count()" --quiet 2>/dev/null)
                local users_count=$(mongo stock_verification --eval "db.users.count()" --quiet 2>/dev/null)
                local verifications_count=$(mongo stock_verification --eval "db.verifications.count()" --quiet 2>/dev/null)

                echo "  📊 Items: $items_count | Users: $users_count | Verifications: $verifications_count"
                log_with_timestamp "INFO" "Database counts - Items: $items_count, Users: $users_count, Verifications: $verifications_count"
            else
                show_status "MongoDB" "WARNING" "(Stats unavailable)"
            fi
        else
            show_status "MongoDB" "CRITICAL" "(Connection failed)"
        fi
    else
        show_status "MongoDB" "UNKNOWN" "(mongo client not available)"
    fi

    # Redis health check
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping 2>/dev/null | grep -q "PONG"; then
            local redis_memory=$(redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
            local redis_clients=$(redis-cli info clients 2>/dev/null | grep "connected_clients" | cut -d: -f2 | tr -d '\r')
            show_status "Redis" "HEALTHY" "(Memory: $redis_memory, Clients: $redis_clients)"
        else
            show_status "Redis" "CRITICAL" "(Connection failed)"
        fi
    else
        show_status "Redis" "UNKNOWN" "(redis-cli not available)"
    fi
}

# Function to check system resources
check_system_resources() {
    echo -e "${BLUE}💾 Checking System Resources...${NC}"

    # CPU Usage
    local cpu_usage=$(top -l 1 2>/dev/null | grep "CPU usage" | awk '{print $3}' | sed 's/%//' || echo "0")
    if (( $(echo "$cpu_usage > 80" | bc -l 2>/dev/null || echo "0") )); then
        show_status "CPU Usage" "WARNING" "(${cpu_usage}% - high)"
    elif (( $(echo "$cpu_usage > 95" | bc -l 2>/dev/null || echo "0") )); then
        show_status "CPU Usage" "CRITICAL" "(${cpu_usage}% - critical)"
    else
        show_status "CPU Usage" "HEALTHY" "(${cpu_usage}%)"
    fi

    # Memory Usage
    local mem_info=$(vm_stat 2>/dev/null || free 2>/dev/null || echo "unavailable")
    if [ "$mem_info" != "unavailable" ]; then
        # For macOS
        if command -v vm_stat >/dev/null 2>&1; then
            local page_size=4096
            local pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
            local pages_active=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
            local pages_inactive=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | sed 's/\.//')
            local pages_wired=$(vm_stat | grep "Pages wired down" | awk '{print $4}' | sed 's/\.//')

            local total_pages=$((pages_free + pages_active + pages_inactive + pages_wired))
            local used_pages=$((pages_active + pages_inactive + pages_wired))
            local mem_usage_percent=$((used_pages * 100 / total_pages))

            if [ $mem_usage_percent -gt 90 ]; then
                show_status "Memory Usage" "CRITICAL" "(${mem_usage_percent}% - critical)"
            elif [ $mem_usage_percent -gt 80 ]; then
                show_status "Memory Usage" "WARNING" "(${mem_usage_percent}% - high)"
            else
                show_status "Memory Usage" "HEALTHY" "(${mem_usage_percent}%)"
            fi
        # For Linux
        elif command -v free >/dev/null 2>&1; then
            local mem_usage=$(free | awk 'FNR==2{printf "%.0f", $3/($3+$4)*100}')
            if [ $mem_usage -gt 90 ]; then
                show_status "Memory Usage" "CRITICAL" "(${mem_usage}% - critical)"
            elif [ $mem_usage -gt 80 ]; then
                show_status "Memory Usage" "WARNING" "(${mem_usage}% - high)"
            else
                show_status "Memory Usage" "HEALTHY" "(${mem_usage}%)"
            fi
        fi
    else
        show_status "Memory Usage" "UNKNOWN" "(Unable to determine)"
    fi

    # Disk Usage
    local disk_usage=$(df / 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//' || echo "0")
    if [ $disk_usage -gt 90 ]; then
        show_status "Disk Usage" "CRITICAL" "(${disk_usage}% - critical)"
    elif [ $disk_usage -gt 80 ]; then
        show_status "Disk Usage" "WARNING" "(${disk_usage}% - high)"
    else
        show_status "Disk Usage" "HEALTHY" "(${disk_usage}%)"
    fi
}

# Function to check API endpoints
check_api_endpoints() {
    echo -e "${BLUE}🌐 Checking API Endpoints...${NC}"

    local endpoints=(
        "/health/:Health Check"
        "/docs:API Documentation"
        "/api/auth/login:Authentication"
        "/api/erp/items:Items Management"
        "/api/sessions:Session Management"
    )

    for endpoint_info in "${endpoints[@]}"; do
        local endpoint=$(echo "$endpoint_info" | cut -d: -f1)
        local description=$(echo "$endpoint_info" | cut -d: -f2)

        local response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 3 "$BACKEND_URL$endpoint" 2>/dev/null)
        case "$response" in
            "200"|"201"|"401"|"405") # 401/405 expected for protected/method endpoints
                show_status "$description" "HEALTHY" "($endpoint - HTTP $response)"
                ;;
            "404"|"500"|"502"|"503")
                show_status "$description" "CRITICAL" "($endpoint - HTTP $response)"
                ;;
            "")
                show_status "$description" "CRITICAL" "($endpoint - No response)"
                ;;
            *)
                show_status "$description" "WARNING" "($endpoint - HTTP $response)"
                ;;
        esac
    done
}

# Function to check log files
check_log_files() {
    echo -e "${BLUE}📋 Checking Log Files...${NC}"

    local log_locations=(
        "logs/app.log:Application Logs"
        "logs/error.log:Error Logs"
        "/var/log/nginx/access.log:Nginx Access"
        "/var/log/nginx/error.log:Nginx Errors"
    )

    for log_info in "${log_locations[@]}"; do
        local log_path=$(echo "$log_info" | cut -d: -f1)
        local log_name=$(echo "$log_info" | cut -d: -f2)

        if [ -f "$log_path" ]; then
            local log_size=$(stat -f%z "$log_path" 2>/dev/null || stat -c%s "$log_path" 2>/dev/null || echo "0")
            local size_mb=$((log_size / 1024 / 1024))

            # Check for recent errors
            local recent_errors=$(tail -n 100 "$log_path" 2>/dev/null | grep -i error | wc -l | tr -d ' ')

            if [ $size_mb -gt 100 ]; then
                show_status "$log_name" "WARNING" "(${size_mb}MB - large file)"
            elif [ $recent_errors -gt 5 ]; then
                show_status "$log_name" "WARNING" "($recent_errors recent errors)"
            else
                show_status "$log_name" "HEALTHY" "(${size_mb}MB, $recent_errors errors)"
            fi
        else
            show_status "$log_name" "UNKNOWN" "(Log file not found)"
        fi
    done
}

# Function to run performance tests
run_performance_tests() {
    echo -e "${BLUE}⚡ Running Performance Tests...${NC}"

    # API Response Time Test
    echo "Testing API response times..."
    local total_time=0
    local test_count=5

    for i in $(seq 1 $test_count); do
        local response_time=$(curl -w "%{time_total}" -s -o /dev/null --connect-timeout 5 "$BACKEND_URL/health" 2>/dev/null)
        total_time=$(echo "$total_time + $response_time" | bc -l 2>/dev/null || echo "0")
    done

    local avg_response_time=$(echo "scale=3; $total_time / $test_count" | bc -l 2>/dev/null || echo "0")

    if (( $(echo "$avg_response_time > 2.0" | bc -l 2>/dev/null || echo "0") )); then
        show_status "API Response Time" "WARNING" "(Avg: ${avg_response_time}s - slow)"
    else
        show_status "API Response Time" "HEALTHY" "(Avg: ${avg_response_time}s)"
    fi

    # Concurrent Request Test
    echo "Testing concurrent request handling..."
    local concurrent_start=$(date +%s.%N 2>/dev/null || date +%s)

    for i in {1..10}; do
        curl -s "$BACKEND_URL/health" > /dev/null &
    done
    wait

    local concurrent_end=$(date +%s.%N 2>/dev/null || date +%s)
    local concurrent_time=$(echo "$concurrent_end - $concurrent_start" | bc -l 2>/dev/null || echo "1")

    if (( $(echo "$concurrent_time > 5.0" | bc -l 2>/dev/null || echo "0") )); then
        show_status "Concurrent Requests" "WARNING" "(${concurrent_time}s for 10 requests)"
    else
        show_status "Concurrent Requests" "HEALTHY" "(${concurrent_time}s for 10 requests)"
    fi
}

# Function to generate health report
generate_health_report() {
    local report_file="/tmp/system_health_report.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    cat > "$report_file" << EOF
{
    "timestamp": "$timestamp",
    "system": "Stock Verification System",
    "health_check_version": "1.0",
    "overall_status": "$(grep -c "HEALTHY" "$LOG_FILE" > /dev/null && echo "HEALTHY" || echo "DEGRADED")",
    "components": {
        "services": {
            "backend_api": "$(grep "Backend API" "$LOG_FILE" | grep -q "HEALTHY" && echo "HEALTHY" || echo "UNHEALTHY")",
            "admin_panel": "$(grep "Admin Panel" "$LOG_FILE" | grep -q "HEALTHY" && echo "HEALTHY" || echo "UNHEALTHY")",
            "mongodb": "$(grep "MongoDB" "$LOG_FILE" | grep -q "HEALTHY" && echo "HEALTHY" || echo "UNHEALTHY")",
            "redis": "$(grep "Redis" "$LOG_FILE" | grep -q "HEALTHY" && echo "HEALTHY" || echo "UNHEALTHY")"
        },
        "resources": {
            "cpu": "$(grep "CPU Usage" "$LOG_FILE" | grep -q "HEALTHY" && echo "HEALTHY" || echo "STRESSED")",
            "memory": "$(grep "Memory Usage" "$LOG_FILE" | grep -q "HEALTHY" && echo "HEALTHY" || echo "STRESSED")",
            "disk": "$(grep "Disk Usage" "$LOG_FILE" | grep -q "HEALTHY" && echo "HEALTHY" || echo "FULL")"
        },
        "performance": {
            "api_response_time": "$(grep "API Response Time" "$LOG_FILE" | grep -q "HEALTHY" && echo "OPTIMAL" || echo "SLOW")",
            "concurrent_handling": "$(grep "Concurrent Requests" "$LOG_FILE" | grep -q "HEALTHY" && echo "OPTIMAL" || echo "DEGRADED")"
        }
    },
    "metrics": {
        "uptime_check": "$(uptime | awk '{print $3}' | sed 's/,//' || echo 'unknown')",
        "check_duration": "$(echo "$(date +%s) - $(stat -f %m "$LOG_FILE" 2>/dev/null || stat -c %Y "$LOG_FILE" 2>/dev/null || echo 0)" | bc -l 2>/dev/null || echo 0)s"
    }
}
EOF

    echo -e "${GREEN}📊 Health report generated: $report_file${NC}"
}

# Main execution
main() {
    local start_time=$(date +%s)

    # Service Health Checks
    echo -e "${PURPLE}=== SERVICE HEALTH CHECKS ===${NC}"
    check_service_health "Backend API" "$BACKEND_URL/health/" "8000"
    check_service_health "Admin Panel" "$ADMIN_URL" "3000"
    echo ""

    # Database Health Checks
    echo -e "${PURPLE}=== DATABASE HEALTH CHECKS ===${NC}"
    check_database_health
    echo ""

    # System Resource Checks
    echo -e "${PURPLE}=== SYSTEM RESOURCE CHECKS ===${NC}"
    check_system_resources
    echo ""

    # API Endpoint Checks
    echo -e "${PURPLE}=== API ENDPOINT CHECKS ===${NC}"
    check_api_endpoints
    echo ""

    # Log File Checks
    echo -e "${PURPLE}=== LOG FILE CHECKS ===${NC}"
    check_log_files
    echo ""

    # Performance Tests
    echo -e "${PURPLE}=== PERFORMANCE TESTS ===${NC}"
    run_performance_tests
    echo ""

    # Generate Report
    generate_health_report

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}Health Check Complete (${duration}s)${NC}"
    echo -e "${BLUE}=================================${NC}"

    # Summary
    local healthy_count=$(grep -c "HEALTHY" "$LOG_FILE" || echo "0")
    local warning_count=$(grep -c "WARNING" "$LOG_FILE" || echo "0")
    local critical_count=$(grep -c "CRITICAL" "$LOG_FILE" || echo "0")

    echo -e "${GREEN}✅ Healthy: $healthy_count${NC}"
    echo -e "${YELLOW}⚠️  Warnings: $warning_count${NC}"
    echo -e "${RED}❌ Critical: $critical_count${NC}"

    if [ $critical_count -eq 0 ] && [ $warning_count -eq 0 ]; then
        echo -e "${GREEN}🎉 System is fully operational!${NC}"
        return 0
    elif [ $critical_count -eq 0 ]; then
        echo -e "${YELLOW}⚠️  System operational with minor issues${NC}"
        return 1
    else
        echo -e "${RED}🚨 System has critical issues requiring attention${NC}"
        return 2
    fi
}

# Run main function
main "$@"
