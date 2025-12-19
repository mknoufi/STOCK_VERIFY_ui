<!-- .github/pull_request_template.md -->

## Summary

**What & Why (Business Impact)**
- [Brief description of changes]
- [Business value/impact]
- [Related issue/ticket number if applicable]

## Validation

- [ ] `ci` green locally (`pre-commit run -a` passes)
- [ ] New/updated unit tests added
- [ ] All existing tests pass (`pytest tests/` and `npm test`)
- [ ] Affected modules listed below
- [ ] Code coverage maintained or improved
- [ ] Type checking passes (`mypy backend/` and `npx tsc --noEmit`)

## Affected Modules

- [List all files/modules changed]
- [Document any breaking changes]

## Risk Assessment

- [ ] No data migration required
- [ ] Backward compatible (no breaking API changes)
- [ ] Security review completed (if touching auth/ledgers/payments)
- [ ] Performance impact assessed
- [ ] Error handling tested

## Testing Checklist

- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases tested
- [ ] Integration tested (if applicable)
- [ ] Manual testing completed (if UI changes)
- [ ] No regressions in existing functionality

## Code Quality

- [ ] Diff size ≤ 400 LoC (if larger, explain why)
- [ ] Follows project coding standards
- [ ] Linting passes (`ruff check .` and `eslint`)
- [ ] Formatting passes (`black --check .` and `ruff format`)
- [ ] No hardcoded secrets or credentials
- [ ] Accessibility considered (if UI changes: `aria-*` attributes, responsive layout)

## ERPNext-Specific (if applicable)

- [ ] Ledger operations: idempotent posting tests included
- [ ] Financial transactions: peer review flag added `[REVIEW:finance-lead]`
- [ ] Timezone handling: +05:30 (IST) validated in tests
- [ ] Discount/pricing: pure functions, no DB in business logic
- [ ] Frappe doctypes: schema changes reviewed in ERPNext UI

## Notes for Reviewer

**Scope Boundaries:**
- [What is included in this PR]
- [What is explicitly NOT included (future work)]

**Special Considerations:**
- [Any non-obvious design decisions]
- [Performance optimizations]
- [Security considerations]

**Screenshots/Demo:**
- [If UI changes, include screenshots or demo link]

---

## Commit Metadata

- **Type**: `feat` | `fix` | `refactor` | `test` | `docs` | `chore`
- **Scope**: [module/component name]
- **AI-Assisted**: [ ] Yes (tagged with `[auto-ai]` and `Co-authored-by: cursor-agent`) | [ ] No
