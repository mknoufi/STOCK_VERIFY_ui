# Tests-First Development Prompt

Use this prompt template when implementing new features or fixing bugs.

## Prompt Structure

```
Write tests first → implement → run `npm run ci` (or `make ci`) → iterate ≤2 cycles.

Context:
- Feature/Bug: [describe what needs to be built/fixed]
- Affected modules: [list files/doctypes]
- Business rules: [any domain-specific constraints]

Requirements:
1. Write unit tests covering:
   - Happy path
   - Error cases
   - Edge cases
   - Integration boundaries (if applicable)

2. Implement the feature/fix

3. Run CI checks:
   - `pre-commit run -a`
   - `npm run ci` or `make ci`
   - `pytest tests/` (for backend)
   - `npm test` (for frontend)

4. If CI fails, fix and re-run (max 2 iterations)

5. Ensure:
   - Code coverage maintained or improved
   - No regressions in existing tests
   - All linting/formatting passes
```

## Example Usage

**For ERPNext Stock Verification:**
```
Write tests first for barcode scanning feature:
- Test valid barcode lookup
- Test invalid barcode (404)
- Test network timeout
- Test duplicate scan detection
Then implement the feature and run `bench run-tests --app stock_verify`
```
