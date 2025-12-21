#!/bin/bash
set -e

# Configuration
PROJECT_ROOT="$(pwd)"
MONGO_DATA_DIR="$PROJECT_ROOT/mongodb_data"
LOG_DIR="$PROJECT_ROOT/logs"
BACKEND_PORT=8001
# Use the user's detected IP
HOST_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "192.168.1.47")
if [ -z "$HOST_IP" ]; then
    HOST_IP="127.0.0.1"
fi

# Create directories
mkdir -p "$MONGO_DATA_DIR"
mkdir -p "$LOG_DIR"

echo "📦 setting up manual deployment..."

# 1. Start MongoDB
echo "🐘 Starting MongoDB..."
if pgrep mongod > /dev/null; then
    echo "   MongoDB is already running."
else
    # Check if we can run mongod
    if command -v mongod > /dev/null; then
        mongod --dbpath "$MONGO_DATA_DIR" --logpath "$LOG_DIR/mongodb.log" --fork --bind_ip_all
        echo "   MongoDB started in background."
    else
        echo "❌ 'mongod' command not found. Please install MongoDB."
        exit 1
    fi
fi

# 2. Setup Backend
echo "🐍 Setting up Backend..."
cd backend

# Create Venv if missing
if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3.11 -m venv venv
fi

# Activate Venv
source venv/bin/activate

# Install dependencies (quietly)
echo "   Installing Python dependencies..."
pip install -q -r requirements.txt

# Start Backend
echo "   Starting Backend Server..."
# Load production env but force localhost mongo
export $(grep -v '^#' .env.production | xargs)
export MONGO_URL="mongodb://localhost:27017/stock_verify"
export PORT=$BACKEND_PORT
export STOCK_VERIFY_ENV="production"

# Kill existing on port 8001
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true

# Run Gunicorn in background
nohup gunicorn backend.server:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$BACKEND_PORT \
    > "$LOG_DIR/backend.log" 2>&1 &

BACKEND_PID=$!
echo "   Backend running (PID: $BACKEND_PID). Logs: $LOG_DIR/backend.log"

cd ..

# 3. Setup Frontend
echo "⚛️  Setting up Frontend..."
cd frontend

echo "   Installing Node dependencies..."
npm install --silent

echo "📱 Starting Expo..."
echo "--------------------------------------------------------"
echo "Deployment Ready!"
echo "Backend: http://$HOST_IP:$BACKEND_PORT"
echo "Frontend: Starting in default mode..."
echo "Scan the QR code below with Expo Go."
echo "--------------------------------------------------------"

# Run Expo in foreground
export EXPO_PUBLIC_BACKEND_URL="http://$HOST_IP:$BACKEND_PORT"
npx expo start --clear
