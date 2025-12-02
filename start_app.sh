#!/bin/bash
# Start Backend and Frontend in separate terminals

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting Stock Verify Application..."
echo ""

# Start Backend in new Terminal window
osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    set backendWindow to do script "cd '$SCRIPT_DIR/backend' && source ../.venv/bin/activate && export PYTHONPATH=.. && echo '🚀 Backend Server (Port 8001)' && echo '📍 API: http://localhost:8001' && echo '📚 Docs: http://localhost:8001/docs' && echo 'Press Ctrl+C to stop' && echo '' && uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload"
    set custom title of backendWindow to "Backend Server"
end tell
APPLESCRIPT

sleep 3

# Start Frontend in new Terminal window
osascript <<APPLESCRIPT
tell application "Terminal"
    activate
    set frontendWindow to do script "cd '$SCRIPT_DIR/frontend' && echo '🚀 Frontend Server (Expo)' && echo '📱 Web: http://localhost:8081' && echo 'Press Ctrl+C to stop' && echo '' && npm start"
    set custom title of frontendWindow to "Frontend Server"
end tell
APPLESCRIPT

echo "✅ Both servers started in separate Terminal windows!"
echo "💡 To stop servers, run: ./stop.sh"
