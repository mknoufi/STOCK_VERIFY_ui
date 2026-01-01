#!/bin/bash
# Start Local MongoDB using backend/data/db

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$PROJECT_ROOT/backend/data/db"
LOG_FILE="$PROJECT_ROOT/backend/data/mongod.log"
REPAIR_LOG="$PROJECT_ROOT/backend/data/mongod-repair.log"
MONGO_HOST="127.0.0.1"
MONGO_PORT="27017"

echo "🍃 Starting Local MongoDB..."
echo "   Data Directory: $DATA_DIR"
echo "   Log File: $LOG_FILE"

# Check if mongod is installed
if ! command -v mongod &> /dev/null; then
    echo "❌ mongod could not be found. Please install MongoDB Community Edition."
    exit 1
fi

mkdir -p "$DATA_DIR"

is_port_open() {
    nc -z "$MONGO_HOST" "$MONGO_PORT" 2>/dev/null
}

wait_for_mongo() {
    local max_retries="${1:-30}"
    local count=0
    while [ "$count" -lt "$max_retries" ]; do
        if is_port_open; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    return 1
}

start_mongo() {
    mongod --dbpath "$DATA_DIR" --port "$MONGO_PORT" --bind_ip "$MONGO_HOST" > "$LOG_FILE" 2>&1 &
    MONGO_PID=$!
    echo "✅ MongoDB started with PID: $MONGO_PID"
    echo "   To stop it, run: kill $MONGO_PID"
}

check_for_wiredtiger_issues() {
    grep -E -q "WiredTiger metadata corruption|WiredTiger.wt: handle-open: open|Please read the documentation for starting MongoDB with --repair" "$LOG_FILE"
}

# Check if already running
if pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is already running."
    if wait_for_mongo 5; then
        echo "✅ MongoDB is ready!"
        exit 0
    fi
    echo "❌ MongoDB process found but port $MONGO_PORT is not responding."
    exit 1
fi

start_mongo

echo "⏳ Waiting for MongoDB to be ready..."
if wait_for_mongo; then
    echo "✅ MongoDB is ready!"
    exit 0
fi

echo "⚠️  MongoDB started but port $MONGO_PORT is not accessible yet."
if check_for_wiredtiger_issues; then
    echo "🧰 WiredTiger issue detected. Attempting repair..."
    if [ -n "${MONGO_PID:-}" ] && ps -p "$MONGO_PID" > /dev/null 2>&1; then
        kill "$MONGO_PID" >/dev/null 2>&1 || true
        sleep 1
    fi
    if ! mongod --dbpath "$DATA_DIR" --repair > "$REPAIR_LOG" 2>&1; then
        echo "❌ MongoDB repair failed. See $REPAIR_LOG for details."
        exit 1
    fi
    start_mongo
    echo "⏳ Waiting for MongoDB to be ready after repair..."
    if wait_for_mongo; then
        echo "✅ MongoDB is ready after repair!"
        exit 0
    fi
fi

echo "❌ MongoDB failed to start. Check $LOG_FILE for details."
exit 1
