#!/bin/bash
# Start Enhanced Admin Panel with Virtual Environment

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

cd "$PROJECT_ROOT/admin-panel"

echo "🚀 Starting Enhanced Admin Panel with Virtual Environment..."
echo "📊 Dashboard URL: http://localhost:3000/dashboard.html"
echo "🔧 Legacy Panel: http://localhost:3000/index.html"
echo ""

# Use the virtual environment Python
"$PROJECT_ROOT/.venv/bin/python" enhanced-server.py
