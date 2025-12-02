# Discount & Pricing Schemes Prompt

Use this for implementing discount stacking, supplier schemes, or pricing logic.

## Prompt Structure

```
Generate tests for discount/pricing logic, then implement:

Context:
- Discount types: [item-level %, invoice-level flat, supplier scheme]
- Stacking rules: [how discounts combine]
- Business constraints: [max discount %, minimum order value, etc.]

Requirements:
1. **Pure functions first**: Generate tests for discount calculation functions (no DB)
2. **Test discount stacking**:
   - Item % + invoice flat
   - Supplier scheme + item discount
   - Maximum discount cap
   - Negative discount handling
3. **Integration tests**: Add tests touching Frappe only at the boundary
4. **Edge cases**:
   - Zero amounts
   - Negative amounts (returns)
   - Very large amounts
   - Currency precision

Implementation:
- Calculation functions must be pure (no DB, no side effects)
- Integration tests only for Frappe doctype operations
- Use decimal.Decimal for financial calculations (not float)
- Test with various currency precisions
```

## Example Usage

**For Supplier Discount Scheme:**
```
Generate tests for supplier discount scheme:
- Test item-level % discount (e.g., 10% off)
- Test invoice-level flat discount (e.g., ₹100 off)
- Test supplier scheme (e.g., 5% extra for preferred suppliers)
- Test stacking: item 10% + invoice ₹100 + supplier 5%
- Test maximum discount cap (e.g., max 50% total)
- Implement pure functions, then add Frappe integration tests
- Run `pytest tests/test_discounts.py -v`
```
