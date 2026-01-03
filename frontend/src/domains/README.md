# Domain Boundaries

This directory contains the domain logic for the application, organized by bounded contexts.

## Domains

### 1. Inventory (`/inventory`)

**Responsibility**: Managing items, stock counts, and barcode scanning.

- **Entities**: `Item`, `StockCount`, `BarcodeScan`.
- **Key Operations**:
  - Fetching item details by barcode.
  - Submitting stock counts.
  - Validating barcode formats.
  - Managing offline sync queue for counts.

### 2. Auth (`/auth`)

**Responsibility**: Managing user sessions, authentication, and permissions.

- **Entities**: `User`, `Session`, `Permission`.
- **Key Operations**:
  - Login/Logout.
  - Token management (refresh, storage).
  - Permission checks (RBAC).
  - User profile management.

### 3. Reports (`/reports`)

**Responsibility**: Generating and viewing discrepancies and historical data.

- **Entities**: `DiscrepancyReport`, `CountHistory`.
- **Key Operations**:
  - Calculating discrepancies between ERP and physical counts.
  - Fetching historical count data.
  - Exporting reports.

## Structure

Each domain folder should follow this structure:

- `/components`: Domain-specific UI components.
- `/hooks`: Domain-specific React hooks (data fetching, logic).
- `/services`: API calls and business logic services.
- `/types`: Domain-specific TypeScript definitions.
- `/utils`: Helper functions specific to the domain.
