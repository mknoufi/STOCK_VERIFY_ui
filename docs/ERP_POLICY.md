# ERP Interaction Policy
## Stock Verify System

## 1. Purpose
This document defines the **permanent and non-negotiable rules** governing interaction between the Stock Verify System and the ERP system (SQL Server).

This policy exists to:
- Prevent data corruption
- Preserve auditability
- Avoid financial and compliance risk
- Enforce clear system boundaries

---

## 2. ERP Role Definition

- The ERP system (SQL Server) is the **source of truth for master data only**.
- The Stock Verify System is a **verification and audit system**, not an ERP module.

---

## 3. PERMANENT CONSTRAINTS (NON-NEGOTIABLE)

The Stock Verify System SHALL NEVER:

- Write data to the ERP database
- Execute INSERT, UPDATE, DELETE, or MERGE statements on ERP tables
- Call ERP stored procedures that modify data
- Trigger ERP stock adjustments (automatic or manual)
- Act as a reconciliation or correction engine
- Maintain shadow ERP quantities intended for sync-back

This restriction applies to:
- Application code
- Background jobs
- Admin tools
- Future versions
- Any “temporary” or “one-time” logic

---

## 4. ALLOWED ERP OPERATIONS

The following operations are explicitly allowed:

- SELECT queries only
- Parameterized read-only queries
- Fetching:
  - Item master data
  - Barcodes
  - MRP
  - UOM
  - Category / Sub-category
- Read-only views preferred over raw tables

---

## 5. DATA OWNERSHIP

| Data Type | Source of Truth |
|---------|----------------|
| Item master | ERP (SQL Server) |
| Stock quantity (system) | ERP |
| Verified physical quantity | Stock Verify (MongoDB) |
| Variance & discrepancies | Stock Verify |
| Audit history | Stock Verify |

No system overwrites another system’s ownership.

---

## 6. ENFORCEMENT

- Any code violating this policy is a **build rejection**
- Any feature request requiring ERP write-back is **out of scope**
- Violations require immediate rollback

---

## 7. AUDIT & COMPLIANCE NOTE

All ERP updates (if required) SHALL be:
- Performed manually or via ERP-native tools
- Based on exported reports or snapshots from Stock Verify
- Outside the responsibility of this system

---

## 8. FINAL STATEMENT

> This policy is permanent and irreversible.  
> The Stock Verify System will never become an ERP write system.

