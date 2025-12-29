# Data Model: App Logic Documentation

This is a *documentation* model: it reflects the conceptual entities and (where known) the MongoDB collections used by the Stock Verification System.

## Core Entities

### User
- Key fields (conceptual): `id`, `username`, `role`, `permissions`
- Used for: auth (JWT subject), authorization (RBAC), audit attribution.

### Session (Stock Verification Session)
- Stored in Mongo collections:
  - `sessions` (primary)
  - `verification_sessions` (compatibility mirror)
- Key fields (typical):
  - `session_id` / `_id` (UUID)
  - `warehouse` - warehouse identifier
  - `staff_user`, `staff_name` - assigned user
  - `status`: `OPEN` → `ACTIVE` → `CLOSED`
  - `type`: `STANDARD`, `BLIND`, `STRICT`
  - timestamps: `started_at`, `closed_at`, `reconciled_at`
  - counters: `total_items`, `total_variance`
  - `notes` - optional session notes
- Relationships:
  - Session → many Count Lines
  - Session → many Verification Records
- State transitions:
  - Created → `OPEN` → `ACTIVE` → `CLOSED`
  - Legacy `RECONCILE` status maps to `ACTIVE`

Notes:
- Two collections may store session data: `sessions` (operational) and `verification_sessions` (verification-oriented).
- Status normalizer converts legacy values (e.g., `RECONCILE` → `ACTIVE`).

### ERP Item
- Stored in Mongo: `erp_items` (synced/derived representation)
- Source data: SQL Server (read-only)
- Key fields (typical):
  - `item_code`, `barcode`
  - descriptive: name/description/category
  - inventory: qty/uom/location/batch/serial metadata (as mapped)
  - verification: `verified`, `verified_by`, `verified_at`

### Count Line
- Stored in Mongo: `count_lines`
- Key fields (from `CountLineCreate` schema):
  - `session_id` (required) - links to verification session
  - `item_code` (required) - barcode/SKU
  - `counted_qty` (required) - physical count
  - `damaged_qty` - damaged item count
  - `non_returnable_damaged_qty` - non-returnable damages
  - `damage_included`, `item_condition` - condition tracking
  - `floor_no`, `rack_no`, `mark_location` - location info
  - `sr_no`, `serial_numbers[]` - serial tracking
  - `manufacturing_date`, `expiry_date` - date fields
  - `variance_reason`, `variance_note` - variance explanation
  - `remark`, `photo_base64`, `photo_proofs[]` - documentation
  - `mrp_counted`, `split_section` - price/section
  - `correction_reason`, `correction_metadata` - correction tracking
  - `category_correction`, `subcategory_correction` - category fixes
- Validation rules:
  - If variance exists, `variance_reason` is required.
  - `session_id` must reference active session.
  - `item_code` must exist in `erp_items`.

Lifecycle (states: `draft` → `queued` → `submitted` → `finalized` or `failed`):
- Created (draft/offline queued) → Submitted (online or sync batch) → Finalized (counts included in rollups/reports)

### Verification Record
- Stored in Mongo: `verification_records`
- Purpose: durable record of verification events, especially via offline sync.
- Key fields (typical):
  - `session_id`, `item_code`
  - `action` (verify/unverify/update)
  - `payload` (client-provided details)
  - `created_at`, `device_id` (when applicable)

### Verification Log
- Stored in Mongo: `verification_logs`
- Purpose: audit trail for item verification actions.

### Item Variance
- Stored in Mongo: commonly `variances` (and/or compatibility collections depending on feature modules)
- Purpose: track variance entries produced during verification workflows.

### Item Serial
- Stored in Mongo: `item_serials`
- Purpose: store per-item serials used for duplicate detection and integrity.

### Sync Conflict
- Stored in Mongo: typically `sync_conflicts` (via sync-conflicts feature)
- Purpose: record validation failures/conflicts detected during offline synchronization.
- Common categories (from feature spec + batch sync patterns):
  - duplicate serial
  - locked resource (rack/session locks)
  - invalid quantity / failed validation
  - conflicting records / replayed operations

### Audit Log Entry
- Stored in Mongo: activity logs / error logs collections (varies by feature module)
- Purpose: immutable record of important actions affecting integrity and traceability.

## Cross-Cutting Concerns

### Locks & Caching
- Optional Redis may be used for:
  - rack/session locks
  - caching for item lookup

### Source-of-Truth Rules
- MongoDB is authoritative for operational state (sessions, count lines, verification records).
- SQL Server is authoritative for ERP master/item lookup and is treated as read-only by this system.

### Audit
- Many write paths attribute changes to a user and record timestamps.

## Notes

- This document intentionally avoids hard-coding every field name; it should remain stable even as schemas evolve.
- The primary value is the *relationships* and *state transitions* used in the logic documentation.
