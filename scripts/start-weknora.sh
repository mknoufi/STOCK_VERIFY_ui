#!/bin/bash
# Start separately managed WeKnora stack

WEKNORA_DIR="research_repos/WeKnora"
COMPOSE_FILE="docker-compose.weknora.yml"

# Ensure configs exist
if [ ! -f "$WEKNORA_DIR/config/config.yaml" ]; then
    echo "Creating default WeKnora config..."
    mkdir -p "$WEKNORA_DIR/config"
    # Basic config creation or copy if template exists (assuming defaults for now)
fi

echo "Starting WeKnora stack on ports 3002 (UI) and 8082 (API)..."

# Use the custom compose file to start services
# We need to set the context properly or ensure the compose file paths work
# Since the build context in my new compose file is relative to 'research_repos/WeKnora', I should run it from root.
# The compose file uses 'build: research_repos/WeKnora/frontend' so running from project root is correct.

docker compose -f "$COMPOSE_FILE" --profile full up -d

echo "WeKnora services started."
echo "UI: http://localhost:3002"
echo "API: http://localhost:8082"
