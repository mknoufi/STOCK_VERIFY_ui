#!/bin/bash
# Start Backend and Frontend in separate terminals

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting Stock Verify Application..."
echo ""

# Start Backend in new Terminal window
osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    set backendWindow to do script "cd '$SCRIPT_DIR/backend' && source ../.venv/bin/activate && export PYTHONPATH=.. && echo '🚀 Starting Backend Server...' && python -m backend.server"
    set custom title of backendWindow to "Backend Server"
end tell
APPLESCRIPT

echo "Waiting for backend to initialize..."
sleep 5

# Start Frontend in new Terminal window
osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    set frontendWindow to do script "cd '$SCRIPT_DIR/frontend' && echo '🚀 Starting Frontend Server...' && echo '🔄 Updating configuration...' && npm run update-ip && echo '📱 Starting Expo...' && npm start"
    set custom title of frontendWindow to "Frontend Server"
end tell
APPLESCRIPT

echo "✅ Both servers started in separate Terminal windows!"
echo "💡 To stop servers, run: ./stop.sh"
