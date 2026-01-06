# Remediation Backlog

## P0: Critical (Immediate Action)

1. **[Security] Fix 0.0.0.0 Binding**:
   * **Action**: Update `backend/server.py` and `docker-compose.yml` to bind to `127.0.0.1` by default, or strictly control firewall.
   * **Owner**: DevOps
2. **[Security] Audit `discover_tables.py`**:
   * **Action**: Review for SQL injection and restrict access.
   * **Owner**: Backend Lead

## P1: High (Pre-Release)

1. **[Quality] Refactor `server.py`**:
   * **Action**: Split monolithic startup logic.
   * **Owner**: Backend Dev
2. **[Test] Add Sync Logic Tests**:
   * **Action**: Create `test_sync_manager.py` covering failure modes.
   * **Owner**: QA / Backend Dev
3. **[Ops] Configure Rate Limiting**:
   * **Action**: Ensure Redis is configured and Rate Limiter is active for Auth routes.
   * **Owner**: DevOps

## P2: Medium (Post-Release / Day 2)

1. **[Frontend] Strict TypeScript**:
   * **Action**: Enable `strict: true` and fix errors.
   * **Owner**: Frontend Dev
2. **[Perf] Optimize Docker Image**:
   * **Action**: Use multi-stage builds to reduce image size.
   * **Owner**: DevOps
