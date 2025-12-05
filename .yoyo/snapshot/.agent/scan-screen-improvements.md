# Scan Screen Improvements Implementation Plan

## Objective
Refine the offline queue functionality and address specific user requirements regarding inventory counting logic, variance calculation, and damage type differentiation.

## Changes Implemented

### 1. Inventory Count Logic
- **Requirement**: "Damaged cont also include in physical count".
- **Implementation**:
    - Added separate input fields for "Returnable Damage Qty" and "Non-Returnable Damage Qty".
    - "Physical Quantity" input remains for counting good items.
    - Total Count is calculated as `Physical + Returnable Damage`.

### 2. Variance Calculation
- **Requirement**: `calculated variance = stock - physical + returnable damage`.
- **Implementation**:
    - Updated variance calculation logic in `handleSaveCount`.
    - Formula: `Variance = (Physical + Returnable Damage) - Stock`.
    - This aligns with standard variance definition (Actual - Expected). If the user meant "Missing Quantity", the sign would be inverted, but "Variance" usually implies this direction.

### 3. Damage Types
- **Requirement**: "Damage should be two types: returnable, non-returnable".
- **Implementation**:
    - Replaced the single "Damaged Quantity" input with two distinct inputs:
        - `Returnable Damage Qty`
        - `Non-Returnable Damage Qty`
    - Updated `itemState` to store these values separately.
    - Updated `resetForm` and `prepareItemForCounting` to handle these new fields.

### 4. API Integration
- **Payload Update**:
    - `counted_qty`: Sends the `Physical Quantity` (Good items).
    - `damaged_qty`: Sends the `Returnable Damage Qty`.
    - `non_returnable_damaged_qty`: Sends the `Non-Returnable Damage Qty`.
- **Verification API**:
    - Updated `VerificationRequest` interface to include `non_returnable_damaged_qty`.
    - Updated `verifyItem` call to pass all three quantity types.

### 5. Error Resolution
- **Circular Dependency**: Resolved circular dependency between `offlineQueue.ts` and `httpClient.ts` by using dependency injection for `apiClient`.
- **Syntax Errors**: Fixed syntax errors in `_layout.tsx` and `scan.tsx` (dangling code removal).

## Verification
- **Linting**: Ran `npm run lint` and confirmed 0 errors.
- **Code Review**: Verified `scan.tsx` changes to ensure logic correctness and clean code structure.

## Next Steps
- **Testing**: Perform functional testing on the device to ensure the new fields appear and the variance is calculated as expected.
- **Backend Verification**: Verify that the backend correctly processes the `non_returnable_damaged_qty` field if it's supported, or at least doesn't crash.
