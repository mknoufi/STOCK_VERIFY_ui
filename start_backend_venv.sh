#!/bin/bash
# Start Backend API with Virtual Environment
cd "$(dirname "$0")"

echo "🔧 Starting Backend API Server..."
echo "   🌐 API: http://localhost:8001"
echo "   📚 Docs: http://localhost:8001/docs"
echo ""

# Use the virtual environment Python
export PORT=8001
export MONGO_URL=mongodb://127.0.0.1:27017
.venv/bin/python -m backend.server
