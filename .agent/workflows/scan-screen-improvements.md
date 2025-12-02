---
description: Scan Screen Improvements Implementation Plan
---

# Scan Screen Improvements

## Tasks to Complete

### 1. Fix Serial Number Functionality ✅
- **Location**: `frontend/app/staff/scan.tsx`
- **Issue**: Serial number input not working properly
- **Fix**: Verify serial number capture, storage, and submission logic

### 2. Add Damage Quantity Toggle ✅
- **Location**: `frontend/app/staff/scan.tsx`
- **Change**: Add toggle switch for damage quantity (similar to serial number toggle)
- **Implementation**:
  - Add `damageQtyEnabled` to workflow state
  - Add toggle UI element
  - Add damage quantity input field (conditional)
  - Submit damage quantity with count

### 3. Hide Rack Field ✅
- **Location**: `frontend/app/staff/scan.tsx`
- **Change**: Make rack field optional/hidden
- **Implementation**: Comment out or conditionally hide rack input section

### 4. Make MRP Optional ✅
- **Location**: `frontend/app/staff/scan.tsx`
- **Change**: MRP should not be required
- **Implementation**: Remove validation that makes MRP mandatory

### 5. Display UOM ✅
- **Location**: `frontend/app/staff/scan.tsx`
- **Change**: Show Unit of Measure for each item
- **Implementation**: Display `item.uom_name` or `item.uom_code` in item details

### 6. Add Logout Button ✅
- **Location**: `frontend/app/staff/scan.tsx`
- **Change**: Add logout button to scan screen header
- **Implementation**:
  - Add logout icon/button in header
  - Call logout function from auth store
  - Redirect to login screen

### 7. Reduce Session Card Size ✅
- **Location**: `frontend/app/staff/home.tsx`
- **Change**: Make session cards smaller/more compact
- **Implementation**:
  - Reduce padding and margins
  - Smaller font sizes
  - Tighter spacing

### 8. Display Username ✅
- **Location**: `frontend/app/staff/scan.tsx` and `frontend/app/staff/home.tsx`
- **Change**: Show logged-in user's name
- **Implementation**:
  - Get username from auth store
  - Display in header or top section
  - Show "Welcome, [Username]"

## Implementation Order

1. Display Username (Quick win - header change)
2. Add Logout Button (Quick win - header change)
3. Display UOM (Quick win - template change)
4. Make MRP Optional (Quick win - validation change)
5. Hide Rack Field (Quick win - conditional render)
6. Add Damage Quantity Toggle (Medium - new feature)
7. Reduce Session Card Size (Quick win - style change)
8. Fix Serial Number Functionality (Requires investigation)

## Files to Modify

- `frontend/app/staff/scan.tsx` - Main scan screen (tasks 1-6, 8)
- `frontend/app/staff/home.tsx` - Session list (task 7)

## Testing Checklist

- [ ] Username displays correctly in header
- [ ] Logout button works and redirects to login
- [ ] UOM displays for each item
- [ ] MRP can be left empty
- [ ] Rack field is hidden
- [ ] Damage quantity toggle works
- [ ] Damage quantity submits with count
- [ ] Session cards are smaller
- [ ] Serial number capture works
- [ ] Serial number saves correctly
