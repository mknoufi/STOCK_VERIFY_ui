# Detailed Use Cases Documentation

## Authentication Use Cases

### UC-001: User Login
**Actor:** Staff, Supervisor, Admin  
**Flow:**
1. Open app → Login screen
2. Enter credentials
3. Optional: Enable "Remember Me"
4. Submit → Backend validates
5. JWT issued → Stored locally
6. Redirect to role-specific home

**Issues:** Logger error (fixed), console.log statements

---

### UC-002: Role-Based Navigation
**Actor:** System  
**Flow:**
1. Extract role from JWT
2. Filter navigation based on role
3. Show/hide UI elements
4. Enforce API permissions

**Issues:** Need to verify all routes respect permissions

---

## Stock Verification Use Cases

### UC-003: Barcode Scanning
**Actor:** Staff  
**Flow:**
1. Navigate to Scan screen
2. Activate scanner
3. Scan barcode
4. Load item details
5. Display item info

**Issues:** TypeScript errors, error handling gaps

---

### UC-004: Quantity Verification
**Actor:** Staff  
**Flow:**
1. Enter counted quantity
2. Enter damage quantities (optional)
3. Enter MRP if different
4. Select variance reason
5. Capture photo (optional)
6. Submit verification
7. Save to database

**Issues:** Complex state, form validation needs improvement

---

### UC-005: Serial Number Entry
**Actor:** Staff  
**Flow:**
1. Detect serial requirement
2. Enter serial numbers
3. Validate format
4. Check duplicates
5. Save with count line

**Issues:** Complex validation logic

---

## Session Management Use Cases

### UC-006: Create Session
**Actor:** Staff, Supervisor  
**Flow:**
1. Navigate to create session
2. Select warehouse
3. Set session details
4. Create in database
5. Redirect to scan

**Issues:** No duplicate prevention

---

### UC-007: View Session Details
**Actor:** Supervisor  
**Flow:**
1. Navigate to sessions
2. Select session
3. View items and counts
4. Filter and sort
5. Export if needed

**Issues:** Large sessions may be slow

---

## Variance Tracking Use Cases

### UC-008: View Variances
**Actor:** Supervisor  
**Flow:**
1. Navigate to Variances
2. View all variances
3. Filter by criteria
4. Export to CSV
5. Drill down to details

**Issues:** Large lists may be slow

---

## Offline Use Cases

### UC-009: Offline Operation
**Actor:** Staff  
**Flow:**
1. Continue scanning offline
2. Queue operations locally
3. Auto-sync when online
4. Resolve conflicts

**Issues:** No queue size limits

---

### UC-010: Auto-Sync
**Actor:** System  
**Flow:**
1. Detect network restored
2. Sync offline queue
3. Show progress
4. Handle errors

**Issues:** May fail silently

---

## Export Use Cases

### UC-011: CSV Export
**Actor:** Supervisor, Admin  
**Flow:**
1. Navigate to Items/Variances
2. Apply filters
3. Tap Export
4. Generate CSV
5. Download/Share

**Issues:** Large exports may be slow

---

## Search & Filter Use Cases

### UC-012: Item Search
**Actor:** Staff, Supervisor  
**Flow:**
1. Enter search query
2. Real-time results
3. Select item
4. Load details

**Issues:** May be slow with large datasets

---

### UC-013: Advanced Filtering
**Actor:** Supervisor  
**Flow:**
1. Apply filters
2. Combine multiple filters
3. View filtered results
4. Clear filters

**Issues:** Complex combinations may be slow

---

**Total Use Cases Documented:** 13 core use cases
