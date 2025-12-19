# ERPNext Ledger Safety Prompt

Use this for any code that touches financial transactions or ledger entries.

## Prompt Structure

```
Implement [feature] with ledger safety guarantees:

Context:
- Feature: [describe financial operation]
- Affected doctypes: [Journal Entry, Payment Entry, etc.]
- Business rules: [rounding, timezone, currency]

Requirements:
1. **Idempotent posting**: Write tests proving no duplicate journal entries on retries
2. **Rollback tests**: Test failure paths and ensure proper rollback
3. **Timezone handling**: Always use +05:30 (IST) for India, validate in tests
4. **Rounding**: Test rounding edge cases (0.5, negative amounts)
5. **Pure functions**: Business logic should be pure (no DB access in calculation functions)

Test requirements:
- Test idempotency: call posting function twice, verify single entry
- Test rollback: simulate failure mid-transaction, verify no partial state
- Test timezone: verify timestamps in IST
- Test rounding: verify 0.5 rounds correctly per business rules

Implementation:
- Separate calculation logic (pure functions) from DB operations
- Use transactions for all ledger operations
- Log all financial operations with frappe.logger()
- Require peer review flag in commit message: `[REVIEW:finance-lead]`
```

## Example Usage

**For Payment Mode Rollups:**
```
Implement payment-mode rollups (cash, UPI, card, others) with ledger safety:
- Write tests for rounding and timezone (+05:30)
- Implement pure calculation functions (no DB)
- Add integration tests touching Frappe only at boundary
- Test idempotency: retry payment posting, verify single journal entry
- Test rollback: simulate DB failure, verify no partial payment recorded
- Validate via `bench run-tests --app stock_verify`
```
