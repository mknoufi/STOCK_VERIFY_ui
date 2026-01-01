# 🚀 Production Deployment Plan - Stock Verify v2.1

**Version:** 1.0
**Date:** December 2025
**Purpose:** Step-by-step guide to provision production infrastructure and complete deployment

---

## 📋 Pre-Deployment Checklist

### Prerequisites
- [ ] Server specifications meet requirements (see below)
- [ ] Domain name registered and DNS configured
- [ ] SSL certificate obtained (Let's Encrypt or commercial)
- [ ] Team access to servers and services
- [ ] Backup of current environment (if migrating)

### Required Tools
```bash
# Install on deployment machine
sudo apt update && sudo apt install -y \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-pip \
    curl \
    wget \
    git

# Install Python dependencies
pip3 install -r backend/requirements.txt
```

---

## 🏗️ Infrastructure Provisioning

### Server Specifications

**Recommended Production Setup:**
- **Backend Server**: 4 CPU cores, 8GB RAM, 100GB SSD
- **Database Server**: 4 CPU cores, 16GB RAM, 200GB SSD (with RAID)
- **Load Balancer**: 2 CPU cores, 4GB RAM (optional, can be combined with backend)
- **Cache Server**: 2 CPU cores, 8GB RAM (Redis)

**Minimum Requirements:**
- **Single Server**: 2 CPU cores, 4GB RAM, 50GB SSD

### 1. Database Server Setup (MongoDB)

```bash
# Connect to database server
ssh root@db-server-ip

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-8.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt update
sudo apt install -y mongodb-org

# Configure MongoDB
sudo nano /etc/mongod.conf
```

**MongoDB Configuration:**
```yaml
# /etc/mongod.conf
net:
  port: 27017
  bindIp: 0.0.0.0

security:
  authorization: enabled

storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid
```

```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create admin user
mongo admin
```

```javascript
// MongoDB shell commands
db.createUser({
  user: "admin",
  pwd: "CHANGE_ME", // pragma: allowlist secret
  roles: [{ role: "root", db: "admin" }]
});

// Create application database user
use stock_verify
db.createUser({
  user: "app_user",
  pwd: "CHANGE_TO_SECURE_PASSWORD",
  roles: [{ role: "readWrite", db: "stock_verify" }]
});
```

### 2. Backend Server Setup

```bash
# Connect to backend server
ssh root@backend-server-ip

# Install dependencies
sudo apt update && sudo apt install -y \
    python3.10 \
    python3.10-venv \
    python3-pip \
    nginx \
    certbot \
    python3-certbot-nginx \
    docker.io \
    docker-compose

# Create application user
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG docker appuser

# Create application directory
sudo mkdir -p /opt/stock_verify
sudo chown appuser:appuser /opt/stock_verify
```

### 3. Application Deployment

```bash
# Clone repository
sudo -u appuser git clone https://github.com/mknoufi/STOCK_VERIFY_ui.git /opt/stock_verify

# Set up Python environment
cd /opt/stock_verify/backend
sudo -u appuser python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create production environment file
sudo -u appuser cp .env.production.example .env.production
sudo -u appuser nano .env.production
```

**Production Environment Variables:**
```bash
# /opt/stock_verify/backend/.env.production
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Database
MONGO_URL=mongodb://app_user:CHANGE_ME@db-server-ip:27017/stock_verify?authSource=admin <!-- pragma: allowlist secret -->
DB_NAME=stock_verify

# Security
JWT_SECRET=CHANGE_TO_64_CHAR_SECRET
JWT_REFRESH_SECRET=CHANGE_TO_64_CHAR_REFRESH_SECRET
JWT_ALGORITHM=HS256

# Redis (optional but recommended)
REDIS_URL=redis://cache-server-ip:6379/0

# CORS
CORS_ALLOW_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# SSL
FORCE_HTTPS=true

# Monitoring
METRICS_ENABLED=true
```

### 4. Frontend Deployment

```bash
# Build frontend
cd /opt/stock_verify/frontend
sudo -u appuser npm install
sudo -u appuser npm run build

# Configure environment
sudo -u appuser cp .env.production.example .env.production
sudo -u appuser nano .env.production
```

**Frontend Environment:**
```bash
# /opt/stock_verify/frontend/.env.production
EXPO_PUBLIC_BACKEND_URL=https://api.yourdomain.com
EXPO_PUBLIC_ENVIRONMENT=production
```

### 5. Nginx Configuration

```bash
# Configure nginx
sudo nano /etc/nginx/sites-available/stock-verify
```

**Nginx Configuration:**
```nginx
upstream backend {
    server backend-server-ip:8001;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    # Backend proxy
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend
    location / {
        root /opt/stock_verify/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://backend/health;
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/stock-verify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 7. Docker Deployment (Alternative)

```bash
# Create docker-compose.production.yml
sudo -u appuser nano /opt/stock_verify/docker-compose.production.yml
```

**Production Docker Compose:**
```yaml
version: '3.9'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - MONGO_URL=mongodb://mongo:27017/stock_verify
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - mongo
      - redis
    restart: unless-stopped
    ports:
      - "8001:8001"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      - EXPO_PUBLIC_BACKEND_URL=https://api.yourdomain.com
    depends_on:
      - backend
    restart: unless-stopped
    ports:
      - "80:80"

  mongo:
    image: mongo:8.0
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped
    command: --auth

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

```bash
# Deploy with Docker
cd /opt/stock_verify
sudo -u appuser docker-compose -f docker-compose.production.yml up -d
```

---

## 🔧 Production Readiness Checklist

### Security Configuration
- [ ] **SSL/TLS**: Certificates installed and auto-renewal configured
- [ ] **Firewall**: UFW enabled with only necessary ports open
- [ ] **SSH**: Key-based authentication, root login disabled
- [ ] **Secrets**: JWT secrets generated (64+ characters)
- [ ] **Database**: Authentication enabled, firewall rules applied
- [ ] **CORS**: Origins whitelisted (no wildcards)
- [ ] **Headers**: Security headers configured in nginx

### Monitoring Setup
- [ ] **Health Checks**: `/health` endpoint accessible
- [ ] **Uptime Monitoring**: External monitoring service configured
- [ ] **Log Aggregation**: Centralized logging (ELK, Loki, or CloudWatch)
- [ ] **Metrics**: Prometheus/Grafana or similar monitoring
- [ ] **Alerts**: Email/SMS alerts for critical issues

### Backup Configuration
- [ ] **Database Backups**: Automated daily backups
- [ ] **Application Backups**: Code and configuration backups
- [ ] **Backup Testing**: Restore procedure tested
- [ ] **Retention**: 30-day backup retention policy

### Performance Optimization
- [ ] **Caching**: Redis configured and enabled
- [ ] **Compression**: Gzip/Brotli compression enabled
- [ ] **CDN**: Static assets served via CDN (optional)
- [ ] **Load Balancing**: Multiple backend instances (optional)

### Documentation
- [ ] **Runbook**: Operations runbook created
- [ ] **Troubleshooting**: Common issues and solutions documented
- [ ] **Deployment**: Deployment procedures documented
- [ ] **Contact List**: Emergency contacts and escalation procedures

---

## 🚀 Launch Sequence

### Day 1: Infrastructure Setup
1. **Morning**: Provision servers and install base software
2. **Midday**: Configure database and backend services
3. **Afternoon**: Set up nginx, SSL, and frontend
4. **Evening**: Run initial smoke tests

### Day 2: Configuration & Testing
1. **Morning**: Configure monitoring and alerting
2. **Midday**: Set up backups and test restores
3. **Afternoon**: Performance testing and optimization
4. **Evening**: Security scan and vulnerability assessment

### Day 3: Final Preparations
1. **Morning**: Load testing with realistic traffic
2. **Midday**: Final configuration review
3. **Afternoon**: Team training and documentation review
4. **Evening**: Go/no-go decision meeting

### Launch Day
1. **Pre-launch**: Final health checks and backup verification
2. **Launch**: Deploy to production
3. **Monitoring**: Intensive monitoring for 4 hours
4. **Post-launch**: Performance review and issue resolution

---

## 📊 Success Criteria

### Technical Metrics
- [ ] **Uptime**: 99.9% availability target
- [ ] **Response Time**: <200ms for API endpoints
- [ ] **Error Rate**: <0.1% error rate
- [ ] **Security**: No critical vulnerabilities
- [ ] **Backup**: <15 minute RTO, <1 hour RPO

### Business Metrics
- [ ] **User Experience**: No user-facing errors
- [ ] **Performance**: Page load times <3 seconds
- [ ] **Scalability**: Support 1000+ concurrent users
- [ ] **Reliability**: No data loss or corruption

---

## 🚨 Rollback Plan

### Automatic Rollback Triggers
- Error rate >5% for 5 minutes
- Response time >5 seconds for 5 minutes
- Database connection failures
- SSL certificate issues

### Manual Rollback Procedure
1. **Stop current services**: `docker-compose down` or stop systemd services
2. **Restore previous version**: Deploy previous Docker image or code version
3. **Restore database**: If needed, restore from latest backup
4. **Verify functionality**: Run smoke tests
5. **Investigate**: Analyze logs and fix issues
6. **Retry deployment**: After issue resolution

### Rollback Commands
```bash
# Docker rollback
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

# Systemd rollback
sudo systemctl stop stock-verify-backend
sudo systemctl stop stock-verify-frontend
# Deploy previous version
sudo systemctl start stock-verify-backend
sudo systemctl start stock-verify-frontend
```

---

## 📞 Support Contacts

### Technical Support
- **DevOps Lead**: devops@company.com / +1-XXX-XXX-XXXX
- **Backend Developer**: backend@company.com / +1-XXX-XXX-XXXX
- **Frontend Developer**: frontend@company.com / +1-XXX-XXX-XXXX

### Business Support
- **Product Owner**: po@company.com / +1-XXX-XXX-XXXX
- **Project Manager**: pm@company.com / +1-XXX-XXX-XXXX

### Emergency Escalation
- **CTO**: cto@company.com / +1-XXX-XXX-XXXX
- **CEO**: ceo@company.com / +1-XXX-XXX-XXXX

---

## 📝 Post-Launch Checklist

### First 24 Hours
- [ ] Monitor system health and performance
- [ ] Check error logs for any issues
- [ ] Verify backup creation and integrity
- [ ] Test user registration and login flows
- [ ] Validate API endpoints and responses

### First Week
- [ ] Daily performance review meetings
- [ ] User feedback collection and analysis
- [ ] Performance optimization based on real usage
- [ ] Documentation updates based on issues discovered
- [ ] Team debrief and lessons learned session

### First Month
- [ ] Comprehensive performance analysis
- [ ] Security audit and vulnerability scan
- [ ] Backup and disaster recovery test
- [ ] Capacity planning for growth
- [ ] Customer satisfaction survey

---

**Document Version:** 1.0
**Created:** December 2025
**Next Review:** Post-launch (1 week)
**Approval Required:** DevOps Lead, Product Owner, CTO
