# Stock Verification System - Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide helps diagnose and resolve common issues in the Stock Verification System. Use this guide for systematic problem resolution and system maintenance.

## Quick Diagnostic Commands

### System Health Check
```bash
# Run comprehensive system check
cd /opt/stock-verification/scripts
sudo ./system_health_check.sh

# Individual component checks
sudo systemctl status stock-verification-api
sudo systemctl status mongodb
sudo systemctl status redis-server
sudo systemctl status nginx

# Check API health endpoint
curl -I https://api.yourdomain.com/health
```

### Log Analysis Commands
```bash
# API application logs
sudo tail -f /opt/stock-verification/logs/app.log

# System service logs
sudo journalctl -u stock-verification-api -f
sudo journalctl -u mongodb -f
sudo journalctl -u nginx -f

# Error log analysis
sudo grep -i error /opt/stock-verification/logs/*.log
sudo grep -i "500\|502\|503\|504" /var/log/nginx/access.log
```

## Common Issues and Solutions

### 1. API Service Issues

#### Issue: API Service Won't Start
**Symptoms:**
- `systemctl status stock-verification-api` shows failed state
- API endpoints return connection refused
- Mobile app can't connect to backend

**Diagnostic Steps:**
```bash
# Check service status
sudo systemctl status stock-verification-api

# View detailed logs
sudo journalctl -u stock-verification-api -n 50 --no-pager

# Check if port is in use
sudo netstat -tulpn | grep :8000
sudo lsof -i :8000
```

**Common Solutions:**

1. **Port Already in Use**
   ```bash
   # Kill process using port 8000
   sudo kill $(sudo lsof -t -i:8000)
   
   # Restart service
   sudo systemctl restart stock-verification-api
   ```

2. **Database Connection Issues**
   ```bash
   # Test MongoDB connection
   mongo --eval "db.runCommand('ping')" stock_verification
   
   # Check environment variables
   sudo -u stockapp cat /opt/stock-verification/backend/.env | grep MONGODB_URI
   
   # Restart MongoDB if needed
   sudo systemctl restart mongodb
   ```

3. **Python Virtual Environment Issues**
   ```bash
   # Recreate virtual environment
   cd /opt/stock-verification/backend
   sudo -u stockapp rm -rf venv
   sudo -u stockapp python3 -m venv venv
   sudo -u stockapp ./venv/bin/pip install -r requirements.production.txt
   
   # Restart service
   sudo systemctl restart stock-verification-api
   ```

4. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R stockapp:stockapp /opt/stock-verification
   sudo chmod +x /opt/stock-verification/backend/venv/bin/*
   
   # Check systemd service file permissions
   sudo chmod 644 /etc/systemd/system/stock-verification-api.service
   sudo systemctl daemon-reload
   ```

#### Issue: API Returns 500 Internal Server Error
**Symptoms:**
- API endpoints return HTTP 500
- Application logs show Python exceptions
- Database operations fail

**Diagnostic Steps:**
```bash
# Check application logs for Python tracebacks
sudo grep -A 20 "Traceback" /opt/stock-verification/logs/app.log

# Test API endpoints manually
curl -X GET https://api.yourdomain.com/health -v
curl -X POST https://api.yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' -v
```

**Solutions:**

1. **Database Connection Lost**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongodb
   
   # Test connection with application credentials
   mongo -u stockapp -p stock_verification --authenticationDatabase stock_verification
   
   # Restart services
   sudo systemctl restart mongodb
   sudo systemctl restart stock-verification-api
   ```

2. **Missing Environment Variables**
   ```bash
   # Verify all required environment variables
   sudo -u stockapp cat /opt/stock-verification/backend/.env
   
   # Check for missing or malformed values
   grep -E "^[A-Z_]+=$" /opt/stock-verification/backend/.env
   ```

3. **Dependency Issues**
   ```bash
   # Update Python dependencies
   cd /opt/stock-verification/backend
   sudo -u stockapp ./venv/bin/pip install --upgrade -r requirements.production.txt
   ```

#### Issue: High API Response Times
**Symptoms:**
- API requests take >5 seconds
- Mobile app shows loading indicators indefinitely
- Nginx logs show slow upstream responses

**Diagnostic Steps:**
```bash
# Monitor API response times
curl -w "@curl-format.txt" -s -o /dev/null https://api.yourdomain.com/health

# Check system resources
htop
iostat -x 1
free -h
df -h

# Monitor database performance
mongo --eval "db.runCommand({serverStatus: 1})" stock_verification | grep -A 5 network
```

**Solutions:**

1. **Database Performance Issues**
   ```bash
   # Check for missing indexes
   cd /opt/stock-verification/backend
   sudo -u stockapp ./venv/bin/python scripts/analyze_slow_queries.py
   
   # Rebuild indexes
   mongo stock_verification --eval "db.items.reIndex()"
   mongo stock_verification --eval "db.verifications.reIndex()"
   ```

2. **High Memory Usage**
   ```bash
   # Restart API service to clear memory leaks
   sudo systemctl restart stock-verification-api
   
   # Tune Gunicorn workers
   sudo nano /etc/systemd/system/stock-verification-api.service
   # Reduce --workers from 4 to 2 if memory constrained
   ```

3. **Disk I/O Bottleneck**
   ```bash
   # Check disk usage and performance
   iotop -ao
   
   # Clean up old logs
   sudo find /opt/stock-verification/logs -name "*.log*" -mtime +7 -delete
   sudo find /var/log/nginx -name "*.log*" -mtime +7 -delete
   ```

### 2. Database Issues

#### Issue: MongoDB Won't Start
**Symptoms:**
- `systemctl status mongodb` shows failed state
- API can't connect to database
- Database queries timeout

**Diagnostic Steps:**
```bash
# Check MongoDB status and logs
sudo systemctl status mongodb
sudo journalctl -u mongodb -n 20

# Check MongoDB configuration
sudo mongod --config /etc/mongod.conf --fork

# Verify data directory permissions
ls -la /var/lib/mongodb/
```

**Solutions:**

1. **Disk Space Issues**
   ```bash
   # Check available disk space
   df -h /var/lib/mongodb
   
   # Clean up old database files
   sudo systemctl stop mongodb
   sudo rm /var/lib/mongodb/mongodb.lock
   sudo -u mongodb mongod --repair --dbpath /var/lib/mongodb
   sudo systemctl start mongodb
   ```

2. **Permission Issues**
   ```bash
   # Fix MongoDB data directory permissions
   sudo chown -R mongodb:mongodb /var/lib/mongodb
   sudo chmod 755 /var/lib/mongodb
   
   # Fix log file permissions
   sudo chown mongodb:mongodb /var/log/mongodb/mongod.log
   ```

3. **Configuration Issues**
   ```bash
   # Validate MongoDB configuration
   sudo mongod --config /etc/mongod.conf --configsvr --fork --logpath /tmp/mongod-test.log
   
   # Check for syntax errors
   sudo tail -n 20 /tmp/mongod-test.log
   ```

#### Issue: Database Performance Degradation
**Symptoms:**
- Slow query responses
- High CPU usage by MongoDB
- Mobile app experiences delays during sync

**Diagnostic Steps:**
```bash
# Analyze slow queries
mongo stock_verification --eval "db.setProfilingLevel(2, {slowms: 100})"
mongo stock_verification --eval "db.system.profile.find().limit(5).sort({ts: -1}).pretty()"

# Check database statistics
mongo stock_verification --eval "db.runCommand({dbStats: 1})"
mongo stock_verification --eval "db.items.stats()"
```

**Solutions:**

1. **Missing or Inefficient Indexes**
   ```bash
   # Run index analysis script
   cd /opt/stock-verification/backend
   sudo -u stockapp ./venv/bin/python scripts/optimize_database.py
   
   # Create missing indexes manually
   mongo stock_verification --eval 'db.items.createIndex({"barcode": 1})'
   mongo stock_verification --eval 'db.items.createIndex({"category": 1, "location": 1})'
   mongo stock_verification --eval 'db.verifications.createIndex({"item_id": 1, "verified_at": -1})'
   ```

2. **Large Collection Size**
   ```bash
   # Compact collections to reclaim space
   mongo stock_verification --eval "db.runCommand({compact: 'items'})"
   mongo stock_verification --eval "db.runCommand({compact: 'verifications'})"
   
   # Archive old verification records
   mongo stock_verification --eval '
     db.verifications_archive.insertMany(
       db.verifications.find({"verified_at": {$lt: new Date(Date.now() - 365*24*60*60*1000)}}).toArray()
     );
     db.verifications.deleteMany({"verified_at": {$lt: new Date(Date.now() - 365*24*60*60*1000)}});
   '
   ```

### 3. Web Server Issues (Nginx)

#### Issue: Nginx Returns 502 Bad Gateway
**Symptoms:**
- Web application shows 502 error
- API endpoints return 502 Bad Gateway
- Nginx error logs show upstream connection failures

**Diagnostic Steps:**
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test upstream backend
curl -I http://127.0.0.1:8000/health

# Verify Nginx configuration
sudo nginx -t
```

**Solutions:**

1. **Backend Service Down**
   ```bash
   # Restart backend service
   sudo systemctl restart stock-verification-api
   
   # Wait for service to fully start
   sleep 10
   
   # Test connection
   curl http://127.0.0.1:8000/health
   ```

2. **Nginx Configuration Issues**
   ```bash
   # Backup current configuration
   sudo cp /etc/nginx/sites-available/stock-verification /tmp/nginx-backup
   
   # Reload configuration
   sudo systemctl reload nginx
   
   # If reload fails, check configuration syntax
   sudo nginx -t -c /etc/nginx/nginx.conf
   ```

#### Issue: SSL Certificate Problems
**Symptoms:**
- Browser shows SSL warnings
- API calls fail with certificate errors
- Mobile app can't connect securely

**Diagnostic Steps:**
```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiration
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

**Solutions:**

1. **Expired Certificates**
   ```bash
   # Renew certificates
   sudo certbot renew --force-renewal
   
   # Restart Nginx
   sudo systemctl restart nginx
   ```

2. **Certificate Path Issues**
   ```bash
   # Verify certificate files exist
   ls -la /etc/letsencrypt/live/yourdomain.com/
   
   # Update Nginx configuration with correct paths
   sudo nano /etc/nginx/sites-available/stock-verification
   
   # Test and reload
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 4. Mobile App Issues

#### Issue: App Can't Connect to API
**Symptoms:**
- Mobile app shows "Network Error" messages
- Authentication fails
- Data doesn't sync

**Diagnostic Steps:**
```bash
# Test API accessibility from external network
curl -I https://api.yourdomain.com/health

# Check DNS resolution
nslookup api.yourdomain.com

# Verify SSL certificate chain
curl -I https://api.yourdomain.com/health -v
```

**Solutions:**

1. **Network Configuration Issues**
   ```bash
   # Check firewall rules
   sudo ufw status verbose
   
   # Ensure API port is accessible
   sudo netstat -tulpn | grep :443
   
   # Test from different locations
   curl -I https://api.yourdomain.com/health --connect-timeout 10
   ```

2. **CORS Configuration**
   ```bash
   # Verify CORS origins in environment
   sudo -u stockapp grep CORS_ORIGINS /opt/stock-verification/backend/.env
   
   # Test CORS headers
   curl -H "Origin: https://yourdomain.com" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS https://api.yourdomain.com/health -v
   ```

#### Issue: App Crashes or Performance Issues
**Symptoms:**
- App crashes during startup or specific operations
- Slow response times
- High memory usage

**Solutions:**

1. **Clear App Cache** (User Action)
   - iOS: Delete and reinstall app
   - Android: Clear app data in settings

2. **Update App Build**
   ```bash
   cd /opt/stock-verification/frontend
   sudo -u stockapp npm run build:production
   
   # For EAS builds
   sudo -u stockapp eas build --platform all --profile production --clear-cache
   ```

### 5. Performance Issues

#### Issue: High System Resource Usage
**Symptoms:**
- Server becomes unresponsive
- High CPU/memory usage
- Slow response times across all services

**Diagnostic Steps:**
```bash
# Monitor system resources
top -d 1
htop
iostat -x 1 5

# Check process resource usage
ps aux --sort=-%cpu | head -20
ps aux --sort=-%mem | head -20

# Monitor network connections
ss -tuln
netstat -i
```

**Solutions:**

1. **Memory Optimization**
   ```bash
   # Restart services to free memory
   sudo systemctl restart stock-verification-api
   sudo systemctl restart mongodb
   
   # Configure swap if needed
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. **CPU Optimization**
   ```bash
   # Reduce Gunicorn workers
   sudo nano /etc/systemd/system/stock-verification-api.service
   # Change --workers 4 to --workers 2
   
   # Restart service
   sudo systemctl daemon-reload
   sudo systemctl restart stock-verification-api
   ```

3. **Disk I/O Optimization**
   ```bash
   # Clean up logs
   sudo find /opt/stock-verification/logs -name "*.log*" -mtime +3 -delete
   sudo find /var/log -name "*.log*" -mtime +7 -delete
   
   # Optimize database
   mongo stock_verification --eval "db.runCommand({compact: 'items', force: true})"
   ```

## Monitoring and Alerting

### Setting Up Automated Monitoring

Create `/opt/stock-verification/scripts/advanced_monitoring.sh`:

```bash
#!/bin/bash

# Advanced monitoring script with alerting
ALERT_EMAIL="admin@yourdomain.com"
LOG_FILE="/opt/stock-verification/logs/monitoring.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Function to send alerts
send_alert() {
    local subject="$1"
    local message="$2"
    echo "[$DATE] ALERT: $subject - $message" >> "$LOG_FILE"
    echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
}

# Function to check API response time
check_api_performance() {
    local response_time=$(curl -w "%{time_total}" -s -o /dev/null http://127.0.0.1:8000/health)
    local response_code=$(curl -w "%{http_code}" -s -o /dev/null http://127.0.0.1:8000/health)
    
    if (( $(echo "$response_time > 5.0" | bc -l) )); then
        send_alert "API Performance Alert" "API response time: ${response_time}s (threshold: 5s)"
    fi
    
    if [ "$response_code" != "200" ]; then
        send_alert "API Health Alert" "API returned HTTP $response_code"
    fi
}

# Function to check system resources
check_system_resources() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    local mem_usage=$(free | awk 'FNR==2{printf "%.0f", $3/($3+$4)*100}')
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        send_alert "High CPU Usage" "CPU usage: ${cpu_usage}%"
    fi
    
    if [ "$mem_usage" -gt 85 ]; then
        send_alert "High Memory Usage" "Memory usage: ${mem_usage}%"
    fi
    
    if [ "$disk_usage" -gt 90 ]; then
        send_alert "High Disk Usage" "Disk usage: ${disk_usage}%"
    fi
}

# Function to check database connectivity
check_database_health() {
    if ! mongo --eval "db.runCommand('ping')" stock_verification >/dev/null 2>&1; then
        send_alert "Database Connection Failed" "MongoDB connection test failed"
        systemctl restart mongodb
    fi
    
    # Check for slow queries
    local slow_queries=$(mongo stock_verification --quiet --eval "db.system.profile.find({millis: {\$gt: 1000}}).count()")
    if [ "$slow_queries" -gt 10 ]; then
        send_alert "Database Performance Alert" "Found $slow_queries slow queries in the last period"
    fi
}

# Main monitoring execution
echo "[$DATE] Starting advanced monitoring check" >> "$LOG_FILE"
check_api_performance
check_system_resources
check_database_health
echo "[$DATE] Advanced monitoring check completed" >> "$LOG_FILE"
```

### Performance Baseline Script

Create `/opt/stock-verification/scripts/performance_baseline.sh`:

```bash
#!/bin/bash

# Performance baseline measurement script
RESULTS_FILE="/opt/stock-verification/logs/performance_baseline.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Performance Baseline Test" >> "$RESULTS_FILE"

# API Response Time Test
api_response_time=$(curl -w "%{time_total}" -s -o /dev/null http://127.0.0.1:8000/health)
echo "API Health Response Time: ${api_response_time}s" >> "$RESULTS_FILE"

# Database Query Performance
mongo_query_time=$(mongo stock_verification --quiet --eval "
  var start = new Date();
  db.items.find().limit(100).toArray();
  var end = new Date();
  print((end - start) + 'ms');
")
echo "MongoDB Query Time (100 items): $mongo_query_time" >> "$RESULTS_FILE"

# System Resource Usage
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
mem_usage=$(free | awk 'FNR==2{printf "%.1f", $3/($3+$4)*100}')
disk_usage=$(df / | awk 'NR==2 {print $5}')

echo "CPU Usage: ${cpu_usage}%" >> "$RESULTS_FILE"
echo "Memory Usage: ${mem_usage}%" >> "$RESULTS_FILE"
echo "Disk Usage: $disk_usage" >> "$RESULTS_FILE"

# Network Performance
ping_time=$(ping -c 4 8.8.8.8 | tail -1 | awk '{print $4}' | cut -d '/' -f 2)
echo "Network Latency (avg): ${ping_time}ms" >> "$RESULTS_FILE"

echo "----------------------------------------" >> "$RESULTS_FILE"
```

## Emergency Procedures

### Complete System Recovery

1. **Service Recovery Order**
   ```bash
   # Stop all services
   sudo systemctl stop nginx
   sudo systemctl stop stock-verification-api
   sudo systemctl stop redis-server
   sudo systemctl stop mongodb
   
   # Start services in order
   sudo systemctl start mongodb
   sleep 5
   sudo systemctl start redis-server
   sleep 2
   sudo systemctl start stock-verification-api
   sleep 5
   sudo systemctl start nginx
   
   # Verify all services are running
   sudo systemctl status mongodb redis-server stock-verification-api nginx
   ```

2. **Database Recovery**
   ```bash
   # Stop dependent services
   sudo systemctl stop stock-verification-api
   sudo systemctl stop mongodb
   
   # Repair database if corrupted
   sudo -u mongodb mongod --repair --dbpath /var/lib/mongodb
   
   # Restore from backup if needed
   sudo systemctl start mongodb
   mongorestore --db stock_verification /opt/stock-verification/backups/latest/
   
   # Restart services
   sudo systemctl start stock-verification-api
   ```

### Disaster Recovery Contacts

**Emergency Response Team:**
- **System Administrator**: +1-XXX-XXX-XXXX
- **Database Administrator**: +1-XXX-XXX-XXXX
- **Development Team Lead**: +1-XXX-XXX-XXXX
- **Network Operations**: +1-XXX-XXX-XXXX

**Escalation Matrix:**
1. **Level 1** (0-15 minutes): System Administrator
2. **Level 2** (15-30 minutes): Database Administrator + Dev Lead
3. **Level 3** (30+ minutes): All team members + Management

---

*This troubleshooting guide should be kept updated with new issues and solutions as they are discovered. Regular review and updates ensure comprehensive coverage of system problems.*

*Last Updated: January 15, 2024*
*Version: 2.0.0*

### 6. Dependency Issues

#### Issue: NPM Install Fails with ERESOLVE
**Symptoms:**
- `npm install` fails with "unable to resolve dependency tree"
- Conflicts between `react` and `react-test-renderer`

**Solution:**
Use legacy peer dependencies flag:
```bash
cd frontend
npm install --legacy-peer-deps
```