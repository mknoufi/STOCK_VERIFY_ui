# 🔒 CRITICAL SECURITY REMEDIATION STEPS

## ⚠️ IMMEDIATE ACTION REQUIRED

Your repository has committed secrets that need to be rotated and removed from Git history.

---

## Step 1: Rotate All Secrets (DO THIS FIRST)

### Generate New Secrets

```bash
# Navigate to backend directory
cd backend

# Generate new secure secrets
python utils/secret_generator.py

# This will output new JWT_SECRET and JWT_REFRESH_SECRET
# Save these somewhere secure (password manager)
```

### Update Production Environment

**BEFORE removing secrets from Git, update your production environment:**

1. If using environment variables (recommended):
   ```bash
   export JWT_SECRET="<new-secret-from-generator>"
   export JWT_REFRESH_SECRET="<new-refresh-secret-from-generator>"
   export SQL_SERVER_PASSWORD="<new-sql-password>"
   ```

2. If using a secret management service:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Update the secrets there

3. Restart your production services with new secrets

---

## Step 2: Create Local .env Files

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend  
cp frontend/.env.example frontend/.env

# Edit backend/.env and add your NEW secrets
# Edit frontend/.env with your configuration
```

**Important:** Never commit these files!

---

## Step 3: Remove Secrets from Git History

### Option A: Using BFG Repo-Cleaner (Recommended - Faster)

```bash
# Install BFG (macOS)
brew install bfg

# Or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Clone a fresh copy of your repo
git clone --mirror https://github.com/your-username/your-repo.git
cd your-repo.git

# Remove the .env files from all history
bfg --delete-files backend/.env
bfg --delete-files frontend/.env

# Clean up the repository
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history)
git push --force
```

### Option B: Using git filter-branch

```bash
# Remove backend/.env from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Remove frontend/.env from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch frontend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history)
git push origin --force --all
git push origin --force --tags
```

---

## Step 4: Verify Secrets Are Removed

```bash
# Check if files are still tracked
git ls-files | grep "\.env$"

# Should return nothing (except .env.example files)

# Search for old secrets in history (optional but recommended)
git log --all --full-history -- backend/.env
git log --all --full-history -- frontend/.env
```

---

## Step 5: Team Coordination

**IMPORTANT:** If you're working with a team:

1. **Notify all team members** before force pushing
2. After force push, all team members must:
   ```bash
   # Backup any local work
   git stash
   
   # Fetch the rewritten history
   git fetch origin
   
   # Reset to the new history
   git reset --hard origin/main  # or your branch name
   
   # Restore local work
   git stash pop
   ```

3. Create new `.env` files from `.env.example`
4. Get new secrets from secure channel (NOT via Git/email)

---

## Step 6: Change SQL Server Password

```sql
-- Connect to SQL Server as admin
-- Change the password for the stockapp user

ALTER LOGIN stockapp WITH PASSWORD = 'NewSecurePassword@2025!';
GO

-- Update your backend/.env with the new password
```

---

## Step 7: Set Up Git Hooks (Prevent Future Incidents)

### Install pre-commit hooks

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml (already done in this fix)

# Install the hooks
pre-commit install
```

This will:
- Detect private keys before commit
- Prevent large files
- Check for secrets
- Validate YAML/JSON files

---

## Step 8: Audit and Monitor

### Check for exposed secrets online

1. Search GitHub (if public repo):
   - Go to: https://github.com/search
   - Search for parts of your old secrets
   - Check if they appear in forks or issues

2. Use tools:
   ```bash
   # Install trufflehog
   pip install trufflehog
   
   # Scan your repository
   trufflehog filesystem . --only-verified
   ```

3. Monitor for unauthorized access:
   - Check MongoDB logs for unusual connections
   - Check SQL Server logs
   - Review application logs for failed auth attempts

---

## Step 9: Update Documentation

- [x] Created `.env.example` files
- [x] Updated `.gitignore`
- [x] Created this remediation guide
- [ ] Update deployment documentation
- [ ] Update onboarding docs for new developers
- [ ] Document secret rotation procedure

---

## Step 10: Implement Long-term Security

### For Production:

1. **Use Secret Management Service:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

2. **Rotate Secrets Regularly:**
   - JWT secrets: Every 90 days
   - Database passwords: Every 90 days
   - API keys: As recommended by provider

3. **Use Different Secrets per Environment:**
   - Development
   - Staging
   - Production

4. **Implement Secret Scanning in CI/CD:**
   ```yaml
   # .github/workflows/security.yml
   name: Secret Scanning
   on: [push, pull_request]
   jobs:
     scan:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Run Gitleaks
           uses: gitleaks/gitleaks-action@v2
   ```

---

## Verification Checklist

- [ ] New secrets generated
- [ ] Production environment updated with new secrets
- [ ] Production services restarted
- [ ] Local `.env` files created from `.env.example`
- [ ] Old `.env` files removed from Git history
- [ ] Force push completed
- [ ] Team members notified and updated
- [ ] SQL Server password changed
- [ ] Pre-commit hooks installed
- [ ] Repository scanned for remaining secrets
- [ ] Monitoring set up for unauthorized access
- [ ] Documentation updated

---

## Emergency Contacts

If you suspect the secrets were compromised:

1. **Immediately** rotate all secrets
2. Review access logs for unauthorized access
3. Check for data exfiltration
4. Consider incident response procedures
5. Notify stakeholders if breach detected

---

## Questions?

- Review: `CODEBASE_ISSUES_REPORT.md` for full security analysis
- Check: `.env.example` files for configuration templates
- Run: `python backend/utils/secret_generator.py --help` for secret generation

**Remember:** Security is an ongoing process, not a one-time fix!