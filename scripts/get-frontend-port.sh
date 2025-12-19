#!/bin/bash
# Dynamic Frontend Port Detection Script
# Detects which port the frontend is running on
# Returns port number or exits with error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to detect port using Node.js script
if command -v node &> /dev/null; then
    PORT_INFO=$(node "$SCRIPT_DIR/detect-frontend-port.js" 2>/dev/null)
    if [ $? -eq 0 ]; then
        PORT=$(echo "$PORT_INFO" | grep -o '"port"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*' | head -1)
        if [ -n "$PORT" ]; then
            echo "$PORT"
            exit 0
        fi
    fi
fi

# Fallback: Check common ports using curl
for PORT in 19006 19000 19001 19002 8081; do
    if curl -s --head --max-time 1 "http://localhost:$PORT" > /dev/null 2>&1; then
        echo "$PORT"
        exit 0
    fi
done

# Final fallback: Default web port
echo "19006"
exit 0
