# Stock Verification System - In-Depth User Guide

**Version:** 1.0 (Comprehensive Edition)  
**Last Updated:** January 2025  
**Application:** Lavanya E-Mart Stock Verification System  
**Target Audience:** End Users, Supervisors, Administrators, and Technical Staff

---

## Table of Contents

1. [Introduction & System Overview](#introduction--system-overview)
2. [Architecture & Technical Foundation](#architecture--technical-foundation)
3. [Getting Started - Complete Setup](#getting-started---complete-setup)
4. [User Roles & Permissions - Deep Dive](#user-roles--permissions---deep-dive)
5. [Staff Operations - Comprehensive Guide](#staff-operations---comprehensive-guide)
6. [Supervisor Operations - Advanced Management](#supervisor-operations---advanced-management)
7. [Admin Operations - System Administration](#admin-operations---system-administration)
8. [Advanced Features & Workflows](#advanced-features--workflows)
9. [ERPNext Integration & Synchronization](#erpnext-integration--synchronization)
10. [Troubleshooting - Complete Reference](#troubleshooting---complete-reference)
11. [Best Practices & Optimization](#best-practices--optimization)
12. [Security & Compliance](#security--compliance)
13. [Performance Tuning](#performance-tuning)
14. [API Reference & Integration](#api-reference--integration)
15. [FAQ - Extended](#faq---extended)

---

## Introduction & System Overview

### What is the Stock Verification System?

The Stock Verification System is an enterprise-grade inventory management solution designed to bridge the gap between physical stock counts and digital records. It provides real-time synchronization with ERPNext (v15+), enabling accurate inventory tracking, variance detection, and comprehensive reporting.

### Core Purpose

1. **Physical Stock Verification**: Count actual inventory on warehouse floors
2. **Variance Detection**: Identify discrepancies between system and physical stock
3. **Real-time Synchronization**: Keep ERPNext updated with latest counts
4. **Audit Trail**: Maintain complete history of all verification activities
5. **Multi-platform Access**: Support mobile field operations and web-based management

### System Components

#### Backend Architecture
- **FastAPI Server**: RESTful API with async operations
- **MongoDB**: Primary database for verification data
- **SQL Server**: Read-only connection to ERPNext for item/master data
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: Granular permission system

#### Frontend Architecture
- **React Native (Expo)**: Cross-platform mobile application
- **Expo Router**: File-based routing system
- **TypeScript**: Type-safe development
- **Zustand**: Global state management
- **AsyncStorage**: Local data persistence
- **Dynamic IP/Port Discovery**: Automatic backend connection

### Key Technologies

- **Backend**: Python 3.10+, FastAPI, Motor (MongoDB async driver), pymssql/pyodbc
- **Frontend**: React Native 0.81.5, Expo SDK 54, TypeScript 5.9
- **Authentication**: JWT with refresh tokens, Argon2 password hashing
- **Database**: MongoDB (operational), SQL Server (ERPNext read-only)
- **Infrastructure**: Docker, Nginx, systemd services

---

## Architecture & Technical Foundation

### Database Architecture

#### MongoDB Collections

1. **sessions**: Stock verification sessions
   - Fields: id, warehouse_name, floor, rack, status, created_by, created_at, closed_at
   - Indexes: id (unique), warehouse_name, status, created_at

2. **count_lines**: Individual item counts within sessions
   - Fields: id, session_id, item_code, counted_qty, system_qty, variance, mrp_counted, correction_reason
   - Indexes: session_id, item_code, approval_status

3. **erp_items**: Cached ERPNext item data
   - Fields: item_code, item_name, barcode, mrp, stock_qty, uom
   - Indexes: item_code (unique), barcode

4. **users**: System users and authentication
   - Fields: username, hashed_password, role, permissions, is_active
   - Indexes: username (unique), role

5. **activity_logs**: Audit trail of all actions
   - Fields: user, action, resource_type, resource_id, timestamp, details
   - Indexes: user, timestamp, action

6. **error_logs**: System errors and exceptions
   - Fields: error_type, message, stack_trace, timestamp, user, severity
   - Indexes: timestamp, severity

#### SQL Server Connection

- **Purpose**: Read-only access to ERPNext database
- **Connection Methods**: 
  - Primary: `pymssql` (pure Python, no ODBC driver required)
  - Fallback: `pyodbc` (requires ODBC Driver 17 for SQL Server)
- **Configuration**: Environment variables in `.env` file
- **Connection Pooling**: Managed by connection pool service
- **Query Optimization**: Indexed queries, connection reuse

### Authentication & Security

#### JWT Token System

1. **Access Token**
   - Lifetime: 15 minutes (configurable)
   - Contains: user_id, username, role, permissions
   - Stored: In-memory (frontend), not persisted

2. **Refresh Token**
   - Lifetime: 7 days (configurable)
   - Stored: HTTP-only cookie (web) or secure storage (mobile)
   - Used: To obtain new access tokens

3. **Token Refresh Flow**
   ```
   Client → /api/auth/refresh → New Access Token
   If refresh token expired → Redirect to login
   ```

#### Password Security

- **Hashing Algorithm**: Argon2 (primary) or bcrypt (fallback)
- **Salt**: Automatically generated per password
- **Minimum Requirements**: 
  - 8 characters minimum
  - Recommended: Mixed case, numbers, special characters

#### Permission System

Permissions are hierarchical:
- **Role-based**: Each role has default permissions
- **User-specific**: Additional permissions can be granted
- **Resource-level**: Permissions checked per API endpoint

Example permission structure:
```
staff:
  - session.create
  - session.read (own only)
  - count_line.create
  - item.read

supervisor:
  - All staff permissions +
  - session.read_all
  - count_line.approve
  - export.all

admin:
  - All permissions
```

### Network Architecture

#### Dynamic Backend Discovery

The frontend automatically discovers the backend server:

1. **IP Detection**
   - Mobile: Uses device's network interface
   - Web: Uses browser's network API
   - Fallback: Manual configuration

2. **Port Discovery**
   - Scans common ports: 8000, 5000, 3000
   - Timeout: 5 seconds per port
   - Caching: Results cached for 5 minutes

3. **Connection Retry**
   - Initial retry: 3 attempts
   - Exponential backoff: 1s, 2s, 4s
   - Network change detection: Re-discovers on network change

---

## Getting Started - Complete Setup

### Prerequisites

#### For Mobile Users

1. **Device Requirements**
   - iOS: 13.0 or higher
   - Android: 8.0 (API level 26) or higher
   - Camera: Required for barcode scanning
   - Storage: 50MB free space minimum
   - Network: Wi-Fi or mobile data

2. **App Installation**
   - **Development**: Use Expo Go app
   - **Production**: Install from app store (when available)
   - **Permissions**: Grant camera and network access

#### For Web Users

1. **Browser Requirements**
   - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
   - JavaScript enabled
   - Cookies enabled
   - Local storage enabled

2. **Network Requirements**
   - Access to backend server (same network or VPN)
   - Port 8000 (or configured port) accessible
   - No firewall blocking API calls

### Initial Configuration

#### Backend Setup

1. **Environment Variables** (`.env` file)
   ```env
   # MongoDB
   MONGODB_URL=mongodb://localhost:27017/stock_verify
   
   # SQL Server (ERPNext)
   SQL_SERVER_HOST=192.168.1.109
   SQL_SERVER_PORT=1433
   SQL_SERVER_DATABASE=erpnext_db
   SQL_SERVER_USER=erpnext_user
   SQL_SERVER_PASSWORD=your_password
   PREFER_PYMSQL=true
   
   # JWT
   SECRET_KEY=your-32-character-secret-key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=15
   REFRESH_TOKEN_EXPIRE_DAYS=7
   
   # Server
   HOST=0.0.0.0
   PORT=8000
   ENVIRONMENT=development
   ```

2. **Database Initialization**
   ```bash
   cd backend
   python -m scripts.init_database
   ```

3. **Default Users Creation**
   - Automatically created on first startup:
     - `admin` / `admin123` (change immediately)
     - `supervisor` / `super123`
     - `staff1` / `staff123`

#### Frontend Configuration

1. **Environment Variables** (`.env` file in backfron/)
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.18:8000
   EXPO_PUBLIC_ENVIRONMENT=development
   ```

2. **Installation**
   ```bash
   cd backfron
   npm install
   ```

3. **Development Server**
   ```bash
   # Mobile
   npm start
   # Then scan QR code with Expo Go
   
   # Web only
   npm run web
   ```

### First Login Workflow

1. **Launch Application**
   - Mobile: Open app from device
   - Web: Navigate to application URL

2. **Backend Connection**
   - App automatically detects backend
   - Loading screen shows connection status
   - If connection fails, check network settings

3. **Login Credentials**
   - Enter username and password
   - Tap/Click "Login"
   - First login may take longer (token generation)

4. **Session Persistence**
   - Login state saved locally
   - Auto-login on app restart (if token valid)
   - Logout required to change user

---

## User Roles & Permissions - Deep Dive

### Staff Role

#### Capabilities

1. **Session Management**
   - Create new counting sessions
   - View own sessions only
   - Update own open sessions
   - Close own sessions
   - Cannot delete sessions

2. **Item Operations**
   - Search items by name, code, or barcode
   - View item details (read-only from ERPNext)
   - Create count lines for items
   - Update physical counts
   - Update MRP (with variance reason)

3. **Data Access**
   - View own session history
   - Export own session data
   - Cannot view other staff sessions
   - Cannot access supervisor/admin features

#### Limitations

- Cannot approve/reject count lines
- Cannot view all sessions
- Cannot perform bulk operations
- Cannot access analytics
- Cannot manage users
- Cannot configure system

### Supervisor Role

#### Capabilities

1. **All Staff Capabilities** (inherited)

2. **Extended Session Management**
   - View all sessions (all staff)
   - Filter sessions by multiple criteria
   - Bulk close sessions
   - Bulk reconcile sessions
   - Bulk export sessions

3. **Approval Workflow**
   - Approve count lines
   - Reject count lines (with reason)
   - View pending approvals
   - Set approval status

4. **Analytics & Reporting**
   - View session analytics
   - Variance analysis
   - Staff performance metrics
   - Generate reports
   - Export in multiple formats

5. **MRP Management**
   - Update item MRP
   - Bulk MRP updates
   - View MRP change history

6. **Sync Management**
   - Trigger manual sync
   - Resolve sync conflicts
   - View sync status
   - Review sync logs

#### Limitations

- Cannot create/delete users
- Cannot modify system configuration
- Cannot access security logs
- Cannot modify permissions
- Cannot access admin dashboard

### Admin Role

#### Capabilities

1. **All Supervisor Capabilities** (inherited)

2. **User Management**
   - Create new users
   - Edit user details
   - Assign roles
   - Grant/revoke permissions
   - Activate/deactivate users
   - Reset passwords

3. **System Configuration**
   - Database mapping configuration
   - SQL Server connection settings
   - System parameters
   - Feature toggles

4. **Security & Monitoring**
   - View security dashboard
   - Monitor failed login attempts
   - Block suspicious IPs
   - View audit logs
   - Terminate active sessions

5. **System Health**
   - View system metrics
   - Monitor resource usage
   - Check database connections
   - View error logs
   - Service controls

6. **Advanced Features**
   - Direct database access (read-only)
   - System maintenance mode
   - Backup/restore operations
   - Log management

---

## Staff Operations - Comprehensive Guide

### Creating a Counting Session

#### Detailed Workflow

1. **Navigate to Home Screen**
   - After login, you're automatically on Staff Home
   - If not, tap "Home" in navigation

2. **Start New Session**
   - Tap "Start New Counting Session" button
   - Modal appears with input fields

3. **Enter Session Details**

   **Warehouse Name** (Required)
   - Purpose: Identifies the physical location
   - Format: Free text, 2-100 characters
   - Examples: "Main Warehouse", "Store A", "Distribution Center 1"
   - Validation: 
     - Cannot be empty
     - Cannot contain special characters: < > " '
     - Case-sensitive (for filtering)

   **Floor Number** (Optional)
   - Purpose: Sub-location within warehouse
   - Format: Free text, up to 50 characters
   - Examples: "Ground Floor", "1st Floor", "Basement", "A-1"
   - Use cases:
     - Multi-level warehouses
     - Section identification
     - Zone organization

   **Rack Number** (Optional)
   - Purpose: Specific storage location
   - Format: Free text, up to 50 characters
   - Examples: "Rack A-12", "Shelf 3", "Bin 45"
   - Use cases:
     - Precise item location
     - Inventory organization
     - Quick item retrieval

4. **Create Session**
   - Tap "Create Session" button
   - Validation occurs:
     - Warehouse name required
     - Length checks
     - Character sanitization
   - On success:
     - Session created in database
     - Redirected to scan screen
     - Session ID passed as parameter

#### Session States

- **OPEN**: Active session, can add/modify counts
- **CLOSED**: Completed session, read-only
- **RECONCILE**: Marked for reconciliation
- **CANCELLED**: Cancelled session (admin only)

### Item Scanning Methods

#### Method 1: Barcode Scanner (Mobile Only)

**Technical Details**

1. **Camera Integration**
   - Uses Expo Camera API
   - Supports both front and back cameras
   - Auto-focus enabled
   - Flash support (if available)

2. **Barcode Detection**
   - Formats supported: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code
   - Detection rate: Real-time (30fps)
   - Timeout: 5 seconds per scan attempt

3. **Scanning Workflow**
   ```
   User taps scan button
   → Camera opens
   → Barcode detected
   → Item lookup via API
   → Item details displayed
   → Camera closes automatically
   ```

4. **Rate Limiting**
   - Maximum 5 scans per barcode per 15 seconds
   - Prevents duplicate scanning
   - Alert shown if limit exceeded

5. **Error Handling**
   - Camera permission denied: Shows permission request
   - Barcode not found: Shows "Item not found" message
   - Network error: Retries 3 times with backoff
   - Invalid barcode: Shows error message

**Best Practices**
- Ensure good lighting
- Hold device steady
- Keep barcode flat and in focus
- Clean camera lens regularly
- Use flash in low light

#### Method 2: Manual Barcode Entry (6-Digit Auto-Search)

**Technical Implementation**

1. **Auto-Search Trigger**
   - Triggers when exactly 6 digits entered
   - Also triggers on full barcode (>6 digits)
   - Debounce: 500ms delay before search

2. **Search Algorithm**
   - Searches item barcode field
   - Partial match from start of barcode
   - Case-insensitive
   - Results limited to 20 items

3. **User Experience**
   ```
   User types: "123456"
   → Auto-search triggered
   → API call: /api/items/search?barcode=123456
   → Results displayed in dropdown
   → User selects item
   → Item details loaded
   ```

4. **Search Optimization**
   - Caches recent searches (5 minutes)
   - Debounced to reduce API calls
   - Loading indicator during search
   - Empty state message if no results

**Use Cases**
- Damaged barcode (cannot scan)
- Barcode not in camera view
- Quick entry for known items
- Backup when camera unavailable

#### Method 3: Search by Item Name

**Search Functionality**

1. **Search Fields**
   - Item name (partial match)
   - Item code (exact or partial)
   - Barcode (partial)
   - Description (if available)

2. **Search Algorithm**
   - Minimum 2 characters required
   - Searches as you type (debounced)
   - Results sorted by relevance
   - Highlights matching text

3. **Search Results Display**
   - Item name
   - Item code
   - Current stock
   - MRP
   - Stock status badge

4. **Performance**
   - Results limited to 50 items
   - Pagination for large result sets
   - Cached for 2 minutes
   - Indexed database queries

### Item Count Workflow

#### Step-by-Step Process

1. **Item Selection**
   - Item details automatically loaded
   - System stock displayed
   - MRP and sale price shown
   - Stock status badge displayed

2. **Enter Physical Count**

   **Quantity Input**
   - Field: "Physical Quantity"
   - Type: Numeric only
   - Validation:
     - Must be positive number
     - Decimals allowed (for weight/volume items)
     - Maximum: 999,999
   - Quick buttons: 1, 5, 10, 20, 50, 100
   - Calculator mode: Available for complex calculations

   **Quick Count Buttons**
   - Purpose: Speed up common counts
   - Behavior: Sets quantity directly
   - Can be combined: Tap multiple times to add
   - Example: Tap "10" twice = 20

3. **Update MRP (Optional)**

   **When to Update MRP**
   - Price change detected
   - New pricing structure
   - Promotional pricing
   - Correction of incorrect MRP

   **MRP Input**
   - Field: "MRP (optional)"
   - Type: Numeric, 2 decimal places
   - Validation:
     - Must be positive
     - Cannot be zero
     - Maximum: 999,999.99
   - Auto-formatting: Adds currency symbol
   - Change indicator: Shows difference from system MRP

   **MRP Variants**
   - System may suggest MRP variants
   - Based on item history
   - User can select from dropdown
   - Or enter custom value

4. **Variance Reason (If Variance Exists)**

   **When Required**
   - Physical count differs from system stock
   - Variance > 0 (positive or negative)

   **Reason Selection**
   - Dropdown list of predefined reasons
   - Examples:
     - "Stock adjustment"
     - "Damaged items"
     - "Theft/Loss"
     - "Found items"
     - "System error"
   - Custom note: Additional details (optional)

   **Variance Calculation**
   ```
   Variance = Physical Count - System Stock
   Variance % = (Variance / System Stock) × 100
   ```

5. **Item Condition (Advanced)**

   **Condition Types**
   - Good: Normal condition
   - Damaged: Packaging or item damaged
   - Expired: Past expiration date
   - Aging: Near expiration
   - Slow Moving: Low turnover

   **Condition Selection**
   - Dropdown or buttons
   - Affects variance reason suggestions
   - Logged in activity log

6. **Serial Number Capture (If Required)**

   **When Required**
   - Item has serial_requirement = "required"
   - Item has serial_requirement = "dual"
   - User enables serial capture manually

   **Serial Input**
   - One input per serial number
   - Auto-uppercase
   - Duplicate detection
   - Minimum count: Matches physical quantity
   - Photo proof: Can attach photo per serial

   **Serial Requirements**
   - Single: 1 serial per item
   - Dual: 2 serials per item (e.g., IMEI + Serial)
   - Optional: User can enable/disable

7. **Photo Proof (Optional)**

   **Photo Types**
   - Item: Photo of the item
   - Shelf: Photo of shelf location
   - Serial: Photo of serial number label
   - Damage: Photo of damaged item

   **Photo Capture**
   - Mobile: Uses device camera
   - Web: File upload
   - Format: JPEG or PNG
   - Maximum size: 5MB per photo
   - Compression: Automatic optimization

8. **Remarks (Optional)**

   **Purpose**
   - Additional notes about the count
   - Special circumstances
   - Observations
   - Instructions for supervisor

   **Format**
   - Free text
   - Maximum: 500 characters
   - Supports line breaks
   - Saved with count line

9. **Save Count**

   **Validation Before Save**
   - Physical quantity required
   - Variance reason (if variance exists)
   - Serial numbers (if required)
   - All validations pass

   **Save Process**
   ```
   User taps "Save Count"
   → Validation runs
   → API call: POST /api/count-lines
   → Count line created
   → Variance calculated
   → Risk flags detected
   → Approval status set
   → Success message shown
   → Form cleared for next item
   ```

   **After Save**
   - Count line saved to database
   - Variance calculated and stored
   - Activity logged
   - If high risk: Flagged for supervisor review
   - Form resets for next item
   - Success toast notification

### Understanding Item Display

#### Item Information Card

**Displayed Information**

1. **Basic Details**
   - Item Code: System identifier (e.g., "ITEM-001")
   - Item Name: Full descriptive name
   - Barcode: Primary barcode number
   - Description: Additional item details

2. **Pricing Information**
   - MRP: Maximum Retail Price
   - Sale Price: Current selling price
   - Price Change Indicator: Shows if MRP changed

3. **Stock Information**
   - Current Stock: System-recorded quantity
   - UOM: Unit of Measurement (Nos, Kgs, Ltrs, etc.)
   - Stock Status: Visual badge (In Stock/Low Stock/Out of Stock)

4. **Additional Details**
   - Warehouse: Item location
   - Last Updated: Timestamp of last stock update
   - Serial Requirement: If serial numbers needed

#### Stock Status Badges

- 🟢 **In Stock**: Stock available, above threshold
- 🟡 **Low Stock**: Stock below reorder level
- 🔴 **Out of Stock**: No stock available (0 or negative)

#### Variance Display

When physical count differs from system stock:

- **Positive Variance**: Physical count > System stock
  - Display: Green badge, "+" prefix
  - Example: "+5 items found"
  
- **Negative Variance**: Physical count < System stock
  - Display: Red badge, "-" prefix
  - Example: "-3 items missing"

- **Variance Percentage**: Shows relative difference
  - Formula: (Variance / System Stock) × 100
  - High variance (>10%): Flagged for review

### Power Saving Features (Mobile)

#### Screen Timeout

**Configuration**
- Default: 2 minutes of inactivity
- Customizable: Via settings (future feature)
- Behavior: Screen turns off, app continues running

**Inactivity Detection**
- No touch input
- No keyboard input
- No barcode scans
- Timer resets on any interaction

**Wake Up**
- Tap screen anywhere
- Screen immediately turns on
- App state preserved
- No data loss

#### Wake Lock

**Purpose**: Keep screen on during active scanning

**Activation**
- Automatically enabled during:
  - Barcode scanning
  - Item count entry
  - Serial number capture
  - Photo capture

**Deactivation**
- Automatically disabled when:
  - Scanner closed
  - Item saved
  - 30 seconds of no activity

#### Network Throttling

**Optimization**
- Reduces API calls when possible
- Batches multiple requests
- Caches responses
- Retries with exponential backoff

**Impact**
- Reduces battery drain
- Saves mobile data
- Improves performance
- Maintains functionality

### Session History

#### Viewing History

1. **Access**
   - From Staff Home screen
   - Scroll to "Recent Sessions" section
   - Or tap "View History" button

2. **Session List**
   - Sorted by date (newest first)
   - Pagination: 20 sessions per page
   - Each session shows:
     - Warehouse name
     - Floor and rack (if provided)
     - Date and time
     - Total items counted
     - Status badge
     - Variance summary

3. **Session Details**
   - Tap session to view details
   - Shows all count lines
   - Filter by item
   - Export session data

#### Session Statuses

- **Open**: Active, can modify
- **Closed**: Completed, read-only
- **Reconciled**: Verified and synced
- **Cancelled**: Cancelled (admin only)

---

## Supervisor Operations - Advanced Management

### Supervisor Dashboard

#### Dashboard Overview

**Key Metrics Cards**

1. **Total Sessions**
   - Count: All sessions ever created
   - Trend: Comparison with previous period
   - Filter: By date range

2. **Open Sessions**
   - Count: Currently active sessions
   - List: Quick access to open sessions
   - Action: Bulk close option

3. **Items Counted**
   - Total: Sum of all counted items
   - Average: Per session
   - Trend: Daily/weekly/monthly

4. **Total Variance**
   - Amount: Sum of all variances
   - Positive: Items found
   - Negative: Items missing
   - Financial Impact: Calculated value

#### Real-time Updates

- Auto-refresh: Every 30 seconds (configurable)
- Manual refresh: Pull down to refresh
- Notifications: New sessions, high variances

### Session Management

#### Advanced Filtering

**Filter Criteria**

1. **Status Filter**
   - Options: All, Open, Closed, Reconcile, Cancelled
   - Multiple selection: Yes
   - Default: All

2. **Warehouse Filter**
   - Options: All warehouses or specific
   - Search: Type to filter list
   - Multiple selection: Yes

3. **Date Range Filter**
   - Start Date: Calendar picker
   - End Date: Calendar picker
   - Presets: Today, This Week, This Month, Custom
   - Time zone: Server time (UTC)

4. **Staff Filter**
   - Options: All staff or specific user
   - Search: Type to find user
   - Multiple selection: Yes

5. **Variance Filter**
   - Options: All, Positive Only, Negative Only, High Variance (>10%)
   - Amount Range: Min and max variance
   - Financial Impact: Min and max value

**Filter Combinations**
- All filters can be combined
- AND logic (all conditions must match)
- Saved filters: Save frequently used combinations
- Reset: Clear all filters

#### Bulk Operations

**Selecting Sessions**

1. **Individual Selection**
   - Checkbox on each session card
   - Visual feedback: Selected sessions highlighted
   - Count: Shows number of selected sessions

2. **Select All**
   - "Select All" button
   - Selects all visible sessions (current page)
   - "Select All Pages" for all sessions

3. **Clear Selection**
   - "Clear" button
   - Deselects all sessions

**Bulk Actions**

1. **Close Sessions**
   - Action: Marks selected sessions as closed
   - Validation: Only open sessions can be closed
   - Result: Sessions become read-only
   - Notification: Success message with count

2. **Reconcile Sessions**
   - Action: Marks sessions for reconciliation
   - Purpose: Indicates sessions ready for ERPNext sync
   - Status: Changes to "RECONCILE"
   - Notification: Success message

3. **Export Sessions**
   - Format: Excel, CSV, or JSON
   - Content: All count lines in selected sessions
   - Includes: Item details, variances, remarks
   - Download: File generated and downloaded

**Bulk Operation Workflow**
```
Select sessions
→ Click "Bulk" button
→ Choose action
→ Confirm in modal
→ Operation executes
→ Results shown
→ Sessions updated
```

### Approval Workflow

#### Count Line Approval

**Approval States**

1. **PENDING**
   - Initial state after creation
   - No action required
   - Can be modified by creator

2. **NEEDS_REVIEW**
   - High-risk variance detected
   - Requires supervisor approval
   - Cannot be modified
   - Shows in "Pending Approvals" list

3. **APPROVED**
   - Supervisor approved
   - Ready for sync
   - Cannot be modified
   - Locked for ERPNext sync

4. **REJECTED**
   - Supervisor rejected
   - Can be modified by creator
   - Requires new submission
   - Rejection reason logged

**Risk Detection**

Automatic flagging for review when:
- Variance > 10% of system stock
- Variance > 100 units
- Financial impact > threshold
- Duplicate correction for same item
- Negative variance > 50 units
- MRP change > 20%

**Approval Process**

1. **View Pending Approvals**
   - Navigate to "Approvals" section
   - Filter by session, warehouse, date
   - Sort by risk level, date, variance

2. **Review Count Line**
   - View item details
   - Check variance and reason
   - Review remarks and photos
   - Check item history

3. **Approve or Reject**
   - **Approve**: 
     - Click "Approve" button
     - Optional: Add approval note
     - Status changes to APPROVED
     - Ready for sync
   
   - **Reject**:
     - Click "Reject" button
     - Required: Enter rejection reason
     - Status changes to REJECTED
     - Creator notified (if implemented)

### Analytics & Reporting

#### Session Analytics

**Available Metrics**

1. **Session Statistics**
   - Total sessions created
   - Average items per session
   - Average time per session
   - Session completion rate

2. **Variance Analysis**
   - Total variance amount
   - Average variance per session
   - Variance distribution (histogram)
   - Top variance items
   - Variance trends over time

3. **Staff Performance**
   - Items counted per staff
   - Average accuracy (low variance)
   - Sessions completed
   - Time efficiency

4. **Warehouse Analysis**
   - Variance by warehouse
   - Items counted per warehouse
   - High-variance warehouses
   - Warehouse comparison

**Analytics Views**

1. **Summary Dashboard**
   - Key metrics at a glance
   - Charts and graphs
   - Trend indicators
   - Quick filters

2. **Detailed Reports**
   - Exportable data
   - Custom date ranges
   - Multiple formats
   - Scheduled reports

#### Report Generation

**Report Types**

1. **Session Report**
   - All count lines in session
   - Variances and reasons
   - Staff information
   - Timestamps

2. **Variance Report**
   - Items with variances
   - Sorted by variance amount
   - Financial impact
   - Resolution status

3. **Staff Performance Report**
   - Individual staff metrics
   - Comparison with team
   - Accuracy scores
   - Productivity metrics

4. **Warehouse Report**
   - Warehouse-level summary
   - Item distribution
   - Variance patterns
   - Recommendations

**Export Formats**

- **Excel (.xlsx)**: Formatted spreadsheet
- **CSV**: Raw data, comma-separated
- **JSON**: Structured data for integration
- **PDF**: Formatted document (future)

### MRP Management

#### Updating Item MRP

**When to Update MRP**

- Price changes from supplier
- Promotional pricing
- Correction of incorrect MRP
- Seasonal adjustments
- Bulk price updates

**Update Process**

1. **Search Item**
   - Use MRP update modal
   - Search by name, code, or barcode
   - Select item from results

2. **View Current MRP**
   - Current MRP displayed
   - Last updated timestamp
   - Change history (if available)

3. **Enter New MRP**
   - Input new MRP value
   - Validation: Must be positive number
   - Preview: Shows difference

4. **Update**
   - Click "Update MRP"
   - Confirmation required
   - Update saved to database
   - ERPNext sync triggered (if configured)

**Bulk MRP Update**

1. **Select Items**
   - Multiple items can be selected
   - Or upload CSV file with item codes and MRPs

2. **Apply Update**
   - Same MRP for all: Enter once
   - Different MRPs: Upload file
   - Preview changes before applying

3. **Validation**
   - All MRPs validated
   - Errors shown before update
   - Can fix and retry

### Sync Conflict Resolution

#### Understanding Conflicts

**Conflict Types**

1. **Data Conflict**
   - Item updated in ERPNext while counting
   - System stock changed
   - MRP changed in ERPNext

2. **Concurrency Conflict**
   - Multiple users updating same item
   - Simultaneous count lines
   - Race conditions

**Conflict Detection**

- Automatic detection during sync
- Flagged in conflicts list
- Shows both values (local vs system)
- Requires manual resolution

**Resolution Options**

1. **Accept System Value**
   - Use ERPNext value
   - Discard local changes
   - Use when: System is authoritative

2. **Accept Local Value**
   - Use counted value
   - Overwrite system
   - Use when: Physical count is correct

3. **Manual Resolution**
   - Enter custom value
   - Add resolution note
   - Use when: Neither value is correct

**Resolution Process**

1. **View Conflicts**
   - Navigate to "Conflicts" section
   - Filter by date, item, session
   - Sort by severity

2. **Review Conflict**
   - See both values
   - Check timestamps
   - Review change history

3. **Resolve**
   - Choose resolution option
   - Add note (required)
   - Submit resolution

4. **Sync**
   - Resolution applied
   - Sync retried
   - Conflict removed from list

---

## Admin Operations - System Administration

### Master Dashboard

#### Dashboard Tabs

**1. Overview Tab**

**System Health Status**
- Overall status: Healthy, Warning, Critical
- Component status:
  - MongoDB: Connected/Disconnected
  - SQL Server: Connected/Disconnected
  - Services: Running/Stopped
- Last check: Timestamp

**Services Status**
- Backend API: Running/Stopped
- Sync Service: Running/Stopped
- Scheduler: Running/Stopped
- Status indicators: Green/Yellow/Red

**System Statistics**
- Total users
- Active sessions
- Total count lines
- Database size
- API requests (last 24h)

**Active Issues**
- Error count (last 24h)
- Warning count
- Critical issues
- Quick actions to resolve

**Debug Information**
- Environment: Development/Production
- Version: Application version
- Uptime: Server uptime
- Memory usage
- CPU usage

**2. Logs Tab**

**Log Viewing**
- Real-time log stream
- Filter by:
  - Service: API, Sync, Auth, etc.
  - Level: DEBUG, INFO, WARNING, ERROR, CRITICAL
  - Date range
  - Search text

**Log Actions**
- Clear logs: Remove all logs
- Export logs: Download log file
- Auto-refresh: Toggle real-time updates
- Pause: Stop auto-refresh

**Log Details**
- Timestamp
- Service name
- Log level
- Message
- Stack trace (for errors)
- User context (if available)

**3. Reports Tab**

**Report Generation**
- Select report type
- Choose date range
- Select format: JSON, CSV, Excel
- Generate and download

**Available Reports**
- System activity report
- User activity report
- Error summary report
- Performance report
- Custom reports (future)

**4. Errors Tab**

**Error Statistics (24h)**
- Total errors
- By severity: Critical, Error, Warning
- By service: API, Sync, Database
- Trend graph

**Recent Errors**
- List of recent errors
- Error type
- Message
- Timestamp
- User (if applicable)
- Action: View details

**Error Details**
- Full error message
- Stack trace
- Request details (if API error)
- User context
- Resolution steps (if available)

**5. Debug Tab**

**Debug Mode**
- Toggle: Enable/disable debug mode
- Effect: More verbose logging
- Use: Troubleshooting only

**Debug Information**
- Platform: Operating system
- Environment: Development/Production
- Configuration: Key settings
- Dependencies: Installed packages
- Database: Connection strings (masked)

**6. Controls Tab**

**Service Controls**
- Start Service: Start stopped service
- Stop Service: Stop running service
- Restart Service: Restart service
- Status: Current state

**System Actions**
- Clear Cache: Clear application cache
- Restart System: Restart all services
- Reload Config: Reload configuration
- Backup Database: Create backup

**Service Status**
- Real-time status of all services
- Health checks
- Last heartbeat
- Response times

**7. Monitoring Tab**

**Auto-Refresh**
- Toggle: Enable/disable auto-refresh
- Interval: Refresh frequency (default: 30s)

**System Health Metrics**
- CPU Usage: Percentage and graph
- Memory Usage: MB and percentage
- Disk Usage: GB and percentage
- Network: Bandwidth usage

**Database Status**
- MongoDB:
  - Connection status
  - Database size
  - Collection counts
  - Index status
  
- SQL Server:
  - Connection status
  - Last sync time
  - Query performance
  - Connection pool status

### User Management

#### Creating Users

**User Creation Form**

1. **Basic Information**
   - Username: Unique identifier (required)
   - Full Name: Display name (required)
   - Email: Contact email (optional)
   - Phone: Contact number (optional)

2. **Authentication**
   - Password: Initial password (required)
   - Password Confirmation: Re-enter password
   - Force Password Change: Require change on first login

3. **Role Assignment**
   - Role: Staff, Supervisor, or Admin
   - Custom Permissions: Additional permissions (optional)

4. **Status**
   - Active: User can login
   - Inactive: User cannot login

**Validation**
- Username: 3-50 characters, alphanumeric and underscore
- Password: Minimum 8 characters
- Email: Valid email format (if provided)
- Unique: Username must be unique

#### Editing Users

**Editable Fields**
- Full name
- Email
- Phone
- Role
- Permissions
- Status (active/inactive)

**Non-Editable Fields**
- Username (cannot change)
- Password (use reset function)

#### User Actions

1. **Reset Password**
   - Generates temporary password
   - Sends to user (if email configured)
   - User must change on next login

2. **Activate/Deactivate**
   - Toggle user status
   - Deactivated users cannot login
   - Existing sessions terminated

3. **Delete User**
   - Soft delete: Marks as deleted
   - Hard delete: Removes from database (admin only)
   - Associated data: Handled per policy

### System Configuration

#### Database Mapping

**Purpose**: Map ERPNext database fields to application fields

**Configuration Steps**

1. **Connect to SQL Server**
   - Enter connection details
   - Test connection
   - Verify access

2. **Select Tables**
   - Browse available tables
   - Select item table (usually "tabItem")
   - Select stock table (usually "tabBin")

3. **Map Fields**
   - Item Code: Map to ERPNext field
   - Item Name: Map to ERPNext field
   - Barcode: Map to ERPNext field
   - MRP: Map to ERPNext field
   - Stock Quantity: Map to ERPNext field
   - UOM: Map to ERPNext field

4. **Test Mapping**
   - Test query execution
   - Verify field mappings
   - Check data retrieval

5. **Save Configuration**
   - Save mapping configuration
   - Apply to system
   - Sync test run

#### SQL Server Configuration

**Connection Settings**

- Host: SQL Server hostname or IP
- Port: SQL Server port (default: 1433)
- Database: ERPNext database name
- Authentication:
  - SQL Authentication: Username and password
  - Windows Authentication: Domain credentials
- Connection String: Advanced connection string (optional)

**Connection Testing**

- Test button: Validates connection
- Status: Shows connection status
- Error: Displays error message if failed
- Success: Shows connected message

**Connection Options**

- Connection Timeout: Seconds to wait
- Command Timeout: Query timeout
- Connection Pool: Min/max connections
- Retry Logic: Retry attempts on failure

### Security Monitoring

#### Security Dashboard

**Security Summary**
- Active users: Currently logged in
- Failed logins (24h): Count and trend
- Suspicious activity: Flagged events
- Security score: Overall security rating

**Failed Login Attempts**
- Username attempted
- Timestamp
- IP address
- Reason: Wrong password, user not found, etc.
- Action: Block IP (if suspicious)

**Suspicious Activity**
- Multiple failed logins from same IP
- Login from unusual location
- Unusual access patterns
- Privilege escalation attempts

**Active Sessions**
- User: Username
- IP Address: Client IP
- Login Time: When session started
- Last Activity: Last action timestamp
- Action: Terminate session

**Audit Logs**
- All security-related events
- User actions
- Permission changes
- Configuration changes
- Security events
- Filter by date, user, action

**IP Tracking**
- Track IP addresses
- Block suspicious IPs
- Whitelist trusted IPs
- View IP history per user

### System Metrics

#### Performance Metrics

**Response Times**
- API endpoint response times
- Average, min, max
- 95th percentile
- Trend over time

**Throughput**
- Requests per second
- Successful requests
- Failed requests
- Error rate

**Resource Usage**
- CPU: Percentage and cores
- Memory: Used and available
- Disk: Used and free space
- Network: Bandwidth usage

#### Health Metrics

**System Health Score**
- Calculated from multiple factors
- Components: Database, services, errors
- Status: Healthy (green), Warning (yellow), Critical (red)

**Component Health**
- MongoDB: Connection, queries, replication
- SQL Server: Connection, queries, sync
- API: Response times, errors
- Services: Status, uptime

**Alert Thresholds**
- CPU > 80%: Warning
- CPU > 95%: Critical
- Memory > 85%: Warning
- Memory > 95%: Critical
- Error rate > 5%: Warning
- Error rate > 10%: Critical

---

## Advanced Features & Workflows

### Serial Number Management

#### Serial Number Requirements

**Requirement Types**

1. **Required**
   - Item must have serial numbers
   - One serial per item
   - Cannot save without serials

2. **Dual**
   - Item requires two serials
   - Example: IMEI + Serial Number
   - Both must be captured

3. **Optional**
   - User can enable serial capture
   - Not mandatory
   - Useful for tracking

#### Serial Capture Workflow

1. **Enable Serial Capture**
   - Toggle switch on scan screen
   - Automatically enabled if item requires serials
   - Input fields appear

2. **Enter Serial Numbers**
   - One input per serial
   - Auto-uppercase
   - Duplicate detection
   - Minimum count: Matches physical quantity

3. **Scan Serial Numbers**
   - Use barcode scanner
   - Switch to serial scan mode
   - Scan each serial label
   - Auto-populates input fields

4. **Photo Proof**
   - Attach photo per serial
   - Photo type: "Serial"
   - Captures serial label
   - Stored with count line

5. **Validation**
   - All required serials entered
   - No duplicates
   - Format validation (if configured)
   - Can save count line

### Photo Proof System

#### Photo Types

1. **Item Photo**
   - Purpose: Visual proof of item
   - Use: Verify item condition
   - Captured: During counting

2. **Shelf Photo**
   - Purpose: Location verification
   - Use: Confirm item location
   - Captured: During counting

3. **Serial Photo**
   - Purpose: Serial number proof
   - Use: Verify serial label
   - Captured: Per serial number

4. **Damage Photo**
   - Purpose: Document damage
   - Use: Record item condition
   - Captured: When damage found

#### Photo Capture Process

**Mobile**
1. Tap "Capture Photo" button
2. Camera opens
3. Frame the subject
4. Tap capture button
5. Photo preview shown
6. Accept or retake
7. Photo saved and attached

**Web**
1. Click "Upload Photo" button
2. File picker opens
3. Select image file
4. Preview shown
5. Upload button
6. Photo uploaded and attached

**Photo Management**
- View: Tap photo to view full size
- Delete: Remove photo from count line
- Replace: Capture new photo
- Multiple: Can attach multiple photos

### Variance Analysis

#### Variance Calculation

**Basic Variance**
```
Variance = Physical Count - System Stock
```

**Variance Percentage**
```
Variance % = (Variance / System Stock) × 100
```

**Financial Impact**
```
Financial Impact = (Counted MRP × Counted Qty) - (System MRP × System Qty)
```

#### Variance Reasons

**Predefined Reasons**

1. **Stock Adjustment**
   - General adjustment
   - No specific cause
   - Common reason

2. **Damaged Items**
   - Items found damaged
   - Cannot be sold
   - Write-off required

3. **Theft/Loss**
   - Items missing
   - Suspected theft
   - Security concern

4. **Found Items**
   - Items found but not in system
   - Positive variance
   - Need to add to system

5. **System Error**
   - Discrepancy due to system issue
   - Data entry error
   - Sync problem

6. **Expired Items**
   - Items past expiration
   - Cannot be sold
   - Disposal required

**Custom Notes**
- Additional details
- Specific circumstances
- Action taken
- Recommendations

### Risk Detection

#### Risk Flags

**Automatic Risk Detection**

1. **High Variance**
   - Variance > 10% of system stock
   - Flagged for review
   - Requires supervisor approval

2. **Large Variance**
   - Variance > 100 units
   - Significant discrepancy
   - Needs investigation

3. **Financial Impact**
   - Financial impact > threshold
   - High value variance
   - Requires approval

4. **Duplicate Correction**
   - Same item corrected multiple times
   - Pattern detection
   - Review required

5. **Negative Variance**
   - Missing items
   - Theft or loss
   - Security concern

6. **MRP Change**
   - MRP change > 20%
   - Significant price change
   - Verification needed

**Risk Levels**

- **Low**: Auto-approved
- **Medium**: Flagged, can be approved
- **High**: Requires supervisor review
- **Critical**: Requires admin approval

### Offline Mode (Future Feature)

#### Offline Capabilities

**Planned Features**
- Store counts locally
- Sync when online
- Conflict resolution
- Offline queue management

**Current Status**
- Requires internet connection
- No offline support yet
- Planned for future release

---

## ERPNext Integration & Synchronization

### Sync Architecture

#### Sync Process

**One-Way Sync (Current)**
- ERPNext → Stock Verify: Item/master data (read-only)
- Stock Verify → ERPNext: Count results (via API or manual export)

**Two-Way Sync (Future)**
- Bidirectional synchronization
- Conflict resolution
- Real-time updates

#### Data Flow

```
ERPNext Database (SQL Server)
    ↓ (Read-only connection)
Stock Verify Backend
    ↓ (API)
Stock Verify Frontend
    ↓ (User actions)
Count Lines Created
    ↓ (Export/Sync)
ERPNext Integration
```

### Item Data Sync

#### Sync Frequency

**Automatic Sync**
- Scheduled: Every hour (configurable)
- Trigger: On session creation
- Manual: Supervisor can trigger

**Sync Process**
1. Connect to SQL Server
2. Query item table
3. Compare with local cache
4. Update changed items
5. Add new items
6. Log sync results

#### Sync Conflicts

**Conflict Types**
- Item updated in ERPNext during counting
- MRP changed
- Stock quantity changed
- Item deleted in ERPNext

**Resolution**
- Manual resolution required
- Supervisor reviews conflicts
- Choose correct value
- Apply resolution

### Count Line Export

#### Export Formats

1. **Excel (.xlsx)**
   - Formatted spreadsheet
   - Multiple sheets
   - Formulas and formatting
   - Charts (if applicable)

2. **CSV**
   - Comma-separated values
   - Raw data
   - Easy import
   - No formatting

3. **JSON**
   - Structured data
   - API integration
   - Machine-readable
   - Complete data

#### Export Content

**Included Data**
- Session information
- Item details
- Counted quantities
- System quantities
- Variances
- MRP changes
- Remarks
- Timestamps
- User information

**Export Process**
1. Select sessions or date range
2. Choose format
3. Generate export
4. Download file
5. Import to ERPNext (manual or automated)

---

## Troubleshooting - Complete Reference

### Connection Issues

#### Problem: Cannot Connect to Backend

**Symptoms**
- Loading screen persists
- "Connection failed" message
- Network error toast

**Diagnosis Steps**

1. **Check Network Connection**
   - Mobile: Wi-Fi or mobile data enabled
   - Web: Internet connection active
   - Test: Open other websites/apps

2. **Verify Backend Server**
   - Check if backend is running
   - Test: `curl http://backend-ip:8000/health`
   - Check server logs

3. **Check Firewall**
   - Port 8000 accessible
   - No firewall blocking
   - VPN connection (if required)

4. **Verify IP/Port**
   - Correct backend IP address
   - Correct port number
   - Network accessible

**Solutions**

1. **Restart Backend**
   ```bash
   cd backend
   python server.py
   ```

2. **Check Backend Logs**
   - Look for errors
   - Check connection attempts
   - Verify port binding

3. **Network Configuration**
   - Ensure same network (mobile)
   - Check router settings
   - Verify IP address

4. **Manual Configuration**
   - Set backend URL manually
   - Use IP address directly
   - Test connection

#### Problem: Intermittent Connection

**Symptoms**
- Works sometimes, fails others
- Timeout errors
- Slow responses

**Causes**
- Network instability
- Backend overload
- Firewall rules
- Mobile data issues

**Solutions**
- Check network stability
- Restart backend
- Increase timeout values
- Use Wi-Fi instead of mobile data

### Barcode Scanner Issues

#### Problem: Camera Not Opening

**Symptoms**
- Scanner button does nothing
- Permission error
- Camera black screen

**Solutions**

1. **Grant Camera Permission**
   - Mobile Settings → Apps → Stock Verify → Permissions
   - Enable Camera permission
   - Restart app

2. **Check Camera Availability**
   - Test camera in other apps
   - Restart device
   - Check for hardware issues

3. **App Restart**
   - Force close app
   - Clear app cache
   - Restart app

#### Problem: Barcode Not Detected

**Symptoms**
- Camera opens but no detection
- "No barcode found" message
- Slow detection

**Solutions**

1. **Improve Lighting**
   - Use better lighting
   - Avoid glare
   - Use flash if available

2. **Stabilize Device**
   - Hold device steady
   - Keep barcode flat
   - Maintain distance (10-20cm)

3. **Clean Camera Lens**
   - Wipe camera lens
   - Remove smudges
   - Check for scratches

4. **Check Barcode Quality**
   - Barcode not damaged
   - Clear and readable
   - Correct format supported

#### Problem: Wrong Item Detected

**Symptoms**
- Different item loaded
- Incorrect barcode read
- Item not found

**Solutions**
- Verify barcode matches item
- Rescan barcode
- Use manual entry instead
- Check item in system

### Search Issues

#### Problem: Item Not Found

**Symptoms**
- "No results" message
- Empty search results
- Item exists but not found

**Solutions**

1. **Check Spelling**
   - Verify item name spelling
   - Try partial matches
   - Check for typos

2. **Try Different Search**
   - Search by item code
   - Search by barcode
   - Use manual entry

3. **Verify Item Exists**
   - Check in ERPNext
   - Verify item is active
   - Check with supervisor

4. **Sync Issues**
   - Item not synced yet
   - Trigger manual sync
   - Wait for next sync

#### Problem: Slow Search

**Symptoms**
- Long delay before results
- App freezes during search
- Timeout errors

**Solutions**
- Check network connection
- Reduce search query length
- Wait for results
- Restart app if frozen

### Saving Issues

#### Problem: Count Not Saving

**Symptoms**
- "Save" button does nothing
- Error message on save
- Count disappears

**Solutions**

1. **Check Validation**
   - Physical quantity entered
   - Variance reason (if variance)
   - Serial numbers (if required)
   - All required fields filled

2. **Check Network**
   - Internet connection active
   - Backend accessible
   - No timeout errors

3. **Check Session Status**
   - Session still open
   - Not closed by supervisor
   - Permissions valid

4. **Retry Save**
   - Try saving again
   - Check error message
   - Contact supervisor if persists

#### Problem: Duplicate Count Lines

**Symptoms**
- Same item counted twice
- Duplicate entries
- Error on save

**Solutions**
- Check if item already counted
- Remove duplicate entry
- Use edit instead of new count
- Contact supervisor to remove duplicate

### Performance Issues

#### Problem: App Slow/Laggy

**Symptoms**
- Slow response to taps
- Delayed screen updates
- App freezes

**Solutions**

1. **Close Other Apps**
   - Free up device memory
   - Close background apps
   - Restart device

2. **Clear Cache**
   - Clear app cache
   - Clear browser cache (web)
   - Restart app

3. **Check Device Resources**
   - Free up storage space
   - Close unnecessary apps
   - Restart device

4. **Network Issues**
   - Check network speed
   - Switch to faster network
   - Wait for network to stabilize

#### Problem: High Battery Drain

**Symptoms**
- Battery drains quickly
- Device heats up
- Short battery life

**Solutions**
- Enable power-saving features
- Reduce screen brightness
- Close app when not in use
- Use power bank for extended use
- Check for app updates

### Data Issues

#### Problem: Incorrect Stock Displayed

**Symptoms**
- Wrong stock quantity shown
- Outdated information
- Stock doesn't match ERPNext

**Solutions**

1. **Refresh Item Stock**
   - Use "Refresh Stock" button
   - Fetches latest from ERPNext
   - Updates displayed stock

2. **Check Sync Status**
   - Verify last sync time
   - Trigger manual sync
   - Wait for next sync

3. **Verify in ERPNext**
   - Check stock in ERPNext
   - Compare with app
   - Report discrepancy

#### Problem: Session Data Missing

**Symptoms**
- Session not appearing
- Count lines missing
- Data lost

**Solutions**
- Check session filters
- Verify correct user account
- Check session status
- Contact supervisor
- Check database (admin)

---

## Best Practices & Optimization

### For Staff Members

#### Pre-Counting Preparation

1. **Device Preparation**
   - Charge device fully (100%)
   - Bring power bank for extended use
   - Test camera and scanner
   - Check internet connection
   - Clear app cache if needed

2. **Session Planning**
   - Review warehouse layout
   - Plan counting route
   - Identify item locations
   - Prepare barcode list (if needed)

3. **Team Coordination**
   - Coordinate with other staff
   - Avoid duplicate counting
   - Communicate session details
   - Share floor/rack assignments

#### During Counting

1. **Systematic Approach**
   - Follow consistent route
   - Count left to right, top to bottom
   - Don't skip items
   - Double-check uncertain counts

2. **Accuracy First**
   - Verify item before counting
   - Check barcode matches item
   - Count carefully
   - Re-count if uncertain

3. **Efficient Workflow**
   - Scan → Count → Save → Next
   - Don't leave items half-counted
   - Save frequently
   - Use quick count buttons

4. **Quality Checks**
   - Verify item name matches
   - Check item code
   - Confirm location
   - Review variance before saving

#### Post-Counting

1. **Session Review**
   - Review all counts
   - Check for errors
   - Verify variances
   - Add missing remarks

2. **Session Closure**
   - Close session when complete
   - Don't leave sessions open
   - Add session notes if needed
   - Notify supervisor

### For Supervisors

#### Daily Operations

1. **Morning Routine**
   - Review overnight sessions
   - Check for high variances
   - Review pending approvals
   - Plan day's activities

2. **Active Monitoring**
   - Monitor open sessions
   - Track counting progress
   - Identify issues early
   - Provide support to staff

3. **Approval Management**
   - Review approvals promptly
   - Check variance reasons
   - Verify item details
   - Approve or reject with notes

4. **End of Day**
   - Review all sessions
   - Close completed sessions
   - Generate daily reports
   - Plan next day

#### Analytics Usage

1. **Regular Review**
   - Daily: Check key metrics
   - Weekly: Review trends
   - Monthly: Analyze patterns
   - Quarterly: Strategic review

2. **Variance Analysis**
   - Identify high-variance items
   - Track variance trends
   - Investigate root causes
   - Implement improvements

3. **Staff Performance**
   - Track individual performance
   - Identify training needs
   - Recognize good performance
   - Address issues

#### Reporting

1. **Report Generation**
   - Schedule regular reports
   - Customize report content
   - Share with stakeholders
   - Archive reports

2. **Data Export**
   - Export for ERPNext import
   - Export for analysis
   - Maintain export history
   - Verify export accuracy

### For Administrators

#### System Maintenance

1. **Daily Checks**
   - System health status
   - Error logs review
   - Database connections
   - Service status

2. **Weekly Tasks**
   - User management review
   - Permission audits
   - Security log review
   - Performance analysis

3. **Monthly Tasks**
   - Database backup
   - Log cleanup
   - Configuration review
   - Update planning

#### User Management

1. **User Creation**
   - Follow naming conventions
   - Assign appropriate roles
   - Set strong passwords
   - Document user details

2. **Permission Management**
   - Grant minimum required permissions
   - Review permissions regularly
   - Remove unused permissions
   - Document permission changes

3. **User Deactivation**
   - Deactivate unused accounts
   - Review inactive users
   - Archive user data
   - Maintain audit trail

#### Security

1. **Security Monitoring**
   - Review failed logins
   - Check suspicious activity
   - Monitor IP addresses
   - Block threats

2. **Access Control**
   - Enforce strong passwords
   - Enable two-factor authentication (if available)
   - Review active sessions
   - Terminate suspicious sessions

3. **Audit Trail**
   - Review audit logs regularly
   - Investigate anomalies
   - Maintain log retention
   - Export logs for compliance

---

## Security & Compliance

### Authentication Security

#### Password Policy

**Requirements**
- Minimum 8 characters
- Recommended: 12+ characters
- Mix of uppercase, lowercase, numbers, special characters
- No common passwords
- No personal information

**Password Management**
- Change password regularly
- Don't share passwords
- Use unique passwords
- Store securely (password manager)

#### Session Security

**Session Management**
- Automatic timeout: 15 minutes inactivity
- Refresh token: 7 days validity
- Secure storage: Encrypted tokens
- Session termination: On logout or timeout

**Best Practices**
- Logout when done
- Don't share devices
- Use secure networks
- Report suspicious activity

### Data Security

#### Data Encryption

**In Transit**
- HTTPS for all API calls
- Encrypted connections
- Certificate validation
- Secure protocols

**At Rest**
- Encrypted database
- Encrypted backups
- Secure file storage
- Access controls

#### Access Control

**Role-Based Access**
- Minimum required permissions
- Regular permission audits
- Principle of least privilege
- Separation of duties

**Data Access**
- Users see only their data (staff)
- Supervisors see all data
- Admins have full access
- Audit all access

### Compliance

#### Audit Trail

**Logged Events**
- All user actions
- Data changes
- Permission changes
- Configuration changes
- Security events

**Audit Log Retention**
- Minimum: 90 days
- Recommended: 1 year
- Compliance: Per regulations
- Export for compliance

#### Data Privacy

**Personal Data**
- Minimal data collection
- Secure storage
- Access controls
- Data retention policies

**User Rights**
- Access to own data
- Correction of data
- Deletion of data (per policy)
- Data export

---

## Performance Tuning

### Frontend Optimization

#### Mobile Performance

1. **Image Optimization**
   - Compress photos before upload
   - Use appropriate image sizes
   - Cache images locally
   - Lazy load images

2. **Network Optimization**
   - Batch API requests
   - Cache responses
   - Reduce payload size
   - Use compression

3. **Rendering Optimization**
   - Virtualize long lists
   - Lazy load components
   - Optimize re-renders
   - Use memoization

#### Web Performance

1. **Bundle Optimization**
   - Code splitting
   - Tree shaking
   - Minification
   - Compression

2. **Caching Strategy**
   - Browser caching
   - Service worker caching
   - API response caching
   - Static asset caching

### Backend Optimization

#### Database Optimization

1. **Indexing**
   - Index frequently queried fields
   - Composite indexes for common queries
   - Regular index maintenance
   - Monitor index usage

2. **Query Optimization**
   - Use efficient queries
   - Avoid N+1 queries
   - Use aggregation pipelines
   - Limit result sets

3. **Connection Pooling**
   - Configure pool size
   - Monitor pool usage
   - Handle connection errors
   - Reuse connections

#### API Optimization

1. **Response Caching**
   - Cache static data
   - Cache frequently accessed data
   - Set appropriate TTL
   - Invalidate on updates

2. **Pagination**
   - Implement pagination
   - Limit page size
   - Use cursor-based pagination
   - Optimize count queries

3. **Async Operations**
   - Use async/await
   - Parallel processing
   - Background jobs
   - Queue management

---

## API Reference & Integration

### Authentication Endpoints

#### Login
```
POST /api/auth/login
Body: { "username": "string", "password": "string" }
Response: { "access_token": "string", "refresh_token": "string", "user": {...} }
```

#### Refresh Token
```
POST /api/auth/refresh
Headers: { "Authorization": "Bearer <refresh_token>" }
Response: { "access_token": "string" }
```

#### Logout
```
POST /api/auth/logout
Headers: { "Authorization": "Bearer <access_token>" }
Response: { "message": "Logged out" }
```

### Session Endpoints

#### Create Session
```
POST /api/sessions
Body: { "warehouse_name": "string", "floor": "string", "rack": "string" }
Response: { "id": "string", "warehouse_name": "string", ... }
```

#### Get Sessions
```
GET /api/sessions?page=1&page_size=20&status=open
Response: { "items": [...], "pagination": {...} }
```

#### Get Session
```
GET /api/sessions/{session_id}
Response: { "id": "string", "warehouse_name": "string", ... }
```

### Count Line Endpoints

#### Create Count Line
```
POST /api/count-lines
Body: {
  "session_id": "string",
  "item_code": "string",
  "counted_qty": number,
  "mrp_counted": number,
  "correction_reason": "string",
  "remark": "string"
}
Response: { "id": "string", ... }
```

#### Get Count Lines
```
GET /api/count-lines?session_id={session_id}
Response: { "items": [...], "pagination": {...} }
```

### Item Endpoints

#### Search Items
```
GET /api/items/search?query={query}
Response: { "items": [...] }
```

#### Get Item by Barcode
```
GET /api/items/barcode/{barcode}
Response: { "item_code": "string", "item_name": "string", ... }
```

#### Update Item MRP
```
PUT /api/items/{item_code}/mrp
Body: { "mrp": number }
Response: { "item_code": "string", "mrp": number, ... }
```

### Error Handling

#### Error Response Format
```json
{
  "detail": "Error message",
  "error_code": "ERROR_CODE",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Common Error Codes
- `AUTH_REQUIRED`: Authentication required
- `PERMISSION_DENIED`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `SERVER_ERROR`: Internal server error

---

## FAQ - Extended

### General Questions

**Q: Can I use the app offline?**  
A: Currently, the app requires an active internet connection. Offline mode is planned for a future release. The app will store counts locally and sync when online.

**Q: What happens if I lose internet during counting?**  
A: The app will attempt to save data when the connection is restored. However, it's best to ensure stable connectivity during counting operations. If connection is lost, try to maintain the session and save when reconnected.

**Q: Can I edit a count after saving?**  
A: Yes, as long as the session is still open and the count line hasn't been approved. Once approved or the session is closed, counts cannot be modified without supervisor/admin intervention.

**Q: How long are sessions stored?**  
A: Sessions are stored indefinitely in the database. Contact your administrator for specific data retention policies. Old sessions can be archived or deleted per organizational policy.

**Q: Can multiple users count the same item?**  
A: Technically yes, but it's not recommended as it creates duplicate count lines. The system will flag duplicates for review. Coordinate with your team to avoid counting the same items.

### Mobile-Specific

**Q: Does the app drain battery quickly?**  
A: The app includes power-saving features including screen timeout (2 minutes), wake lock management, and network throttling. For extended use, keep your device charged or use a power bank. Battery usage is optimized but continuous scanning will consume battery.

**Q: Can I use the app on multiple devices?**  
A: Yes, you can log in from multiple devices. Your sessions will sync across devices. However, be careful not to create duplicate sessions or counts.

**Q: What if my camera doesn't work?**  
A: You can use manual barcode entry (6-digit auto-search) or search by item name as alternatives. The app doesn't require camera functionality for all operations.

**Q: Can I use the app in low light?**  
A: Yes, the camera supports flash (if available on your device). Enable flash in camera settings. For very low light, manual entry or search may be more reliable.

**Q: What if the barcode is damaged?**  
A: Use manual barcode entry. Type the barcode manually or search by item name. If the barcode is partially readable, try typing the readable portion.

### Supervisor/Admin

**Q: Why can't I access supervisor features on mobile?**  
A: Supervisor and Admin features are designed for web browsers only to ensure proper security, functionality, and screen real estate. Use a web browser (desktop or tablet) for these features.

**Q: How do I resolve sync conflicts?**  
A: Navigate to "Conflicts" in the supervisor dashboard, review each conflict (shows both local and system values), and choose the appropriate resolution (accept system value, accept local value, or manual entry). Add a resolution note explaining your decision.

**Q: Can I export data in different formats?**  
A: Yes, exports are available in JSON, CSV, and Excel formats. Select your preferred format when exporting. Excel format includes formatting and multiple sheets, CSV is raw data, and JSON is structured for integration.

**Q: How do I bulk update MRP?**  
A: Use the MRP update feature in the supervisor dashboard. You can either update items individually or upload a CSV file with item codes and new MRP values for bulk updates.

**Q: Can I schedule automatic exports?**  
A: Scheduled exports are a planned feature. Currently, exports must be triggered manually. Check with your administrator for automation options.

### Technical

**Q: What browsers are supported?**  
A: Modern browsers including Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+. Ensure JavaScript is enabled and cookies are allowed.

**Q: What mobile OS versions are supported?**  
A: iOS 13.0+ and Android 8.0+ (API level 26+). Older versions may work but are not officially supported.

**Q: How do I report a bug?**  
A: Contact your system administrator or IT support team with:
   - Description of the issue
   - Steps to reproduce
   - Screenshots (if applicable)
   - Device/browser information
   - Error messages (if any)

**Q: How often is data synced with ERPNext?**  
A: Item/master data syncs automatically every hour (configurable). Count results are exported manually or via scheduled exports. Real-time sync is planned for future releases.

**Q: Can I customize the app?**  
A: Some customization is available through configuration (admin only). UI customization and feature additions require development work. Contact your administrator for customization requests.

**Q: Is my data backed up?**  
A: Database backups are managed by administrators. Regular backups should be configured. Contact your administrator to verify backup schedules and retention policies.

**Q: How do I update the app?**  
A: Mobile: Update through app store (when available) or reinstall from development build. Web: Refresh browser to get latest version. Backend updates are managed by administrators.

---

## Support and Contact

### Getting Help

1. **Internal Support**
   - Contact your supervisor for operational questions
   - Reach out to IT administrator for technical issues
   - Check this user guide for common solutions
   - Review FAQ section

2. **System Information**
   - Application Version: 1.0.0
   - Platform: React Native (Expo SDK 54) + FastAPI
   - ERPNext Integration: v15+
   - Database: MongoDB + SQL Server

### Additional Resources

- **Architecture Documentation**: See `ARCHITECTURE.md`
- **API Documentation**: See `API_CONTRACTS.md`
- **Setup Guide**: See `README.md` and setup scripts
- **Developer Documentation**: Contact development team

### Training Resources

- User training sessions (contact administrator)
- Video tutorials (if available)
- Best practices workshops
- Q&A sessions

---

## Version History

- **v1.0.0** (January 2025)
  - Initial release
  - Mobile and web support
  - Barcode scanning
  - Session management
  - Variance tracking
  - Power-saving features
  - Supervisor and Admin dashboards
  - ERPNext integration
  - Comprehensive user guide

---

## Appendix

### A. Keyboard Shortcuts (Web)

- `Ctrl/Cmd + K`: Quick search
- `Esc`: Close modals
- `Enter`: Submit forms
- `Tab`: Navigate between fields
- `Ctrl/Cmd + S`: Save (context-dependent)
- `Ctrl/Cmd + E`: Export
- `F5` or `Ctrl/Cmd + R`: Refresh page

### B. Error Codes Reference

- `AUTH_REQUIRED`: Authentication required
- `PERMISSION_DENIED`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input
- `SERVER_ERROR`: Internal error
- `NETWORK_ERROR`: Connection failed
- `TIMEOUT_ERROR`: Request timeout

### C. Status Codes

**Session Status**
- `OPEN`: Active, can modify
- `CLOSED`: Completed, read-only
- `RECONCILE`: Ready for sync
- `CANCELLED`: Cancelled

**Count Line Status**
- `PENDING`: Awaiting approval
- `NEEDS_REVIEW`: Requires review
- `APPROVED`: Approved, ready for sync
- `REJECTED`: Rejected, needs correction

### D. Field Limits

- Warehouse Name: 2-100 characters
- Floor Number: 0-50 characters
- Rack Number: 0-50 characters
- Physical Quantity: 0-999,999
- MRP: 0-999,999.99
- Remarks: 0-500 characters
- Username: 3-50 characters
- Password: Minimum 8 characters

---

**Document End**

For the latest updates, additional help, or to report issues, please contact your system administrator.

*This document is maintained by the development team. Last comprehensive update: January 2025.*
