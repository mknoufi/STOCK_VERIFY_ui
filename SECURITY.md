# Security Policy

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via:

- **Email**: [Your security contact email]
- **GitHub Security Advisory**: Use the "Report a vulnerability" button on the Security tab
- **Response Time**: We aim to respond within 24 hours for critical issues

Include the following in your report:

- Type of vulnerability
- Location of affected code (file path, line numbers)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability

## Security Standards

### Application Security Status

**Current Rating: EXCELLENT ✅**

As of January 6, 2026:

- **Static Analysis (Bandit)**: Zero HIGH/CRITICAL issues in application code
- **OWASP Top 10 Compliance**: 7/10 PASS
- **Authentication**: JWT with strong secrets, bcrypt password hashing
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Parameterized SQL queries, input sanitization
- **Session Management**: Secure session handling with expiry

### Known Security Issues

**Dependency Vulnerabilities (35 total):**

See [backend/SECURITY_SCAN_RESULTS.md](backend/SECURITY_SCAN_RESULTS.md) for complete details.

**High Priority (requires updates):**

1. **aiohttp 3.13.2** → >=3.14.0 (8 CVEs)
   - Zip bomb DoS, HTTP request smuggling

2. **urllib3 1.26.20** → >=2.2.0 (3 CVEs)
   - Cookie injection, request smuggling, header injection

3. **langchain ecosystem** (13 CVEs)
   - SSRF, XXE, directory traversal

4. **python-jose 3.3.0** → >=3.3.1 (2 CVEs)
   - Algorithm confusion, token validation bypass

5. **starlette 0.41.3** → >=0.42.0 (2 CVEs)
   - Path traversal, request parsing issues

**Risk Assessment: MEDIUM**

While dependencies have known vulnerabilities, the application's security posture mitigates risk:

- Services run in isolated containers
- MongoDB and SQL Server not exposed to internet
- API requires authentication for all endpoints
- Production environment has additional security layers (firewall, WAF)

## Security Scanning Schedule

### Weekly (Automated)

- `pip-audit` for dependency CVE scanning
- Results posted to security dashboard

### Before Each Release (Manual)

- Full `bandit` static analysis scan
- `pip-audit` dependency vulnerability scan
- Manual security review of changed code
- Penetration testing for major features

### Monthly (Compliance)

- Review and update dependencies
- Security patch application
- Compliance verification (OWASP Top 10)
- Access control audit

## Running Security Scans

### Static Analysis (Bandit)

```bash
cd backend
bandit -r . -f json -o bandit_report.json -x tests
```

**Interpreting Results:**

- **HIGH/CRITICAL in application code**: Must fix immediately
- **HIGH in dependencies**: Acceptable for crypto libraries (SHA1 in OAuth, DNSSEC)
- **MEDIUM**: Review and assess risk
- **LOW**: Acceptable (test code, subprocess with validated input)

### Dependency Vulnerability Scan (pip-audit)

```bash
cd backend
pip-audit --format json -o pip_audit_report.json
```

**Interpreting Results:**

- **Critical CVEs**: Update immediately
- **High CVEs**: Update within 1 week
- **Medium CVEs**: Update within 1 month
- **Low CVEs**: Update at next maintenance window

### Manual Security Checklist

Before each release, verify:

- [ ] No hardcoded secrets in code (`git secrets --scan`)
- [ ] All SQL queries use parameterized placeholders (`?`)
- [ ] CORS origins explicitly configured (no wildcards)
- [ ] JWT secret is strong and environment-specific
- [ ] All API endpoints require authentication
- [ ] Input validation on all user-provided data
- [ ] Proper error handling (no sensitive data in errors)
- [ ] HTTPS enforced in production
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)

## Security Best Practices

### Secrets Management

**DO:**

- Use environment variables for all secrets
- Rotate JWT secrets regularly
- Use strong, unique secrets per environment
- Store production secrets in secure vault (AWS Secrets Manager, Azure Key Vault)

**DON'T:**

- Commit secrets to git (check `.gitignore`)
- Share secrets via email/chat
- Use weak or default secrets in production
- Reuse secrets across environments

### Authentication & Authorization

**Current Implementation:**

- JWT tokens with 24-hour expiry
- bcrypt password hashing (cost factor: 12)
- Role-based access control (admin, staff, manager)
- Session invalidation on logout

**Best Practices:**

- Always use `Depends(get_current_user)` for protected endpoints
- Validate user roles in endpoint logic
- Log authentication failures
- Implement rate limiting (planned)

### Database Security

**SQL Server (ERP - Read-Only):**

- Use dedicated read-only account
- Parameterized queries only (NEVER f-strings)
- Connection timeout: 30 seconds
- Schema: Dynamic mapping via `db_mapping_config.py`

**MongoDB (Primary - Read/Write):**

- Authentication required (username/password)
- Network access restricted to application containers
- Regular backups with encryption
- Query injection prevention (use Motor's parameterized queries)

### API Security

**Current Protections:**

- JWT Bearer token authentication
- Request size limits (10MB default)
- CORS configured with explicit origins
- Security headers (X-Content-Type-Options, X-Frame-Options)

**Planned Enhancements:**

- Rate limiting (per endpoint)
- IP allowlisting for sensitive operations
- Request signing for critical APIs
- API key rotation

## Incident Response

### If a Security Vulnerability is Discovered

1. **Containment**
   - Disable affected feature if critical
   - Apply temporary workaround if available
   - Document the issue

2. **Assessment**
   - Determine scope and impact
   - Identify affected users/data
   - Classify severity (Critical, High, Medium, Low)

3. **Remediation**
   - Develop and test fix
   - Deploy hotfix to production (if critical)
   - Update documentation

4. **Communication**
   - Notify affected users (if data breach)
   - Publish security advisory
   - Update SECURITY_SCAN_RESULTS.md

5. **Post-Mortem**
   - Document root cause
   - Implement preventive measures
   - Update security policies

### Contact for Security Issues

- **Email**: [Your security contact]
- **Response Time**: <24 hours for critical, <72 hours for high
- **Emergency**: Open GitHub Security Advisory for immediate response

## Compliance

### Standards We Follow

- **OWASP Top 10 (2021)**: 7/10 compliant
- **CWE Top 25**: Zero critical weaknesses in application code
- **PCI DSS**: N/A (no payment card data processed)
- **GDPR**: Implemented data privacy controls (if applicable)

### Audit Trail

All security-relevant actions are logged:

- Authentication attempts (success/failure)
- Authorization failures
- Data access/modification
- Configuration changes
- Security scan results

Logs are retained for 90 days and available via:

```bash
# Application logs
tail -f backend/logs/app.log

# Security events
grep "SECURITY" backend/logs/app.log
```

## Security Updates

This policy is reviewed and updated:

- After each security incident
- Quarterly (minimum)
- When new vulnerabilities are discovered
- When security standards change

**Last Updated**: January 6, 2026
**Next Review**: April 6, 2026

---

**Thank you for helping keep Stock Verify secure!**
