# STOCK_VERIFY_2.1 Upgrade Prompt Framework

**Purpose:** Define structured prompts and guardrails for safe system upgrades and AI-assisted development.

---

## 🧩 Prompt Template

```

[UPGRADE ACTION REQUEST]
Goal: <objective>
Scope: <modules>
Preserve: <existing features>
Additions: <new logic/features>
Testing: <tests required>
Documentation: <update paths>

```

---

## 🧠 Behavior Rules

1. Always read `codebase_memory_v2.1.md` before modifying logic.
2. Confirm existence before creating files.
3. Delete only after dependency check.
4. Document all changes.
5. Update `CHANGELOG.md` after success.

---

## 🔄 Upgrade Lifecycle

| Phase | Action | Output |
|--------|---------|--------|
| 1 | Cleanup deprecated docs/modules | Clean workspace |
| 2 | Update dependencies | Verified compatibility |
| 3 | Add new features | Type-safe code |
| 4 | Run tests | 100% pass |
| 5 | Deploy | Verified system |

---

## 🧾 Tagging

Each verified AI-assisted commit must use:

```

[auto-ai][verified] upgrade(<scope>): <summary>

```

---

## 📋 Documentation Updates

After upgrade completion:

- `codebase_memory_v2.1.md` updated
- `verified_coding_policy.md` validated
- `CHANGELOG.md` entry added

---
