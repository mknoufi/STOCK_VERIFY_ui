# Security Risk Register

## 1. Network Exposure

* **ID**: SEC-001
* **Finding**: Application binds to `0.0.0.0` by default.
* **File**: `backend/server.py`, `backend/config.py`
* **Severity**: **High** (if exposed to public internet) / Low (if behind reverse proxy/VPN).
* **Exploit**: Attacker on the same network can access API directly, bypassing firewall rules intended for the reverse proxy.
* **Remediation**:
  1. Change default to `127.0.0.1`.
  2. Use environment variable `HOST` to override only in Docker/Prod.
  3. Ensure firewall (UFW/AWS SG) blocks port 8001 from external access.

## 2. SQL Injection

* **ID**: SEC-002
* **Finding**: Potential dynamic SQL construction in `backend/scripts/discover_tables.py` (as noted in instructions).
* **File**: `backend/scripts/discover_tables.py`
* **Severity**: **Critical** (if script is accessible via API or run with user input).
* **Exploit**: Malicious input could dump database schema or data.
* **Remediation**:
  1. Audit `discover_tables.py`.
  2. Ensure it uses parameterized queries.
  3. Restrict execution permissions.

## 3. Secrets Management

* **ID**: SEC-003
* **Finding**: `.env` files might be committed or logged.
* **File**: `.env`, logs
* **Severity**: **High**
* **Exploit**: Leaked credentials allow full DB access.
* **Remediation**:
  1. Verify `.gitignore` includes `.env`.
  2. Scan git history for accidental commits.
  3. Ensure `JWT_SECRET` is strong and rotated.

## 4. Authentication

* **ID**: SEC-004
* **Finding**: PIN Auth for supervisors.
* **File**: `backend/api/supervisor_pin.py`
* **Severity**: Medium
* **Exploit**: Brute-force PIN guessing.
* **Remediation**:
  1. Enforce rate limiting (Redis-backed).
  2. Implement exponential backoff.
  3. Alert on multiple failed attempts.

## 5. Dependency Vulnerabilities

* **ID**: SEC-005
* **Finding**: Outdated dependencies.
* **File**: `requirements.txt`, `package.json`
* **Severity**: Medium
* **Remediation**:
  1. Run `pip-audit` or `snyk test`.
  2. Update `fastapi`, `uvicorn`, `motor` to latest stable.
