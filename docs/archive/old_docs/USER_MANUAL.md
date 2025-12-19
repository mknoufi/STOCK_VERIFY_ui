# Stock Count Application - User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles](#user-roles)
4. [Staff Dashboard](#staff-dashboard)
5. [Supervisor Dashboard](#supervisor-dashboard)
6. [Counting Sessions](#counting-sessions)
7. [Barcode Scanning](#barcode-scanning)
8. [MRP Management](#mrp-management)
9. [Reports & Export](#reports--export)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

The **Stock Count Application** is a mobile-based inventory management system designed to streamline stock counting, variance tracking, and price management. The application supports both iOS and Android platforms and provides role-based access for Staff and Supervisors.

### Key Features
- ✅ Real-time stock counting with barcode scanning
- ✅ Variance detection and reconciliation
- ✅ MRP (Maximum Retail Price) management
- ✅ Session-based counting workflow
- ✅ Multi-warehouse support
- ✅ Comprehensive reporting and data export
- ✅ Offline capability with sync
- ✅ Auto-logout for security

---

## Getting Started

### System Requirements
- **Mobile OS**: iOS 13+ or Android 8+
- **Internet**: Required for initial login and data sync
- **Camera**: Required for barcode scanning
- **Storage**: Minimum 100MB free space

### First Time Login

1. **Launch the App**
   - Open the Stock Count application on your mobile device

2. **Enter Credentials**
   - Username: Your assigned username
   - Password: Your secure password
   - Tap **"Login"** button

3. **Role Detection**
   - The system automatically detects your role (Staff/Supervisor)
   - You'll be directed to the appropriate dashboard

4. **Permissions**
   - Grant camera access when prompted (required for barcode scanning)
   - Grant storage access if prompted (for exports)

---

## User Roles

### Staff Role
**Capabilities:**
- Create and manage counting sessions
- Scan items and record quantities
- Update item MRP
- View counting history
- Submit sessions for reconciliation

**Access Restrictions:**
- Cannot view other staff's sessions
- Cannot access supervisor-only reports
- Cannot manage database mappings

### Supervisor Role
**Capabilities:**
- All staff capabilities
- View all sessions across all staff
- Access activity logs and error logs
- Export data and reports
- Manage database mappings
- Update system settings
- View comprehensive analytics

---

## Staff Dashboard

### Overview
The Staff Dashboard is your home screen after login, displaying:
- Your name and role
- Quick action buttons
- Your recent counting sessions
- Session status indicators

### Dashboard Layout

```
┌─────────────────────────────────┐
│ Hello, [Your Name]              │
│ Staff Member            [Logout]│
├─────────────────────────────────┤
│ [Start New Counting Session]    │
├─────────────────────────────────┤
│ [Help]    [💰 Update MRP]       │
├─────────────────────────────────┤
│ Your Sessions                    │
│ ┌─────────────────────────────┐ │
│ │ Session 1 - OPEN            │ │
│ │ Warehouse: Main             │ │
│ │ Items: 25 | Variance: 3     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Starting a New Session

1. **Tap "Start New Counting Session"**
   - A modal will appear

2. **Enter Warehouse Name**
   - Type the warehouse name (e.g., "Main Warehouse", "Store A")
   - Tap **"Create"**

3. **Session Created**
   - You'll be taken to the scanning screen
   - Session starts in **OPEN** status

### Viewing Sessions

**Session Card Information:**
- **Warehouse Name**: Location being counted
- **Status Badge**:
  - 🟢 **OPEN** - Active counting
  - 🟠 **RECONCILE** - Needs review
  - ⚫ **CLOSED** - Completed
- **Start Time**: When the session began
- **Items Counted**: Total unique items scanned
- **Total Variance**: Sum of differences from expected stock

**Tap any session** to continue counting or review details

### Menu Options

#### Help Button
- Access help documentation
- View app guide
- Contact support

#### Update MRP Button
- Search for items
- View current MRP
- Update prices (see [MRP Management](#mrp-management))

---

## Supervisor Dashboard

### Overview
The Supervisor Dashboard provides comprehensive oversight and management tools.

### Dashboard Layout

```
┌─────────────────────────────────────┐
│ Supervisor Dashboard                │
│ [Supervisor Name]      [🔴 LOGOUT]  │
├─────────────────────────────────────┤
│ Quick Actions:                      │
│ [Logs] [Errors] [💰MRP] [Export] [Settings] │
├─────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐    │
│ │ Total        │ │ Open        │    │
│ │ Sessions: 25 │ │ Sessions: 8 │    │
│ └─────────────┘ └─────────────┘    │
│ ┌─────────────┐ ┌─────────────┐    │
│ │ Items        │ │ Total       │    │
│ │ Counted: 450 │ │ Variance: 12│    │
│ └─────────────┘ └─────────────┘    │
├─────────────────────────────────────┤
│ Recent Sessions                     │
│ [All staff sessions listed]         │
└─────────────────────────────────────┘
```

### Quick Actions

#### 📋 Logs (Activity Logs)
- View all system activities
- Track user actions
- Audit trail for compliance

#### 🐛 Errors (Error Logs)
- View system errors
- Troubleshoot issues
- Monitor app health

#### 💰 MRP (Update Prices)
- Search and update item MRP
- Bulk price corrections
- Price change history

#### 📥 Export
- Export session data
- Generate reports
- Download CSV/Excel files

#### ⚙️ Settings
- Configure system settings
- Manage user preferences
- Update app configuration

### Analytics Cards

**Total Sessions**
- Shows count of all counting sessions
- All time total

**Open Sessions**
- Currently active sessions
- Requires attention

**Items Counted**
- Total unique items counted
- Across all sessions

**Total Variance**
- Sum of all variances
- Indicates discrepancies

### Session Management

**Viewing All Sessions:**
- See sessions from all staff members
- Filter by status
- Sort by date/warehouse

**Session Details:**
- Tap any session to view full details
- Review counted items
- Check variance reasons
- Approve or reconcile

---

## Counting Sessions

### Session Workflow

```
1. CREATE → 2. COUNT → 3. RECONCILE → 4. CLOSE
   (OPEN)      (OPEN)     (RECONCILE)    (CLOSED)
```

### Creating a Session

**For Staff:**
1. Tap **"Start New Counting Session"**
2. Enter warehouse name
3. Tap **"Create"**
4. Begin scanning

**Session automatically:**
- Records your name as staff member
- Sets start timestamp
- Assigns unique session ID
- Sets status to OPEN

### Counting Process

#### Scanning Screen Layout

```
┌─────────────────────────────────┐
│ Session: Warehouse Name    [✓]  │
│ Staff: Your Name                │
├─────────────────────────────────┤
│ [Search Items]                  │
├─────────────────────────────────┤
│ Current Item:                   │
│ ┌─────────────────────────────┐ │
│ │ Item Name                   │ │
│ │ Code: 12345                 │ │
│ │ System Stock: 100           │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Counted Quantity: [150]         │
│ Variance: +50                   │
├─────────────────────────────────┤
│ Quick Count: [1][5][10][50]    │
├─────────────────────────────────┤
│ Calculator: [7][8][9][+]        │
│             [4][5][6][-]        │
│             [1][2][3][*]        │
│             [C][0][=][/]        │
├─────────────────────────────────┤
│ [Submit Count]                  │
└─────────────────────────────────┘
```

#### Finding Items

**Method 1: Barcode Scanning**
1. Tap the barcode scan icon
2. Point camera at barcode
3. Item loads automatically

**Method 2: Manual Search**
1. Tap search box
2. Type item name, code, or barcode
3. Select item from search results

**Method 3: 6-Digit Quick Entry**
- Type 6-digit item code
- Press Enter
- Item loads automatically

#### Recording Count

**Enter Quantity:**
- **Quick Count Buttons**: Tap 1, 5, 10, 20, 50, or 100
- **Calculator**: Use on-screen calculator
- **Type**: Manually enter number

**System Shows:**
- ✅ Current item details
- 📊 System stock quantity
- 📈 Variance (difference)
- 🎯 Variance percentage

**Submit:**
- Tap **"Submit Count"** when satisfied
- If variance exists, select reason (required)

### Variance Reasons

When counted quantity differs from system stock:

**Common Reasons:**
- 📦 **Stock Transfer** - Items moved between locations
- 🔄 **Pending Delivery** - Orders in transit
- 📝 **Data Entry Error** - Wrong quantity in system
- 🗑️ **Damage/Wastage** - Damaged or expired items
- 🎁 **Promotional Stock** - Items for promotion
- 📋 **Other** - Specify custom reason

**Selecting Reason:**
1. Modal appears after submitting variance
2. Select appropriate reason
3. Add notes if "Other" is selected
4. Tap **"Submit"**

### Completing a Session

**To Close Session:**
1. Tap checkmark ✓ in top right
2. Confirm you've counted all items
3. Session status changes to **RECONCILE**

**Session Review:**
- Supervisor reviews session
- Checks variance reasons
- Approves or requests recounts
- Final status: **CLOSED**

---

## Barcode Scanning

### Supported Barcode Types
- ✅ EAN-13
- ✅ EAN-8
- ✅ UPC-A
- ✅ UPC-E
- ✅ Code 39
- ✅ Code 128
- ✅ QR Codes

### Scanning Tips

**For Best Results:**
1. **Good Lighting** - Ensure adequate light
2. **Steady Hold** - Keep phone steady
3. **Proper Distance** - 6-12 inches from barcode
4. **Flat Surface** - Flatten curved labels
5. **Clean Lens** - Wipe camera lens

**If Scan Fails:**
- Try manual entry
- Use search function
- Check barcode damage
- Verify item exists in system

### Barcode Mapping

**Multiple Barcodes per Item:**
- Items can have multiple barcodes
- System automatically maps to correct item
- Supervisor can add/edit mappings

**Database Mapping (Supervisor Only):**
1. Go to **DB** in Quick Actions
2. Select item
3. Add new barcode
4. Save mapping

---

## MRP Management

### Accessing MRP Update

**Staff Dashboard:**
- Tap **"Update MRP"** button in menu

**Supervisor Dashboard:**
- Tap **"MRP"** button in Quick Actions

### Updating Item MRP

#### Step 1: Search for Item

```
┌─────────────────────────────────┐
│ Update MRP              [✕]     │
├─────────────────────────────────┤
│ Search for an item              │
│ [🔍 Enter name, code, barcode]  │
└─────────────────────────────────┘
```

**Search Methods:**
- Type item name
- Enter item code
- Scan/enter barcode

**Search Results Show:**
- Item name
- Item code
- Barcode (if available)
- **Current MRP** in golden text

#### Step 2: Select Item

Tap the item from search results to select it.

```
┌─────────────────────────────────┐
│ Selected Item                   │
│ Item Name: ABC Product          │
│ Code: 12345                     │
│ Barcode: 1234567890123          │
│ Current MRP: ₹150               │
├─────────────────────────────────┤
│ New MRP (₹)                     │
│ [200]                           │
├─────────────────────────────────┤
│ [Change Item] [Update MRP]      │
└─────────────────────────────────┘
```

#### Step 3: Enter New MRP

1. Type the new MRP value
2. Verify the amount
3. Tap **"Update MRP"**

#### Step 4: Confirmation

```
Success!
MRP updated successfully!

Item: ABC Product
Old MRP: ₹150
New MRP: ₹200

[OK]
```

### MRP Update Rules

**Validation:**
- ✅ Must be positive number
- ✅ Can include decimals (₹99.99)
- ❌ Cannot be negative
- ❌ Cannot be zero
- ❌ Cannot be blank

**Authorization:**
- Both Staff and Supervisor can update MRP
- Changes are logged in activity log
- Supervisor can review MRP change history

---

## Reports & Export

### Available Reports (Supervisor Only)

#### Session Reports
- All counting sessions
- Filter by date range
- Filter by staff member
- Filter by warehouse
- Filter by status

#### Variance Reports
- Items with discrepancies
- Variance reasons breakdown
- High variance items
- Trend analysis

#### Activity Logs
- User actions
- Login/logout times
- Item updates
- MRP changes
- Session activities

#### Error Logs
- System errors
- Failed scans
- Sync issues
- API errors

### Exporting Data

**To Export:**
1. Tap **"Export"** in Quick Actions
2. Select data type:
   - Sessions
   - Items
   - Variances
   - Activity Logs
3. Choose format (CSV/Excel)
4. Tap **"Export"**
5. File downloads to device

**Export Contains:**
- Complete session data
- Item details
- Staff information
- Timestamps
- Variance reasons
- All metadata

**File Location:**
- Downloads folder on mobile device
- Can be shared via email/cloud

---

## Advanced Features

### Auto-Logout

**Security Feature:**
- Automatically logs out after 30 minutes of inactivity
- Prevents unauthorized access
- Configurable timeout (Supervisor only)

**Activity Resets Timer:**
- Any screen tap
- Any button press
- Navigation
- Data entry

**Warning:**
- 2-minute warning before logout
- Option to stay logged in
- Unsaved data protected

### Online Status

**Indicator Colors:**
- 🟢 **Online** - Connected to server
- 🔴 **Offline** - No connection
- 🟡 **Syncing** - Data synchronizing

**Offline Mode:**
- App works offline
- Data stored locally
- Auto-syncs when online
- Session continues seamlessly

### Search Functionality

**Smart Search Features:**
- Fuzzy matching (finds similar items)
- Partial word search
- Code prefix search
- Barcode substring search
- Category search

**Search Optimization:**
- Local search for < 3 characters
- API search for 3+ characters
- Returns top 10 most relevant
- Sorted by relevance score

### Calculator Features

**Built-in Calculator:**
- Addition (+)
- Subtraction (-)
- Multiplication (*)
- Division (/)
- Clear (C)
- Equals (=)

**Use Cases:**
- Calculate total from multiple boxes
- Add partial quantities
- Subtract damaged items
- Quick math for counting

---

## Troubleshooting

### Common Issues

#### Cannot Login

**Symptoms:**
- Login button doesn't work
- "Invalid credentials" error
- App crashes on login

**Solutions:**
1. Verify username and password
2. Check internet connection
3. Clear app cache
4. Restart app
5. Contact supervisor for password reset

#### Barcode Won't Scan

**Symptoms:**
- Camera shows but doesn't scan
- Barcode not recognized
- Wrong item loads

**Solutions:**
1. Improve lighting
2. Clean camera lens
3. Flatten barcode label
4. Try manual entry
5. Check if barcode is in system
6. Use search function instead

#### Item Not Found

**Symptoms:**
- "Item not found" message
- Search returns no results
- Barcode doesn't match any item

**Solutions:**
1. Try different search terms
2. Search by item code instead
3. Check spelling
4. Verify item exists in system
5. Ask supervisor to add item
6. Use database mapping feature

#### Variance Issues

**Symptoms:**
- Cannot submit without reason
- Variance reasons won't show
- Large unexpected variance

**Solutions:**
1. Double-check counted quantity
2. Verify system stock is correct
3. Select appropriate variance reason
4. Add detailed notes
5. Recount if uncertainty exists
6. Consult supervisor for approval

#### Session Won't Close

**Symptoms:**
- Checkmark doesn't work
- Session stays OPEN
- Cannot complete session

**Solutions:**
1. Submit all pending counts
2. Ensure all variances have reasons
3. Check internet connection
4. Restart app
5. Contact supervisor for manual close

#### Data Not Syncing

**Symptoms:**
- "Offline" indicator persistent
- Data doesn't appear on supervisor side
- Changes not saving

**Solutions:**
1. Check internet/WiFi connection
2. Wait for auto-sync (may take minutes)
3. Force refresh by pulling down
4. Restart app to trigger sync
5. Verify server status with supervisor

#### App Crashes

**Symptoms:**
- App closes unexpectedly
- Freezes and won't respond
- Black screen

**Solutions:**
1. Restart app
2. Restart device
3. Update app to latest version
4. Clear app cache
5. Reinstall app (last resort)
6. Report to supervisor with error details

### Performance Tips

**For Smooth Operation:**
- ✅ Close background apps
- ✅ Keep app updated
- ✅ Maintain 20%+ battery
- ✅ Use stable WiFi when possible
- ✅ Clear cache monthly
- ✅ Restart device weekly

**Battery Saving:**
- 🔋 Reduce screen brightness
- 🔋 Close app when not in use
- 🔋 Disable location services
- 🔋 Use power saving mode

---

## Best Practices

### For Accurate Counting

1. **Count Systematically**
   - Work section by section
   - Don't skip around
   - Mark counted areas

2. **Double Check Large Variances**
   - Recount if variance > 10%
   - Verify system stock
   - Document reasons clearly

3. **Use Quick Count Wisely**
   - Great for standard quantities
   - Verify for critical items
   - Combine with calculator for accuracy

4. **Document Everything**
   - Add notes to variances
   - Specify exact reasons
   - Include location details

5. **Complete Sessions Promptly**
   - Don't leave sessions open overnight
   - Submit counts same day
   - Close when fully counted

### For Efficient Workflow

1. **Prepare Before Starting**
   - Charge device fully
   - Know warehouse layout
   - Have backup barcode reader

2. **Use Barcode When Possible**
   - Faster than typing
   - Reduces errors
   - More reliable

3. **Batch Similar Items**
   - Count all of one category
   - Reduce context switching
   - Improve speed

4. **Regular Breaks**
   - Maintain accuracy
   - Reduce fatigue
   - Better concentration

5. **Review Before Closing**
   - Check variance list
   - Verify all reasons provided
   - Confirm counts accurate

### Security Best Practices

1. **Password Protection**
   - Don't share credentials
   - Use strong passwords
   - Change regularly

2. **Device Security**
   - Lock device when not in use
   - Don't leave unattended
   - Use biometric if available

3. **Data Privacy**
   - Don't screenshot sensitive data
   - Don't share exports publicly
   - Follow company policy

4. **Logout Properly**
   - Always logout when done
   - Don't rely only on auto-logout
   - Especially on shared devices

---

## Keyboard Shortcuts & Gestures

### Mobile Gestures

**Pull to Refresh:**
- Swipe down on session list
- Updates data from server
- Shows latest changes

**Swipe to Delete (Supervisor):**
- Swipe left on session
- Delete option appears
- Confirm deletion

**Long Press:**
- Hold item in list
- Shows quick actions
- Context menu appears

### Quick Entry

**6-Digit Code Entry:**
1. Type 6-digit item code
2. Press Enter/Search
3. Item loads automatically

**Barcode Manual Entry:**
1. Click search icon
2. Type full barcode number
3. Press Enter

---

## FAQ

### General Questions

**Q: Can I use the app offline?**
A: Yes, the app works offline. Data syncs automatically when connection is restored.

**Q: How long are sessions stored?**
A: Sessions are stored indefinitely. Supervisors can export historical data.

**Q: Can I edit a submitted count?**
A: No, once submitted you must contact supervisor to adjust. This ensures audit trail integrity.

**Q: What happens if I close the app mid-count?**
A: Your session remains OPEN. You can continue from where you left off.

**Q: Can multiple staff count the same warehouse?**
A: Yes, each creates their own session. Supervisor reconciles both.

### Technical Questions

**Q: What barcode types are supported?**
A: EAN-13, EAN-8, UPC-A, UPC-E, Code 39, Code 128, and QR codes.

**Q: Why does my phone camera need permission?**
A: Required for barcode scanning functionality. Deny if manual entry only.

**Q: How much storage does the app use?**
A: Approximately 50-100MB depending on data volume and cached items.

**Q: Can I export to Excel?**
A: Yes, exports are compatible with Excel, Google Sheets, and other spreadsheet apps.

**Q: Is my data encrypted?**
A: Yes, all data transmission is encrypted. Local storage follows device security settings.

### Workflow Questions

**Q: What if system stock is wrong?**
A: Count the physical stock, submit with variance reason "Data Entry Error", and notify supervisor.

**Q: Do I need to count every item?**
A: Depends on company policy. Some may require full count, others cycle counting.

**Q: Can I pause a session?**
A: Yes, sessions remain OPEN until you close them. Resume anytime.

**Q: What if I accidentally submit wrong quantity?**
A: Contact supervisor immediately. They can adjust in the system.

**Q: How do I handle damaged items?**
A: Exclude from count, note quantity, submit variance with "Damage/Wastage" reason.

---

## Glossary

**Barcode**: Machine-readable code of parallel lines representing data.

**Count Line**: Single entry of counted quantity for one item.

**MRP**: Maximum Retail Price - the highest price at which item can be sold.

**Reconcile**: Process of reviewing and approving sessions with variances.

**Session**: Single counting event with start, counting, and close phases.

**Stock Quantity**: System's expected quantity of an item.

**Variance**: Difference between counted quantity and system stock.

**Variance Reason**: Explanation for why variance occurred.

**Warehouse**: Physical location where inventory is stored and counted.

---

## Support & Contact

### Getting Help

**In-App Help:**
- Tap **Help** button in Staff Dashboard
- Context-sensitive help available
- Quick tips and guides

**Supervisor Support:**
- Contact your supervisor for:
  - Account issues
  - Data corrections
  - Training needs
  - App permissions

**Technical Support:**
- Email: support@stockcount.app
- Phone: [Your Support Number]
- Hours: [Your Support Hours]

### Reporting Bugs

**To Report Issues:**
1. Note the exact error message
2. Record steps to reproduce
3. Capture screenshot if possible
4. Send to supervisor or IT support
5. Include:
   - Device model
   - OS version
   - App version
   - Time of occurrence

### Feature Requests

**Suggest Improvements:**
- Contact supervisor with ideas
- Provide use case examples
- Explain expected benefit
- Submit via feedback form

---

## Version History

### Version 2.0 (Current)
- ✨ Added MRP update feature for Staff and Supervisor
- ✨ Redesigned Supervisor Dashboard with modern UI
- ✨ Improved iOS logout button visibility
- 🐛 Fixed React key warnings in search results
- 🐛 Fixed barcode scanning issues
- ⚡ Performance improvements

### Version 1.5
- Added variance reason tracking
- Improved search functionality
- Added export features
- Enhanced offline mode

### Version 1.0
- Initial release
- Basic counting functionality
- Session management
- Barcode scanning

---

## Appendix

### System Architecture

```
Mobile App (React Native)
    ↓
API Server (Python/Node.js)
    ↓
Database (SQL Server/MongoDB)
```

### Data Flow

```
1. User Login → Authentication
2. Create Session → Session Record Created
3. Scan Item → Item Lookup
4. Enter Count → Count Line Created
5. Submit Variance → Reason Required
6. Close Session → Status: RECONCILE
7. Supervisor Review → Status: CLOSED
8. Data Export → CSV/Excel File
```

### API Endpoints (For Developers)

- `POST /api/auth/login` - User authentication
- `GET /api/sessions` - Get sessions
- `POST /api/sessions` - Create session
- `GET /api/items/search` - Search items
- `POST /api/count-lines` - Submit count
- `PUT /api/items/:code/mrp` - Update MRP
- `GET /api/export/sessions` - Export data

---

## Document Information

**Document Version:** 2.0
**Last Updated:** November 4, 2025
**Author:** Stock Count Development Team
**Status:** Current

**For Latest Version:**
Visit: [Your Documentation URL]
Or contact your supervisor

---

**© 2025 Stock Count Application. All rights reserved.**

*This manual is for authorized users only. Do not distribute without permission.*
