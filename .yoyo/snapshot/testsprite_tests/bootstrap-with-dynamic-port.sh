#!/bin/bash
# TestSprite Bootstrap with Dynamic Port Detection
# Automatically detects frontend port and configures TestSprite

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔍 Detecting frontend port..."

# Update TestSprite config with detected port
cd "$PROJECT_ROOT"
node testsprite_tests/dynamic-port-config.js

# Read the detected port from config
CONFIG_FILE="$SCRIPT_DIR/tmp/config.json"
if [ -f "$CONFIG_FILE" ]; then
    DETECTED_PORT=$(node -e "const config = require('$CONFIG_FILE'); console.log(config.localPort || 19006);")
    echo "✅ Using port: $DETECTED_PORT"
else
    DETECTED_PORT=19006
    echo "⚠️  Config file not found, using default port: $DETECTED_PORT"
fi

# Bootstrap TestSprite with detected port
echo "🚀 Bootstrapping TestSprite with port $DETECTED_PORT..."

# The actual TestSprite bootstrap will use the port from config.json
# This script just ensures the config is updated first

echo "✅ Bootstrap complete! Port configured: $DETECTED_PORT"
echo ""
echo "📋 To run tests:"
echo "   node /Users/noufi1/.npm/_npx/8ddf6bea01b2519d/node_modules/@testsprite/testsprite-mcp/dist/index.js generateCodeAndExecute"

