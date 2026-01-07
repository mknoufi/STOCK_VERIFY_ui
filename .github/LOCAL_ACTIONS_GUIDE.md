# GitHub Local Actions - Quick Start Guide

## ✅ Setup Complete

You now have:

- ✅ **GitHub Local Actions** VS Code extension installed
- ✅ **nektos/act** CLI (v0.2.84) installed
- ✅ **Docker** (v29.1.3) running
- ✅ **11 workflow files** ready to test locally

## 🚀 How to Use

### 1. Open the Extension

- Press `Cmd+Shift+P` → Search for "GitHub Local Actions"
- Or click the GitHub Actions icon in the Activity Bar (left sidebar)

### 2. View Your Workflows

The extension will show:

- **Components**: Check Docker/act status
- **Workflows**: All 11 workflows in `.github/workflows/`
- **History**: Past local runs
- **Settings**: Secrets, variables, inputs

### 3. Run a Workflow Locally

#### Option A: From the Extension UI

1. Click on **Workflows** view
2. Right-click any workflow (e.g., `ci.yml`)
3. Select:
   - "Run Workflow" - runs entire workflow
   - "Run Job" - runs specific job only
   - "Run Event" - trigger specific event

#### Option B: From Command Line

```bash
# List all workflows
act -l

# Run a specific workflow
act -W .github/workflows/ci.yml

# Run just the lint job
act -j lint

# Run with specific event
act push

# Dry run (see what would execute)
act -n
```

## 📋 Recommended First Tests

### 1. Test the CI Workflow (Safest)

```bash
cd /Users/noufi1/cursor\ new/STOCK_VERIFY_2-db-maped
act -W .github/workflows/ci.yml -n  # Dry run first
```

### 2. Test Frontend Linting

```bash
act -W .github/workflows/frontend.yml
```

### 3. Test Code Quality Checks

```bash
act -W .github/workflows/code-quality.yml
```

## ⚙️ Configure Secrets (If Needed)

Some workflows need secrets. Configure them in the extension:

1. Go to **Settings** → **Secrets**
2. Add secrets your workflows use:
   - `GITHUB_TOKEN` (auto-provided by act)
   - Any custom secrets from your workflows

Or create `.secrets` file in project root:

```env
GITHUB_TOKEN=your_token_here
JWT_SECRET=your_jwt_secret
```

Then run:

```bash
act --secret-file .secrets
```

## 🐛 Troubleshooting

### Docker Issues

If workflows fail with Docker errors:

```bash
# Check Docker is running
docker ps

# Restart Docker Desktop if needed
```

### Large Workflows Timing Out

For heavy workflows like `ci-cd.yml`:

```bash
# Use larger runner image
act -P ubuntu-latest=catthehacker/ubuntu:full-latest
```

### Skip Jobs You Don't Need

```bash
# Run specific job only
act -j test-backend

# Skip certain jobs
act --job-filter test-backend
```

## 📚 Useful Commands

```bash
# List all jobs in workflows
act -l

# Run in verbose mode
act -v

# Use specific runner image
act -P ubuntu-latest=node:16-buster

# Run without pulling images
act --pull=false

# Clean up containers after run
act --rm
```

## 🎯 Your Available Workflows

1. **ci.yml** - Main CI pipeline
2. **ci-cd.yml** - Full CI/CD with deployment
3. **test.yml** - Test suite
4. **frontend.yml** - Frontend checks
5. **code-quality.yml** - Linting/formatting
6. **security-scan.yml** - Security checks
7. **docker-publish.yml** - Docker image builds
8. **autofix.yml** - Auto-fix issues
9. **repo-mirror.yml** - Repository sync
10. **ci-cd-debug.yml** - Debug workflows
11. **deploy.yaml** - Deployment

## 💡 Pro Tips

1. **Start Small**: Test simple workflows first (frontend.yml, code-quality.yml)
2. **Dry Run**: Always use `-n` flag first to see what will run
3. **Specific Jobs**: Use `-j` to run only the job you're debugging
4. **Save Time**: Skip Docker pulls with `--pull=false` after first run
5. **View Logs**: Extension keeps history of all local runs

## 🔗 Resources

- [Extension Docs](https://sanjulaganepola.github.io/github-local-actions-docs/)
- [nektos/act Docs](https://github.com/nektos/act)
- [GitHub Actions Reference](https://docs.github.com/en/actions)

---

**Ready to test?** Open the GitHub Local Actions panel in VS Code and try running `ci.yml` locally! 🚀
