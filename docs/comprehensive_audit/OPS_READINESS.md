# Operational Readiness

## 1. Containerization

* **Tool**: Docker Compose
* **Status**: **Ready**
* **Config**: `docker-compose.yml` defines `backend`, `mongo`, `redis`.
* **Gap**: `frontend` is not containerized in the main compose file (likely runs on host or separate build).
* **Action**: Ensure `frontend` build artifacts are served via Nginx container for production.

## 2. Logging & Observability

* **Tool**: Python `logging` / Docker Logs
* **Status**: **Basic**
* **Config**: Backend logs to stdout.
* **Gap**: No centralized aggregation (ELK/Splunk).
* **Action**: Configure Docker logging driver (e.g., `json-file` with rotation) to prevent disk exhaustion.

## 3. Backups

* **Target**: MongoDB
* **Status**: **Missing**
* **Gap**: No automated backup cron job found in repo.
* **Action**: Create a `backup` service in Docker Compose running `mongodump` to S3/Local Volume daily.

## 4. Health Checks

* **Endpoint**: `/health` (Inferred)
* **Status**: **Partial**
* **Gap**: Docker Compose `healthcheck` definitions missing for `backend`.
* **Action**: Add `healthcheck` to `backend` service:

  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  ```

## 5. Configuration Management

* **Tool**: Environment Variables (`.env`)
* **Status**: **Ready**
* **Gap**: `backend_port.json` is a file-based config that might desync.
* **Action**: Move port configuration to shared `.env` or service discovery.
