#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT=8001
FRONTEND_PORT=8081
EXPO_DEV_PORTS=(19000 19001 19002 19006)

log() {
  printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

kill_port() {
  local port=$1
  if lsof -ti:"$port" >/dev/null 2>&1; then
    log "Killing processes on port $port"
    lsof -ti:"$port" | xargs kill -9 || true
  fi
}

log "Stopping known backend/frontend ports"
kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"
for port in "${EXPO_DEV_PORTS[@]}"; do
  kill_port "$port"
done

log "Removing cache directories"
find "$BACKEND_DIR" -type d -name '__pycache__' -prune -exec rm -rf {} +
rm -rf "$BACKEND_DIR/.pytest_cache"
rm -rf "$FRONTEND_DIR/.expo" "$FRONTEND_DIR/.expo-shared" "$FRONTEND_DIR/.turbo"
rm -rf "$ROOT_DIR/.expo" "$ROOT_DIR/.expo-shared"

IP_ADDRESS="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '127.0.0.1')"
BACKEND_URL="http://$IP_ADDRESS:$BACKEND_PORT"

write_backend_port_file() {
  local timestamp
  timestamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

  cat <<JSON >"$ROOT_DIR/backend_port.json"
{
  "port": $BACKEND_PORT,
  "ip": "$IP_ADDRESS",
  "url": "$BACKEND_URL",
  "timestamp": "$timestamp"
}
JSON

  if [ -d "$FRONTEND_DIR/public" ]; then
    cp "$ROOT_DIR/backend_port.json" "$FRONTEND_DIR/public/backend_port.json"
  fi

  log "Updated backend_port.json with $BACKEND_URL"
}

start_backend() {
  log "Starting backend in new Terminal window"
  osascript <<EOF
  tell application "Terminal"
    do script "cd '$BACKEND_DIR' && source '$ROOT_DIR/backend/venv_test/bin/activate' 2>/dev/null && export PYTHONPATH=.. && uvicorn backend.server:app --host 0.0.0.0 --port $BACKEND_PORT"
  end tell
EOF
}

wait_for_backend() {
  for attempt in {1..10}; do
    if curl -sf "$BACKEND_URL/health" >/dev/null 2>&1 || curl -sf "$BACKEND_URL/api/health/detailed" >/dev/null 2>&1; then
      log "Backend responding at $BACKEND_URL"
      return 0
    fi
    log "Backend not ready (attempt $attempt/10). Waiting..."
    sleep 3
  done
  return 1
}

start_backend
if ! wait_for_backend; then
  log "Backend failed to respond. Retrying once."
  kill_port "$BACKEND_PORT"
  start_backend
  if ! wait_for_backend; then
    log "Backend still not responding. Please check logs manually."
  fi
fi

write_backend_port_file

log "Starting frontend in new Terminal window with backend URL $BACKEND_URL"
osascript <<EOF
tell application "Terminal"
  do script "cd '$FRONTEND_DIR' && export EXPO_PUBLIC_BACKEND_URL='$BACKEND_URL' && npm run start"
end tell
EOF

log "Frontend launch command dispatched. Monitor Terminal windows for status."
