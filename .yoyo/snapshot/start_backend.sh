#!/bin/bash
cd "$(dirname "$0")"
echo "📦 Checking dependencies..."
pip install -r requirements.production.txt

# Stay in root
export PYTHONPATH=$PYTHONPATH:$(pwd)
echo "🚀 Starting Backend Server on port 8000..."
echo "📍 API: http://localhost:8000"
echo "Press Ctrl+C to stop"
python3 -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
