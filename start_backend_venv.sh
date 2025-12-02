#!/bin/bash
# Start Backend API with Virtual Environment
cd "/Users/noufi1/cursor new/STOCK_VERIFY_2-db-maped"

echo "🔧 Starting Backend API Server..."
echo "   🌐 API: http://localhost:8001"
echo "   📚 Docs: http://localhost:8001/docs"
echo ""

# Use the virtual environment Python
export PORT=8001
"/Users/noufi1/cursor new/STOCK_VERIFY_2-db-maped/.venv/bin/python" -m backend.server
