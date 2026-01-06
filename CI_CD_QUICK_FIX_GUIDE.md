# CI/CD Quick Fix Guide

**Quick reference for fixing the identified CI/CD issues.**

## 🔴 Critical: Add MongoDB Service to ci.yml

### Location
`.github/workflows/ci.yml` - Line ~19 (in the `python-ci` job)

### Fix
Add this `services:` section to the `python-ci` job (before or after `defaults:`):

```yaml
python-ci:
  name: Python Backend CI
  runs-on: ubuntu-latest
  
  services:
    mongodb:
      image: mongo:7
      ports:
        - 27017:27017
      options: >-
        --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  
  defaults:
    run:
      working-directory: ./backend
```

### Why This Works
- Tests require MongoDB at `mongodb://localhost:27017`
- Same configuration already works in `test.yml`
- Health checks ensure MongoDB is ready before tests run

---

## 🟡 Medium: Pre-commit Cache Issue

### Current Status
The pre-commit job has a "Clear pre-commit cache" step, but the trailing whitespace issue persists.

### Investigation Needed
1. Check if `GITHUB_CI_CD_STATUS.md` file exists in the branch being tested
2. If it exists, remove trailing whitespace
3. If it doesn't exist, the issue may be transient or in a different branch

### Potential Solutions

#### Option A: Run pre-commit locally
```bash
cd /home/runner/work/STOCK_VERIFY_ui/STOCK_VERIFY_ui
pre-commit run --all-files
```

#### Option B: Remove cache clearing (if not needed)
The cache clearing step might be unnecessary. Consider removing it if it's not solving any actual caching issues.

---

## ✅ Status: CI Status Job Works Correctly

The `ci-status` job is functioning as designed. It reports failure when any dependent job fails, which is the correct behavior.

### Optional Enhancement
Add more detailed reporting (see CI_CD_ISSUES_ANALYSIS.md for full example):

```yaml
- name: Check all jobs
  run: |
    echo "=== CI Job Results ==="
    echo "Python CI: ${{ needs.python-ci.result }}"
    echo "Node CI: ${{ needs.node-ci.result }}"
    echo "Pre-commit: ${{ needs.pre-commit.result }}"
```

---

## Testing the Fixes

### 1. Apply MongoDB Fix
```bash
# Edit .github/workflows/ci.yml
# Add services section to python-ci job
git add .github/workflows/ci.yml
git commit -m "fix: add MongoDB service to python-ci job"
git push
```

### 2. Check Pre-commit Status
```bash
# Run locally to see what files have issues
pre-commit run --all-files

# If any files are modified, commit them
git add .
git commit -m "style: fix trailing whitespace issues"
git push
```

### 3. Verify CI Passes
- Go to GitHub Actions
- Check the workflow run
- Verify all jobs show green checkmarks

---

## Command Reference

### Manually trigger CI workflow
```bash
# Using GitHub CLI
gh workflow run ci.yml --ref your-branch-name
```

### Check workflow status
```bash
# List recent runs
gh run list --workflow=ci.yml --limit 5

# View logs for a specific run
gh run view RUN_ID --log
```

### Pre-commit commands
```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run all hooks
pre-commit run --all-files

# Update hooks to latest versions
pre-commit autoupdate

# Clear cache
pre-commit clean
```

---

## Expected Results After Fixes

| Job | Before | After |
|-----|--------|-------|
| Python Backend CI | ❌ Fails (no MongoDB) | ✅ Passes |
| Node.js Frontend CI | ✅ Passes | ✅ Passes |
| Pre-commit Hooks | ⚠️ Fails (whitespace) | ✅ Passes |
| Security Scan | ✅ Passes | ✅ Passes |
| CI Status | ❌ Fails (deps failed) | ✅ Passes |

---

## Rollback Plan

If fixes cause issues:

```bash
# Revert the MongoDB service addition
git revert COMMIT_HASH

# Or restore from backup
git checkout HEAD~1 .github/workflows/ci.yml

# Push the revert
git push
```

---

## Related Documentation

- **Full Analysis**: `CI_CD_ISSUES_ANALYSIS.md`
- **Test Workflow**: `.github/workflows/test.yml` (working example)
- **Pre-commit Config**: `.pre-commit-config.yaml`

---

**Last Updated**: 2026-01-06  
**Quick Fix Priority**: MongoDB Service > Pre-commit Cache Investigation
