#!/bin/bash
# Start Backend Server - Ensures only one instance runs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$PROJECT_ROOT"

echo "🔍 Checking for existing backend instances..."

# Kill existing backend processes
pkill -f "python.*server.py" 2>/dev/null || true
pkill -f "uvicorn.*server" 2>/dev/null || true

# Wait for ports to be released
sleep 2

echo "🍃 Starting Local MongoDB..."
"$SCRIPT_DIR/start_local_db.sh"

echo "🚀 Starting backend server..."

# Set PYTHONPATH and start
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"
export USE_CONNECTION_POOL=False
export SQL_SERVER_HOST="" # Unset to skip blocking connection check
unset DEBUG # Prevent config validation error if set in shell
cd "$BACKEND_DIR"

python3 server.py 2>&1 | tee backend_startup.log
