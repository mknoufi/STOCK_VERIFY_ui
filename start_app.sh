#!/bin/bash
# Start Backend and Frontend in separate terminals

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to get local IP
get_local_ip() {
    ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost"
}

LOCAL_IP=$(get_local_ip)
PORT=8001

echo "🚀 Starting Stock Verify Application..."
echo "📍 Detected Local IP: $LOCAL_IP"
echo "🛑 Stopping any running instances first..."
"$SCRIPT_DIR/scripts/stop_all.sh" 2>/dev/null || true
rm -f "$SCRIPT_DIR/backend_port.json" # Clean up old port file
sleep 2

echo ""

# Start Backend in new Terminal window
osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    set backendWindow to do script "cd '$SCRIPT_DIR' && ./scripts/start_backend.sh"
    set custom title of backendWindow to "Backend Server"
end tell
APPLESCRIPT

echo "⏳ Waiting for Backend to initialize and write likely port..."

# Loop to check for backend_port.json and then health
MAX_RETRIES=60
COUNT=0
BACKEND_READY=false
DETECTED_PORT=""

while [ $COUNT -lt $MAX_RETRIES ]; do
    # 1. Check for backend_port.json
    if [ -f "$SCRIPT_DIR/backend_port.json" ]; then
        # Try to read port using python (available on mac) to avoid jq dependency
        DETECTED_PORT=$(python3 -c "import json; print(json.load(open('$SCRIPT_DIR/backend_port.json'))['port'])" 2>/dev/null)

        if [ ! -z "$DETECTED_PORT" ]; then
            # 2. Check health using detected port (try HTTPS first with -k for self-signed, then HTTP)
            if curl -s -k "https://$LOCAL_IP:$DETECTED_PORT/api/health" > /dev/null; then
                BACKEND_READY=true
                PORT=$DETECTED_PORT
                echo "✅ Backend is healthy on port $PORT (HTTPS)"
                break
            elif curl -s "http://$LOCAL_IP:$DETECTED_PORT/api/health" > /dev/null; then
                BACKEND_READY=true
                PORT=$DETECTED_PORT
                echo "✅ Backend is healthy on port $PORT (HTTP)"
                break
            fi
            
            # Check localhost fallback
            if curl -s -k "https://localhost:$DETECTED_PORT/api/health" > /dev/null; then
                BACKEND_READY=true
                PORT=$DETECTED_PORT
                echo "✅ Backend is healthy on localhost:$PORT (HTTPS)"
                break
            elif curl -s "http://localhost:$DETECTED_PORT/api/health" > /dev/null; then
                BACKEND_READY=true
                PORT=$DETECTED_PORT
                echo "✅ Backend is healthy on localhost:$PORT (HTTP)"
                break
            fi
        fi
    fi

    echo "   ... waiting for backend ($COUNT/$MAX_RETRIES)"
    sleep 1
    ((COUNT++))
done

if [ "$BACKEND_READY" = true ]; then
    echo "✅ Backend is UP and reachable on port $PORT!"

    echo "🚀 Starting Frontend..."

    # Start Frontend (LAN Mode) - restart_expo_lan.sh handles its own new window
    echo "🚀 Starting Frontend (LAN Mode)..."
    "$SCRIPT_DIR/scripts/restart_expo_lan.sh"

    echo "✅ Both servers started!"
    echo "📱 Frontend will automatically connect to Backend at http://$LOCAL_IP:$PORT"
else
    echo "❌ Backend failed to start or is not reachable after 60 seconds."
    echo "   Please check the 'Backend Server' terminal window for errors."
    exit 1
fi

echo "💡 To stop servers, run: ./stop.sh"
