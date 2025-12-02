#!/bin/bash

# Start MongoDB (optional check)
echo "Checking MongoDB..."
if pgrep -x "mongod" > /dev/null
then
    echo "✅ MongoDB is running"
else
    echo "⚠️  MongoDB is NOT running. Attempting to start..."
    brew services start mongodb-community || echo "❌ Failed to start MongoDB. Please start it manually."
fi

# Install dependencies
echo "📦 Checking dependencies..."
pip install -r requirements.production.txt

# Start Backend
echo "🚀 Starting Backend..."
# Run in background
uvicorn backend.server:app --host 0.0.0.0 --port 8000 --workers 4 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Start Frontend if build exists
if [ -d "frontend/build" ]; then
    echo "🚀 Starting Frontend..."
    cd frontend/build
    # Assuming http-server is installed or use python
    python3 -m http.server 3000 &
    FRONTEND_PID=$!
    echo "Frontend started with PID $FRONTEND_PID"
    cd ../..
else
    echo "ℹ️  Frontend build not found. Skipping frontend start."
fi

echo "✓ Services started. Press Ctrl+C to stop."

# Wait for backend
wait $BACKEND_PID
