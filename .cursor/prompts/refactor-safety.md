# Refactor Safety Prompt

Use this when refactoring existing code to ensure no breaking changes.

## Prompt Structure

```
Refactor [component/function] with safety guarantees:

Context:
- Current implementation: [file path and key functions]
- Refactoring goal: [what you want to improve]
- Public API: [list any public interfaces that must not change]

Requirements:
1. NO public API changes (backward compatible)
2. Add missing tests for current behavior (if any gaps)
3. Refactor internal implementation only
4. Run full test suite: `pytest tests/` and `npm test`
5. Commit format: `refactor(scope): <summary>`

Safety checklist:
- [ ] All existing tests pass
- [ ] No new public methods/properties
- [ ] No breaking changes to function signatures
- [ ] Performance maintained or improved
- [ ] Code coverage maintained
```

## Example Usage

**For ERPNext Service Refactor:**
```
Refactor erp_sync_service.py to extract payment calculation logic:
- Keep public API: sync_invoice(), sync_payment() unchanged
- Extract payment_mode_rollup() as private method
- Add tests for payment calculation edge cases
- Run `bench run-tests --app stock_verify`
- Commit as: `refactor(sync): extract payment calculation logic`
```
