#!/bin/bash

# Security Hardening Script for Production
# Run this script on your production server before deployment

set -e

echo "🔒 Starting Security Hardening Process..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# 1. Update System
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y
apt-get autoremove -y

# 2. Install Security Tools
echo "🛠️  Installing security tools..."
apt-get install -y \
    fail2ban \
    ufw \
    unattended-upgrades \
    apt-listchanges \
    logwatch \
    aide

# 3. Configure Firewall (UFW)
echo "🔥 Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

# 4. Configure Fail2Ban
echo "🚫 Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@yourdomain.com
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# 5. Configure Automatic Security Updates
echo "🔄 Enabling automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

# 6. Secure SSH Configuration
echo "🔐 Hardening SSH configuration..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

cat > /etc/ssh/sshd_config.d/hardening.conf <<EOF
# Security Hardening
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
MaxAuthTries 3
MaxSessions 2
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers appuser

# Cryptography
KexAlgorithms curve25519-sha256@libssh.org
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
EOF

systemctl restart sshd

# 7. Configure System Limits
echo "⚙️  Configuring system limits..."
cat >> /etc/security/limits.conf <<EOF

# Stock Count Application Limits
appuser soft nofile 65536
appuser hard nofile 65536
appuser soft nproc 4096
appuser hard nproc 4096
EOF

# 8. Kernel Security Parameters
echo "🛡️  Hardening kernel parameters..."
cat > /etc/sysctl.d/99-security.conf <<EOF
# IP Forwarding
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# SYN Cookies
net.ipv4.tcp_syncookies = 1

# IP Spoofing Protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP Redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Ignore ICMP Ping
net.ipv4.icmp_echo_ignore_all = 0

# Ignore Broadcast Requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Log Suspicious Packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Increase TCP Window Size
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864

# Connection Tracking
net.netfilter.nf_conntrack_max = 1000000
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 30

# File System
fs.file-max = 2097152
EOF

sysctl -p /etc/sysctl.d/99-security.conf

# 9. Create Application User
echo "👤 Creating application user..."
if ! id "appuser" &>/dev/null; then
    useradd -r -s /bin/bash -d /opt/stock_count -m appuser
    echo "User 'appuser' created"
fi

# 10. Set Directory Permissions
echo "📁 Setting directory permissions..."
mkdir -p /opt/stock_count
mkdir -p /var/log/stock_count
chown -R appuser:appuser /opt/stock_count
chown -R appuser:appuser /var/log/stock_count
chmod 750 /opt/stock_count
chmod 750 /var/log/stock_count

# 11. Configure Log Rotation
echo "📋 Configuring log rotation..."
cat > /etc/logrotate.d/stock_count <<EOF
/var/log/stock_count/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
    postrotate
        systemctl reload stock-count >/dev/null 2>&1 || true
    endscript
}
EOF

# 12. Configure Audit Logging (Optional)
if command -v auditd &> /dev/null; then
    echo "📝 Configuring audit logging..."
    cat >> /etc/audit/rules.d/stock-count.rules <<EOF
# Monitor application directory
-w /opt/stock_count -p wa -k stock_count_changes

# Monitor configuration changes
-w /opt/stock_count/.env.production -p wa -k config_changes

# Monitor executable changes
-w /usr/local/bin/ -p wa -k binary_changes
EOF
    systemctl restart auditd
fi

# 13. Docker Security (if using Docker)
if command -v docker &> /dev/null; then
    echo "🐳 Configuring Docker security..."

    # Add appuser to docker group
    usermod -aG docker appuser

    # Enable Docker content trust
    echo 'export DOCKER_CONTENT_TRUST=1' >> /etc/environment

    # Configure Docker daemon
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "live-restore": true,
    "userland-proxy": false,
    "no-new-privileges": true
}
EOF
    systemctl restart docker
fi

# 14. Install and Configure AIDE (File Integrity)
echo "🔍 Initializing file integrity monitoring..."
aideinit
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# 15. Summary
echo ""
echo "✅ Security Hardening Complete!"
echo ""
echo "📋 Summary:"
echo "  ✓ System packages updated"
echo "  ✓ Firewall configured (UFW)"
echo "  ✓ Fail2Ban installed and configured"
echo "  ✓ Automatic security updates enabled"
echo "  ✓ SSH hardened"
echo "  ✓ System limits configured"
echo "  ✓ Kernel parameters hardened"
echo "  ✓ Application user created (appuser)"
echo "  ✓ Directory permissions set"
echo "  ✓ Log rotation configured"
echo "  ✓ File integrity monitoring initialized"
echo ""
echo "⚠️  Important Next Steps:"
echo "  1. Change SSH port (optional but recommended)"
echo "  2. Set up SSH key authentication for appuser"
echo "  3. Configure monitoring and alerting"
echo "  4. Test all services after reboot"
echo "  5. Review /var/log/auth.log regularly"
echo ""
echo "🔄 A system reboot is recommended to apply all changes"
read -p "Reboot now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    reboot
fi
