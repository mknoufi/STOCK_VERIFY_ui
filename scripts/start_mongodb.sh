#!/bin/bash
# Start MongoDB Service

echo "🍃 Starting MongoDB..."
echo ""

# Check if MongoDB is already running
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB is already running"
    echo "   PID: $(pgrep -x mongod)"
    exit 0
fi

# Try to start MongoDB
# Common locations for MongoDB
MONGODB_PATHS=(
    "/usr/local/bin/mongod"
    "/opt/homebrew/bin/mongod"
    "/usr/bin/mongod"
    "$(which mongod)"
)

MONGODB_FOUND=false
for path in "${MONGODB_PATHS[@]}"; do
    if [ -f "$path" ] && [ -x "$path" ]; then
        echo "📍 Found MongoDB at: $path"
        echo "🚀 Starting MongoDB..."

        # Start MongoDB in background
        $path --dbpath ~/data/db 2>&1 &
        MONGODB_PID=$!

        # Wait a moment to check if it started
        sleep 2

        if ps -p $MONGODB_PID > /dev/null; then
            echo "✅ MongoDB started successfully"
            echo "   PID: $MONGODB_PID"
            echo "   Data path: ~/data/db"
            MONGODB_FOUND=true
            break
        else
            echo "⚠️  MongoDB process exited. Check logs for errors."
        fi
    fi
done

if [ "$MONGODB_FOUND" = false ]; then
    echo "❌ MongoDB not found in common locations"
    echo ""
    echo "Please install MongoDB or start it manually:"
    echo "  brew install mongodb-community  # macOS"
    echo "  sudo apt-get install mongodb     # Linux"
    echo ""
    echo "Or start MongoDB manually with:"
    echo "  mongod --dbpath ~/data/db"
    exit 1
fi
