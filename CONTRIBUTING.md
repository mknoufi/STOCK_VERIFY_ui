# Contributing to Stock Verify

Thank you for your interest in contributing to Stock Verify!

## 🎯 Project Types

### Contributing to the Template (This Repository)

If you want to improve the **template itself** that others will use:

- Submit PRs with improvements to the base template
- Enhance documentation and setup scripts
- Fix bugs in the core functionality
- Add features that benefit all template users

### Working on Your Own Instance

If you created your repository from this template:

- **This is now YOUR repository** - customize freely!
- No need to contribute back unless you want to share improvements to the template
- Follow your own team's contribution guidelines

## 🚀 Setting Up for Development

### For Template Development

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/STOCK_VERIFY_ui.git
   cd STOCK_VERIFY_ui
   ```

2. **Set Up Environment**

   ```bash
   # Backend
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cd ..

   # Frontend
   cd frontend
   npm install
   cd ..
   ```

3. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Making Changes

### Code Style

- **Backend (Python)**: Follow PEP 8, use `black` for formatting, `ruff` for linting
- **Frontend (TypeScript)**: Use ESLint and Prettier configurations
- Run `make format` and `make lint` before committing

### Testing

- Write tests for new features
- Ensure existing tests pass: `make test`
- Run full CI locally: `make ci`

### Commit Messages

Follow conventional commits:

```
feat: add new feature
fix: resolve bug in component
docs: update README
chore: update dependencies
test: add tests for feature
```

### Pre-commit Hooks

We use pre-commit hooks to ensure code quality:

```bash
pip install pre-commit
pre-commit install
```

## 🔍 Pull Request Process

1. **Update Documentation**
   - Update README.md if needed
   - Update TEMPLATE_README.md for template-related changes
   - Add comments for complex logic

2. **Test Thoroughly**

   ```bash
   make ci                    # Run all checks
   make test                  # Run tests
   ./init-new-instance.sh     # Test initialization script (for template changes)
   ```

3. **Create Pull Request**
   - Use the PR template
   - Link related issues
   - Describe changes clearly
   - Add screenshots for UI changes

4. **Code Review**
   - Address review feedback
   - Keep the PR focused and small
   - Rebase if needed

## 🎨 Areas to Contribute

### High Priority

- [ ] Improve template initialization script
- [ ] Add more comprehensive tests
- [ ] Enhance documentation
- [ ] Security improvements
- [ ] Performance optimizations

### Good First Issues

Look for issues labeled `good-first-issue` in the issue tracker.

### Template-Specific Improvements

- Better default configurations
- More example customizations
- Improved error messages in init script
- Better troubleshooting documentation

## � Type Checking & Code Quality

### Python Type Checking (mypy)

We use mypy for Python type checking. Current status: **47 errors** (target: <50).

**Running mypy:**
```bash
make mypy  # Run type checker with project settings
```

**Common mypy patterns in this codebase:**

1. **MongoDB Aggregate Pipelines:**
   ```python
   from typing import Sequence, Mapping, Any
   
   pipeline = [{"$match": {"status": "active"}}, {"$group": {...}}]
   # Motor requires explicit typing:
   typed_pipeline: Sequence[Mapping[str, Any]] = pipeline
   result = await collection.aggregate(typed_pipeline).to_list()
   ```

2. **Dynamic Exception Attributes:**
   ```python
   # Use setattr for attributes not in base Exception class:
   error = ValueError("Custom error")
   setattr(error, "error_code", "ERR_001")  # Type-safe
   ```

3. **Datetime Operations:**
   ```python
   # Explicit type annotations prevent "object has no __sub__" errors:
   start_time: datetime = datetime.utcnow()
   duration = (datetime.utcnow() - start_time).total_seconds()
   ```

4. **Async Context Managers:**
   ```python
   # Must use async def for async context managers:
   async def lifespan_db() -> AsyncGenerator[None, None]:
       await connect_db()
       yield
       await disconnect_db()
   ```

**Configuration:**
- File: `backend/pyproject.toml`
- Uses `--explicit-package-bases` flag
- Ignores: tests, migrations, .venv

### TypeScript Type Checking

Frontend uses TypeScript with strict mode. Current status: **0 errors** ✅

**Running TypeScript checks:**
```bash
cd frontend
npm run typecheck  # Zero errors expected
```

**Common patterns:**
- Use proper interface definitions for API responses
- Type useState hooks: `useState<Type>(initialValue)`
- Define prop types for all components

### Pre-commit Hooks

Set up pre-commit hooks to catch issues early:

```bash
pip install pre-commit
pre-commit install

# Run manually:
pre-commit run --all-files
```

**Hooks include:**
- Black (Python formatting)
- Ruff (Python linting)
- Prettier (JS/TS formatting)
- mypy (Type checking)
- ESLint (TypeScript linting)

## 🔐 Security

- Never commit secrets or credentials
- Use environment variables for sensitive data
- Report security issues privately (see SECURITY.md)
- Review `.gitignore` before committing
- Run security scans before major releases:
  ```bash
  cd backend
  bandit -r . -f json -o bandit_report.json -x tests
  pip-audit --format json -o pip_audit_report.json
  ```

## 📚 Documentation

### What to Document

- New features and their usage
- Configuration options
- Breaking changes
- Migration guides

### Where to Document

- `README.md` - Main usage guide
- `TEMPLATE_README.md` - Template-specific setup
- `.github/copilot-instructions.md` - AI agent guidelines
- `docs/` - Detailed documentation
- Code comments - Complex logic only

## 🧪 Testing Guidelines

### Backend Tests

```bash
cd backend
pytest tests/ -v                          # All tests
pytest tests/test_auth.py -v              # Specific module
pytest tests/ --cov=backend               # With coverage
```

### Frontend Tests

```bash
cd frontend
npm test                                  # All tests
npm run test:watch                        # Watch mode
```

### Integration Tests

- Test across backend and frontend
- Verify initialization script works
- Test Docker deployment

## 🐛 Bug Reports

Use the bug report template and include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Error messages/logs
- Screenshots if applicable

## 💡 Feature Requests

Use the feature request template and include:

- Problem you're trying to solve
- Proposed solution
- Alternatives considered
- Impact on existing functionality

## 🎯 Template vs Instance Contributions

**Template Contributions** (to this repository):

- Core functionality improvements
- Better defaults
- Setup script enhancements
- Documentation improvements

**Instance Customizations** (your own repo):

- Company-specific features
- Custom branding
- Specific integrations
- Business logic

## 📞 Getting Help

- Check [docs/STARTUP_GUIDE.md](docs/STARTUP_GUIDE.md) for setup
- Review [docs/](docs/) for detailed documentation
- Search existing issues
- Create a new issue if needed

## 🙏 Thank You

Every contribution helps make Stock Verify better for everyone. We appreciate:

- Bug reports and fixes
- Documentation improvements
- Feature suggestions
- Code reviews
- Spreading the word

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Questions?** Open an issue or discussion!
