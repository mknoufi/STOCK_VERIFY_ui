# Verified Coding Policy

**Version:** 2.1
**Last Updated:** 2025-11-30

---

## 🧩 Purpose

Ensure that every line of code, whether human or AI-generated, is:

- Verified against official documentation
- Type-safe
- Dependency-matched
- Error-free
- Fully tested

---

## ✅ Verification Workflow

| Step | Tool | Required |
|------|------|----------|
| Type Check | `mypy`, `tsc` | ✅ |
| Lint | `flake8`, `eslint` | ✅ |
| Tests | `pytest`, `npm run test` | ✅ |
| Coverage | `pytest --cov`, `npm run test:coverage` | ≥90% |
| Build | `npm run web` | ✅ |
| Diagnostics | `/api/admin/health/detailed` | ✅ |

---

## 🔍 Diagnostic Enforcement

Run these commands after each merge:

```bash
pytest backend/tests/verify_security_api.py
npm run lint && npm run test
curl http://localhost:8001/health/detailed
```

---

## 🧠 AI Coding Guardrails

- Never generate unverified or guessed code.
- Validate import availability before writing code.
- Check dependency versions against local manifests.
- Annotate every function with typing + docstring.
- Use `Result[T, E]` type pattern for backend logic.

---

## 🔧 CI/CD Enforcement

**Pre-commit hooks:**

```bash
pre-commit run -a
pytest
npm run type-check
npm run lint
```

**GitHub Actions:**
Rejects commits failing type/lint/test checks.

---
