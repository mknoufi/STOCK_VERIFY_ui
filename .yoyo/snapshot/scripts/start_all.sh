#!/bin/bash
# Start Both Services - Ensures only one instance of each runs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🛑 Stopping all existing services..."
"$SCRIPT_DIR/stop_all.sh" 2>/dev/null || true

sleep 2

echo ""
echo "🚀 Starting backend..."
"$SCRIPT_DIR/start_backend.sh" &
BACKEND_PID=$!

sleep 5

echo ""
echo "🚀 Starting frontend..."
"$SCRIPT_DIR/start_frontend.sh" &
FRONTEND_PID=$!

echo ""
echo "✅ Services starting..."
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for both processes
wait
