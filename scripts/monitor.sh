#!/bin/bash

# Production Monitoring Script
# Run this periodically via cron to monitor application health

set -e

# Configuration
APP_URL="${APP_URL:-http://localhost:8000}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@yourdomain.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
LOG_FILE="/var/log/stock_count/monitoring.log"
THRESHOLD_CPU=80
THRESHOLD_MEMORY=80
THRESHOLD_DISK=85
THRESHOLD_RESPONSE_TIME=2000  # milliseconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Alert function
send_alert() {
    local title="$1"
    local message="$2"
    local severity="$3"  # info, warning, critical

    log "ALERT [${severity}]: ${title} - ${message}"

    # Email alert
    if [ -n "${ALERT_EMAIL}" ]; then
        echo "${message}" | mail -s "[Stock Count] ${title}" "${ALERT_EMAIL}"
    fi

    # Slack alert
    if [ -n "${SLACK_WEBHOOK}" ]; then
        local color="good"
        [ "${severity}" == "warning" ] && color="warning"
        [ "${severity}" == "critical" ] && color="danger"

        curl -X POST "${SLACK_WEBHOOK}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"title\": \"${title}\",
                    \"text\": \"${message}\",
                    \"footer\": \"Stock Count Monitor\",
                    \"ts\": $(date +%s)
                }]
            }" > /dev/null 2>&1
    fi
}

# Check API Health
check_api_health() {
    log "Checking API health..."

    local start_time=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" "${APP_URL}/health" || echo "000|0")
    local end_time=$(date +%s%3N)

    local http_code=$(echo $response | cut -d'|' -f1)
    local response_time=$(echo $response | cut -d'|' -f2)
    local response_time_ms=$(echo "$response_time * 1000" | bc)

    if [ "$http_code" != "200" ]; then
        echo -e "${RED}✗${NC} API Health Check Failed (HTTP ${http_code})"
        send_alert "API Health Check Failed" "API returned HTTP ${http_code}" "critical"
        return 1
    elif [ $(echo "$response_time_ms > $THRESHOLD_RESPONSE_TIME" | bc) -eq 1 ]; then
        echo -e "${YELLOW}⚠${NC} API Slow Response (${response_time_ms}ms > ${THRESHOLD_RESPONSE_TIME}ms)"
        send_alert "API Slow Response" "Response time: ${response_time_ms}ms" "warning"
        return 1
    else
        echo -e "${GREEN}✓${NC} API Health OK (${response_time_ms}ms)"
        return 0
    fi
}

# Check Database Connection
check_database() {
    log "Checking database connection..."

    if command -v mongosh &> /dev/null; then
        local result=$(mongosh --quiet --eval "db.adminCommand('ping').ok" 2>&1)
        if [ "$result" == "1" ]; then
            echo -e "${GREEN}✓${NC} MongoDB Connection OK"
            return 0
        else
            echo -e "${RED}✗${NC} MongoDB Connection Failed"
            send_alert "Database Connection Failed" "MongoDB is not responding" "critical"
            return 1
        fi
    else
        # Fallback if mongosh is not available, check process
        if pgrep -x "mongod" > /dev/null; then
             echo -e "${GREEN}✓${NC} MongoDB Process Running"
             return 0
        else
             echo -e "${RED}✗${NC} MongoDB Process Not Found"
             return 1
        fi
    fi
}

# Check Redis Connection
check_redis() {
    log "Checking Redis connection..."

    if pgrep -x "redis-server" > /dev/null; then
        echo -e "${GREEN}✓${NC} Redis Process Running"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Redis not running (fallback to memory cache)"
        return 0  # Not critical
    fi
}

# Check System Resources
check_system_resources() {
    log "Checking system resources..."

    # CPU Usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    local cpu_usage_int=$(printf "%.0f" "$cpu_usage")

    if [ "$cpu_usage_int" -gt "$THRESHOLD_CPU" ]; then
        echo -e "${YELLOW}⚠${NC} High CPU Usage: ${cpu_usage}%"
        send_alert "High CPU Usage" "CPU usage at ${cpu_usage}%" "warning"
    else
        echo -e "${GREEN}✓${NC} CPU Usage OK: ${cpu_usage}%"
    fi

    # Memory Usage
    local mem_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')

    if [ "$mem_usage" -gt "$THRESHOLD_MEMORY" ]; then
        echo -e "${YELLOW}⚠${NC} High Memory Usage: ${mem_usage}%"
        send_alert "High Memory Usage" "Memory usage at ${mem_usage}%" "warning"
    else
        echo -e "${GREEN}✓${NC} Memory Usage OK: ${mem_usage}%"
    fi

    # Disk Usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

    if [ "$disk_usage" -gt "$THRESHOLD_DISK" ]; then
        echo -e "${RED}✗${NC} High Disk Usage: ${disk_usage}%"
        send_alert "High Disk Usage" "Disk usage at ${disk_usage}%" "critical"
    else
        echo -e "${GREEN}✓${NC} Disk Usage OK: ${disk_usage}%"
    fi
}

# Check SSL Certificate Expiry
check_ssl_certificate() {
    log "Checking SSL certificate..."

    local cert_file="/opt/stock_count/nginx/ssl/fullchain.pem"

    if [ ! -f "$cert_file" ]; then
        echo -e "${YELLOW}⚠${NC} SSL certificate not found"
        return 0
    fi

    local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s)
    local now_epoch=$(date +%s)
    local days_until_expiry=$(( ($expiry_epoch - $now_epoch) / 86400 ))

    if [ "$days_until_expiry" -lt 7 ]; then
        echo -e "${RED}✗${NC} SSL Certificate Expires in ${days_until_expiry} days"
        send_alert "SSL Certificate Expiring Soon" "Certificate expires in ${days_until_expiry} days" "critical"
    elif [ "$days_until_expiry" -lt 30 ]; then
        echo -e "${YELLOW}⚠${NC} SSL Certificate Expires in ${days_until_expiry} days"
        send_alert "SSL Certificate Expiring" "Certificate expires in ${days_until_expiry} days" "warning"
    else
        echo -e "${GREEN}✓${NC} SSL Certificate Valid (${days_until_expiry} days remaining)"
    fi
}

# Check Backup Status
check_backup_status() {
    log "Checking backup status..."

    local backup_dir="/opt/stock_count/backups"

    if [ ! -d "$backup_dir" ]; then
        echo -e "${YELLOW}⚠${NC} Backup directory not found"
        return 0
    fi

    local latest_backup=$(ls -t "$backup_dir"/stock_count_backup_*.tar.gz 2>/dev/null | head -1)

    if [ -z "$latest_backup" ]; then
        echo -e "${RED}✗${NC} No backups found"
        send_alert "No Backups Found" "No database backups found" "critical"
        return 1
    fi

    local backup_age_hours=$(( ($(date +%s) - $(stat -c %Y "$latest_backup")) / 3600 ))

    if [ "$backup_age_hours" -gt 48 ]; then
        echo -e "${RED}✗${NC} Last backup is ${backup_age_hours} hours old"
        send_alert "Backup Too Old" "Last backup is ${backup_age_hours} hours old" "critical"
        return 1
    elif [ "$backup_age_hours" -gt 24 ]; then
        echo -e "${YELLOW}⚠${NC} Last backup is ${backup_age_hours} hours old"
        send_alert "Backup Warning" "Last backup is ${backup_age_hours} hours old" "warning"
        return 1
    else
        echo -e "${GREEN}✓${NC} Latest backup is ${backup_age_hours} hours old"
        return 0
    fi
}

# Generate Summary Report
generate_report() {
    log "=== Monitoring Report ==="

    local failed_checks=0

    check_api_health || failed_checks=$((failed_checks + 1))
    check_database || failed_checks=$((failed_checks + 1))
    check_redis || failed_checks=$((failed_checks + 1))
    check_system_resources
    check_docker_containers || failed_checks=$((failed_checks + 1))
    check_ssl_certificate
    check_backup_status || failed_checks=$((failed_checks + 1))

    log "=== End of Report (${failed_checks} checks failed) ==="

    if [ "$failed_checks" -gt 0 ]; then
        echo -e "\n${RED}${failed_checks} checks failed!${NC}"
        return 1
    else
        echo -e "\n${GREEN}All checks passed!${NC}"
        return 0
    fi
}

# Main execution
main() {
    echo "🔍 Stock Count Production Monitoring"
    echo "======================================"
    echo ""

    generate_report

    echo ""
    echo "Monitoring log: ${LOG_FILE}"
}

# Run main function
main

# Exit wit
