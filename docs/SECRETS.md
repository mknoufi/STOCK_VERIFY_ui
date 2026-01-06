# Secrets Management Guide

## Overview

This document outlines the secrets management approach for the Stock Verification System. All sensitive configuration values must follow these practices to ensure security and auditability.

---

## 🔐 Secret Categories

### 1. Application Secrets

| Secret | Purpose | Required |
|--------|---------|----------|
| `JWT_SECRET` | Token signing for authentication | ✅ Yes |
| `SESSION_SECRET` | Session encryption | ✅ Yes |
| `API_KEY` | External API access | Optional |

### 2. Database Credentials

| Secret | Purpose | Required |
|--------|---------|----------|
| `MONGO_URI` | MongoDB connection string | ✅ Yes |
| `MONGO_ROOT_USER` | MongoDB admin username | ✅ Yes |
| `MONGO_ROOT_PASSWORD` | MongoDB admin password | ✅ Yes |
| `SQL_SERVER_HOST` | ERP SQL Server hostname | ✅ Yes |
| `SQL_SERVER_USER` | SQL Server username | ✅ Yes |
| `SQL_SERVER_PASSWORD` | SQL Server password | ✅ Yes |

### 3. Infrastructure Secrets

| Secret | Purpose | Required |
|--------|---------|----------|
| `REDIS_PASSWORD` | Redis authentication | Optional |
| `SENTRY_DSN` | Error tracking endpoint | Recommended |
| `GRAFANA_ADMIN_PASSWORD` | Monitoring dashboard | Production |

### 4. External Service Secrets

| Secret | Purpose | Required |
|--------|---------|----------|
| `SMTP_PASSWORD` | Email notifications | Optional |
| `SLACK_WEBHOOK` | Alert notifications | Optional |
| `FIREBASE_KEY` | Push notifications | Optional |

---

## 🛡️ Security Requirements

### Minimum Requirements

1. **Never commit secrets to version control**
   - Use `.gitignore` for all `.env*` files (except templates)
   - Scan commits with secret detection tools

2. **Use strong secret values**
   - Minimum 32 characters for cryptographic secrets
   - Use cryptographically random generation
   - Never use dictionary words or predictable patterns

3. **Rotate secrets regularly**
   - JWT_SECRET: Every 90 days minimum
   - Database passwords: Every 180 days
   - API keys: On suspected compromise

4. **Principle of least privilege**
   - SQL Server user: READ-ONLY access only
   - MongoDB user: Scoped to specific database
   - Service accounts: Minimal required permissions

### Generate Secure Secrets

```bash
# Generate 64-character random secret
openssl rand -hex 32

# Generate base64 encoded secret
openssl rand -base64 32

# Generate URL-safe secret
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## 📁 Environment File Structure

### Development (`.env.local`)

```bash
# NOT for production - development only
JWT_SECRET=dev-secret-not-for-production-use-only
MONGO_URI=mongodb://localhost:27017/stock_verification_dev
LOG_LEVEL=DEBUG
```

### Production (`.env.prod`)

```bash
# Production secrets - NEVER COMMIT THIS FILE
JWT_SECRET=${JWT_SECRET}  # Injected from secret manager
MONGO_URI=${MONGO_URI}    # Injected from secret manager
LOG_LEVEL=INFO
ENVIRONMENT=production
```

### Template Files (`.env.example`)

```bash
# Template - Copy to .env and fill in values
JWT_SECRET=your-secure-secret-here
MONGO_URI=mongodb://username:password@host:27017/database
LOG_LEVEL=INFO
```

---

## 🔄 Secret Injection Methods

### 1. Local Development

Use `.env` files with dotenv:

```python
from dotenv import load_dotenv
load_dotenv()

jwt_secret = os.getenv("JWT_SECRET")
```

### 2. Docker Compose

Use `env_file` directive:

```yaml
services:
  backend:
    env_file:
      - .env.prod
    environment:
      - ENVIRONMENT=production
```

### 3. Kubernetes

Use Kubernetes Secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: stock-verify-secrets
type: Opaque
stringData:
  JWT_SECRET: ${JWT_SECRET}
  MONGO_URI: ${MONGO_URI}
```

Mount in deployment:

```yaml
spec:
  containers:
    - name: backend
      envFrom:
        - secretRef:
            name: stock-verify-secrets
```

### 4. CI/CD Pipelines

**GitHub Actions:**

```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  MONGO_URI: ${{ secrets.MONGO_URI }}
```

**Azure DevOps:**

```yaml
variables:
  - group: stock-verify-secrets
```

---

## 🏢 Production Secret Management

### Recommended Tools

| Tool | Use Case | Integration |
|------|----------|-------------|
| **Azure Key Vault** | Azure deployments | Native SDK |
| **AWS Secrets Manager** | AWS deployments | boto3 |
| **HashiCorp Vault** | Multi-cloud | REST API |
| **1Password Secrets** | Team secrets | CLI/API |

### Azure Key Vault Integration

```python
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
client = SecretClient(
    vault_url="https://stock-verify-vault.vault.azure.net/",
    credential=credential
)

jwt_secret = client.get_secret("JWT-SECRET").value
```

### Environment Variables Mapping

```python
# config.py
import os

class Settings:
    JWT_SECRET: str = os.getenv("JWT_SECRET")

    def __init__(self):
        if not self.JWT_SECRET:
            raise ValueError("JWT_SECRET environment variable required")
        if len(self.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
```

---

## 🔍 Secret Auditing

### Detection Tools

1. **Pre-commit hooks** - Prevent accidental commits

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

2. **GitHub Secret Scanning** - Repository monitoring
3. **TruffleHog** - Git history scanning
4. **Gitleaks** - CI integration

### Audit Logging

Log all secret access (but never the values):

```python
import logging

logger = logging.getLogger("security.audit")

def get_secret(name: str) -> str:
    logger.info(f"Secret accessed: {name}", extra={
        "event": "secret_access",
        "secret_name": name,
        "timestamp": datetime.utcnow().isoformat()
    })
    return os.getenv(name)
```

---

## 🚨 Incident Response

### If Secrets Are Compromised

1. **Immediately rotate** the compromised secret
2. **Revoke** any tokens signed with the old secret
3. **Audit** access logs for unauthorized use
4. **Notify** security team
5. **Document** incident for post-mortem

### Secret Rotation Procedure

```bash
# 1. Generate new secret
NEW_JWT_SECRET=$(openssl rand -hex 32)

# 2. Update secret manager
az keyvault secret set --vault-name stock-verify-vault \
  --name JWT-SECRET --value "$NEW_JWT_SECRET"

# 3. Trigger rolling deployment
kubectl rollout restart deployment/backend

# 4. Verify old tokens are invalidated
# 5. Update documentation
```

---

## 📋 Compliance Checklist

- [ ] All secrets stored in designated secret manager
- [ ] No secrets in version control (verified with scanning)
- [ ] Secret rotation policy documented and scheduled
- [ ] Access to secrets audited and logged
- [ ] Minimum password/key length requirements enforced
- [ ] Separation between development and production secrets
- [ ] Incident response procedure documented
- [ ] Team trained on secret handling

---

## 📚 References

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12-Factor App Config](https://12factor.net/config)
- [Azure Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [HashiCorp Vault Documentation](https://developer.hashicorp.com/vault/docs)

---

*Last updated: January 2025*
