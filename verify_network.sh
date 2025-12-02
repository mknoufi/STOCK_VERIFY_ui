#!/bin/bash
# Verify Network Connectivity

echo "🔍 Verifying Network Configuration..."

# 1. Get LAN IP
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null)
if [ -z "$LAN_IP" ]; then
    LAN_IP=$(ipconfig getifaddr en1 2>/dev/null)
fi
echo "📍 LAN IP: $LAN_IP"

# 2. Check Port 8001
echo "🔌 Checking Port 8001..."
lsof -i :8001 | grep LISTEN

# 3. Test Connectivity via LAN IP
echo "📡 Testing Connectivity to http://$LAN_IP:8001/api/health..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$LAN_IP:8001/api/health")

if [ "$HTTP_STATUS" == "200" ]; then
    echo "✅ Success! Backend is reachable via LAN IP."
else
    echo "❌ Failed! HTTP Status: $HTTP_STATUS"
    echo "   (If 000, it means connection refused or timed out)"
fi

# 4. Check Firewall Status
echo "🛡️  Checking Firewall Status..."
if [ -f "/usr/libexec/ApplicationFirewall/socketfilterfw" ]; then
    /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
    /usr/libexec/ApplicationFirewall/socketfilterfw --getblockall
else
    echo "⚠️  Cannot check firewall status (command not found)"
fi
