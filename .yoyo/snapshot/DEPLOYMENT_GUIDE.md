# Production Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Domain name configured (yourdomain.com)
- SSL certificates (Let's Encrypt recommended)
- Access to production servers

### 1. Initial Setup

```bash
# Clone repository
git clone <your-repo-url>
cd Stock_count

# Copy environment files
cp .env.production.example .env.production

# Edit production environment
nano .env.production
```

### 2. Generate Strong Secrets

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate MongoDB password
openssl rand -base64 24

# Generate Redis password
openssl rand -base64 24
```

Update `.env.production` with these values.

### 3. Configure SSL Certificates

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get install certbot

# Get certificates
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to nginx directory
mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

#### Option B: Self-Signed (Development/Testing Only)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem
```

### 4. Update Nginx Configuration

Edit `nginx/nginx.conf`:
- Replace `yourdomain.com` with your actual domain
- Update SSL certificate paths if needed

### 5. Build and Deploy

```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 6. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Test health endpoint
curl https://yourdomain.com/health

# Check API docs
open https://yourdomain.com/api/docs
```

---

## 🔐 Security Hardening

### System Security Configuration

#### 1. Firewall Configuration
```bash
# Configure UFW (Ubuntu Firewall)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential ports
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS

# Enable firewall
sudo ufw --force enable

# Verify configuration
sudo ufw status verbose
```

#### 2. SSH Hardening
```bash
# Create SSH configuration backup
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Secure SSH configuration
sudo nano /etc/ssh/sshd_config
```

Add these security settings to `/etc/ssh/sshd_config`:
```
# Disable root login
PermitRootLogin no

# Use key-based authentication only
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# Limit login attempts
MaxAuthTries 3
MaxSessions 3

# Use secure protocols only
Protocol 2
```

Apply SSH changes:
```bash
sudo systemctl restart ssh
```

#### 3. Application Security Configuration

**Environment Variables Security:**
```bash
# Secure .env files
sudo chown root:stockapp /opt/stock-verification/backend/.env
sudo chmod 640 /opt/stock-verification/backend/.env

# Verify no secrets in version control
grep -r "password\|secret\|key" /opt/stock-verification/.git/ | grep -v ".git/objects"
```

**Database Security:**
```bash
# Create MongoDB admin user
mongo admin --eval '
  db.createUser({
    user: "admin",
    pwd: "STRONG_ADMIN_PASSWORD",
    roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase"]
  })
'

# Create application user with limited privileges
mongo stock_verification --eval '
  db.createUser({
    user: "stockapp",
    pwd: "STRONG_APP_PASSWORD", 
    roles: [
      { role: "readWrite", db: "stock_verification" }
    ]
  })
'

# Enable MongoDB authentication
sudo nano /etc/mongod.conf
```

Add to MongoDB configuration:
```yaml
security:
  authorization: enabled
```

**API Security Headers:**
```python
# Add to backend/middleware/security.py
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# Security middleware configuration
app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### 4. SSL/TLS Configuration

**Nginx SSL Configuration:**
```nginx
# Strong SSL configuration in nginx/nginx.conf
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=63072000" always;

# Security headers
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**Certificate Auto-Renewal:**
```bash
# Add certbot renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 📊 Monitoring and Logging

### 1. Application Monitoring Setup

**Prometheus Configuration:**
Create `/opt/stock-verification/monitoring/prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'stock-verification-api'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    
  - job_name: 'mongodb_exporter'
    static_configs:
      - targets: ['localhost:9216']
      
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['localhost:9100']
```

**Grafana Dashboards:**
```bash
# Install monitoring stack
cd /opt/stock-verification
git clone https://github.com/your-org/monitoring-stack.git
cd monitoring-stack
docker-compose up -d grafana prometheus

# Import pre-configured dashboards
curl -X POST \
  http://admin:admin@localhost:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @dashboards/stock-verification-dashboard.json
```

### 2. Centralized Logging

**ELK Stack Configuration:**
```yaml
# docker-compose.monitoring.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:7.14.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - /opt/stock-verification/logs:/var/log/stock-verification

  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
```

**Log Aggregation Configuration:**
```ruby
# logstash/pipeline/stock-verification.conf
input {
  file {
    path => "/var/log/stock-verification/*.log"
    start_position => "beginning"
    codec => json
  }
}

filter {
  if [level] == "ERROR" {
    mutate {
      add_tag => ["error"]
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "stock-verification-%{+YYYY.MM.dd}"
  }
}
```

### 3. Performance Monitoring

**Application Performance Monitoring (APM):**
```python
# Add to backend/main.py
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configure tracing
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)

span_processor = BatchSpanProcessor(jaeger_exporter)
trace.get_tracer_provider().add_span_processor(span_processor)
```

**Custom Metrics Collection:**
```python
# backend/middleware/metrics.py
from prometheus_client import Counter, Histogram, generate_latest

# Define metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency')

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    
    REQUEST_COUNT.labels(
        method=request.method, 
        endpoint=request.url.path
    ).inc()
    
    REQUEST_LATENCY.observe(time.time() - start_time)
    return response

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

## 🔄 Backup and Recovery

### 1. Automated Backup Strategy

**Database Backup Script:**
Create `/opt/stock-verification/scripts/backup_database.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/opt/stock-verification/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR/mongodb/$DATE"

# MongoDB backup
mongodump --host localhost:27017 --db stock_verification --out "$BACKUP_DIR/mongodb/$DATE/"

# Compress backup
tar -czf "$BACKUP_DIR/mongodb/stock_verification_$DATE.tar.gz" -C "$BACKUP_DIR/mongodb/$DATE" .
rm -rf "$BACKUP_DIR/mongodb/$DATE"

# Application files backup
tar -czf "$BACKUP_DIR/application_$DATE.tar.gz" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='__pycache__' \
    /opt/stock-verification

# Clean old backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Upload to cloud storage (optional)
if command -v aws &> /dev/null; then
    aws s3 cp "$BACKUP_DIR/mongodb/stock_verification_$DATE.tar.gz" \
        s3://your-backup-bucket/database/
    aws s3 cp "$BACKUP_DIR/application_$DATE.tar.gz" \
        s3://your-backup-bucket/application/
fi

echo "Backup completed: $DATE"
```

**Automated Backup Scheduling:**
```bash
# Add to crontab
sudo crontab -e

# Daily database backup at 2 AM
0 2 * * * /opt/stock-verification/scripts/backup_database.sh >> /opt/stock-verification/logs/backup.log 2>&1

# Weekly full system backup at 3 AM on Sundays
0 3 * * 0 /opt/stock-verification/scripts/full_system_backup.sh >> /opt/stock-verification/logs/backup.log 2>&1
```

### 2. Disaster Recovery Procedures

**Recovery Script:**
Create `/opt/stock-verification/scripts/restore_system.sh`:
```bash
#!/bin/bash

BACKUP_FILE="$1"
RESTORE_TYPE="$2" # "database" or "full"

if [[ -z "$BACKUP_FILE" || -z "$RESTORE_TYPE" ]]; then
    echo "Usage: $0 <backup_file> <database|full>"
    exit 1
fi

# Stop services
sudo systemctl stop stock-verification-api
sudo systemctl stop mongodb

case "$RESTORE_TYPE" in
    "database")
        # Restore database only
        echo "Restoring database from $BACKUP_FILE"
        tar -xzf "$BACKUP_FILE" -C /tmp/
        mongorestore --host localhost:27017 --db stock_verification --drop /tmp/stock_verification/
        rm -rf /tmp/stock_verification
        ;;
    "full")
        # Full system restore
        echo "Performing full system restore from $BACKUP_FILE"
        sudo systemctl stop nginx
        tar -xzf "$BACKUP_FILE" -C /opt/
        sudo chown -R stockapp:stockapp /opt/stock-verification
        ;;
esac

# Start services
sudo systemctl start mongodb
sleep 5
sudo systemctl start stock-verification-api
sudo systemctl start nginx

echo "Restore completed"
```

**Point-in-Time Recovery:**
```bash
# MongoDB oplog backup for point-in-time recovery
mongodump --host localhost:27017 --db local --collection oplog.rs --out /backup/oplog/$(date +%Y%m%d_%H%M%S)/

# Restore to specific timestamp
mongorestore --host localhost:27017 --oplogReplay --oplogLimit 1640995200:1 /backup/oplog/latest/
```

## 🔧 Production Server Setup (Ubuntu/Debian)

### System Requirements
- **CPU**: 4+ cores recommended
- **RAM**: 8GB+ recommended
- **Storage**: 50GB+ SSD
- **OS**: Ubuntu 22.04 LTS or Debian 11+

### 1. Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git vim
```

### 2. Install Docker

```bash
# Add Docker repository
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Set up Application Directory

```bash
# Create app directory
sudo mkdir -p /opt/stock_count
sudo chown $USER:$USER /opt/stock_count

# Clone repository
cd /opt/stock_count
git clone <your-repo-url> .
```

### 5. Configure Environment

```bash
# Copy and edit production environment
cp .env.production.example .env.production
nano .env.production

# Create log directories
mkdir -p logs backups

# Set permissions
chmod +x scripts/*.sh
```

### 6. Start Services

```bash
# Build and start containers
docker-compose up -d

# Enable auto-start on system boot
docker update --restart unless-stopped $(docker ps -aq)
```

---

## 🔄 Updates & Maintenance

### Deploy Updates

```bash
# Pull latest code
cd /opt/stock_count
git pull origin main

# Rebuild and restart services
docker-compose down
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

### Zero-Downtime Deployment

```bash
# Build new images
docker-compose build backend

# Scale up with new version
docker-compose up -d --scale backend=2 --no-recreate

# Wait for health check to pass
sleep 30

# Remove old containers
docker-compose up -d --scale backend=1 --remove-orphans
```

### Database Migrations

```bash
# Backup before migration
docker-compose exec mongodb-backup /backup.sh

# Run migrations (if needed)
docker-compose exec backend python -m backend.db.migrations
```

---

## 💾 Backup & Restore

### Manual Backup

```bash
# Run backup script
docker-compose exec mongodb-backup /backup.sh

# Download backup
docker cp stock_count_mongodb:/backups /local/path
```

### Automated Backups

Backups run automatically at 2 AM daily (configured in docker-compose.yml).

### Restore from Backup

```bash
# Copy backup file to server
scp backup_file.tar.gz user@server:/opt/stock_count/backups/

# Run restore script
docker-compose exec mongodb /restore.sh /backups/backup_file.tar.gz
```

---

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f mongodb

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Check Service Health

```bash
# Service status
docker-compose ps

# Resource usage
docker stats

# Application health
curl https://yourdomain.com/health
```

### Monitor Metrics

```bash
# Backend metrics
curl https://yourdomain.com/api/supervisor/metrics

# Database health
docker-compose exec backend python -c "from backend.services.database_health import DatabaseHealthService; print(DatabaseHealthService.check_all())"
```

---

## 🔒 Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT secret
- [ ] Configured CORS for specific domains
- [ ] Enabled HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Configured rate limiting
- [ ] Enabled audit logging
- [ ] Set up automated backups
- [ ] Configured security headers
- [ ] Reviewed file permissions
- [ ] Set up monitoring alerts

---

## 🆘 Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend

# Check environment variables
docker-compose exec backend env | grep -E 'MONGO|JWT|SQL'

# Restart service
docker-compose restart backend
```

### Database Connection Issues

```bash
# Check MongoDB status
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check connection from backend
docker-compose exec backend python -c "from motor.motor_asyncio import AsyncIOMotorClient; client = AsyncIOMotorClient('mongodb://mongodb:27017'); print(client.server_info())"
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart services
docker-compose restart

# Increase limits in docker-compose.yml
```

### SSL Certificate Issues

```bash
# Check certificate expiry
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates

# Renew Let's Encrypt certificate
sudo certbot renew
docker-compose restart nginx
```

---

## 📞 Support

- **Documentation**: See `PRODUCTION_READINESS.md`
- **API Docs**: https://yourdomain.com/api/docs
- **Health Check**: https://yourdomain.com/health
- **Logs**: `/opt/stock_count/logs/`

---

## 🔄 Rollback Procedure

If deployment fails:

```bash
# Stop current containers
docker-compose down

# Checkout previous version
git log --oneline
git checkout <previous-commit-hash>

# Restore database backup (if needed)
docker-compose exec mongodb /restore.sh /backups/<backup-file>

# Start services
docker-compose up -d
```

---

## ⚙️ Advanced Configuration

### Scale Backend Workers

```bash
# Edit docker-compose.yml
# Under backend service, add:
#   deploy:
#     replicas: 4

# Or use command:
docker-compose up -d --scale backend=4
```

### Enable Production Profiling

```bash
# Edit .env.production
ENABLE_PROFILING=true

# Restart backend
docker-compose restart backend

# View profile data at /api/supervisor/metrics
```

### Custom Domain Configuration

1. Update DNS A record to point to server IP
2. Update `nginx/nginx.conf` with new domain
3. Get SSL certificate for new domain
4. Restart Nginx: `docker-compose restart nginx`

---

## 📈 Performance Tuning

### Database Optimization

```bash
# Create additional indexes
docker-compose exec mongodb mongosh stock_count --eval "
db.count_lines.createIndex({ 'session_id': 1, 'item_code': 1 })
db.erp_items.createIndex({ 'item_name': 'text', 'item_code': 'text' })
"

# Check slow queries
docker-compose exec mongodb mongosh stock_count --eval "
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().limit(10).pretty()
"
```

### Redis Optimization

```bash
# Monitor Redis
docker-compose exec redis redis-cli INFO memory

# Clear cache if needed
docker-compose exec redis redis-cli FLUSHDB
```

### Nginx Optimization

Edit `nginx/nginx.conf` for high traffic:
- Increase `worker_connections` to 8192
- Increase `client_max_body_size` if needed
- Add more `proxy_buffers`

---

## 🎯 Next Steps

1. Set up monitoring (Prometheus + Grafana)
2. Configure log aggregation (ELK Stack)
3. Set up alerting (PagerDuty/Slack)
4. Enable auto-scaling
5. Configure CDN (CloudFlare)
6. Set up CI/CD pipeline
7. Implement blue-green deployment
8. Configure multi-region deployment
