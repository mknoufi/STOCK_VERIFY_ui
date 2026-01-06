# Release Decision

## Status: ⚠️ Ship with Mitigations

### Justification

The application is functionally sound with a robust architecture (Hybrid DB, Offline-first). However, security configurations regarding network binding and potential script vulnerabilities need immediate addressing before public/production exposure.

### Required Mitigations (Before Go-Live)

1. **Network**: Restrict `HOST` binding to internal network or VPN.
2. **Security**: Verify `discover_tables.py` is not exposed via API.
3. **Secrets**: Rotate `JWT_SECRET` and ensure it's not default.

### Minimum Test Gates

* Pass all Unit Tests (`make python-test`).
* Pass basic E2E Login & Scan flow.
* Verify SQL Server connection is Read-Only (attempt a write and ensure failure).
