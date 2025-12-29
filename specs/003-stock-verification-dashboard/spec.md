# Feature Specification: Stock Verification Dashboard

**Feature Branch**: `003-stock-verification-dashboard`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "Add a dashboard for stock verification statistics to help managers track progress and identify discrepancies."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Overall Progress (Priority: P1)

As a manager, I want to see a high-level summary of the current stock verification session, including total items counted vs. total items expected, so I can gauge overall progress.

**Why this priority**: This is the core value of the dashboard, providing immediate visibility into the status of the verification process.

**Independent Test**: Can be tested by checking if the dashboard displays correct percentages and counts based on the current session data in MongoDB.

**Acceptance Scenarios**:

1. **Given** a stock verification session is active, **When** I open the dashboard, **Then** I should see a progress bar or percentage showing items counted vs. total items.
2. **Given** no items have been counted yet, **When** I open the dashboard, **Then** the progress should show 0%.

---

### User Story 2 - Identify Discrepancies (Priority: P2)

As a manager, I want to see a list of items where the counted quantity differs from the expected quantity, so I can investigate potential stock issues.

**Why this priority**: Identifying errors is a key part of stock verification.

**Independent Test**: Can be tested by counting an item with a different quantity than expected and verifying it appears in the "Discrepancies" list on the dashboard.

**Acceptance Scenarios**:

1. **Given** an item was counted with a quantity of 5 but expected 10, **When** I view the discrepancies section, **Then** I should see this item listed with the difference.

---

### User Story 3 - Staff Performance (Priority: P3)

As a manager, I want to see how many items each staff member has counted, so I can monitor productivity.

**Why this priority**: Helps in managing resources and identifying training needs.

**Independent Test**: Can be tested by counting items with different user accounts and verifying the counts are correctly attributed on the dashboard.

**Acceptance Scenarios**:

1. **Given** User A counted 50 items and User B counted 30 items, **When** I view the staff performance section, **Then** I should see these totals correctly displayed for each user.

---

### Edge Cases

- What happens when multiple sessions are active? (Dashboard should probably focus on the current/active session).
- How does the system handle items that are counted multiple times? (Should show the latest count or aggregate).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dashboard view accessible to users with 'manager' or 'admin' roles.
- **FR-002**: System MUST calculate real-time statistics from the active stock verification session.
- **FR-003**: System MUST display total items, counted items, and percentage completion.
- **FR-004**: System MUST list items with quantity discrepancies (Counted != Expected).
- **FR-005**: System MUST display a breakdown of counts by staff member.

### Key Entities

- **DashboardStats**: Represents the aggregated data for the dashboard (total_items, counted_items, discrepancy_count, staff_counts).
- **DiscrepancyItem**: Represents an item with a mismatch (barcode, name, expected_qty, counted_qty, difference).
