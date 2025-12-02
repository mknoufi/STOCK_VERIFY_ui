# STOCK_VERIFY_2 - Data Enrichment & Correction Workflow

## 📋 Primary Purpose

**This app is designed for:**
1. ✅ **Verify inventory stock** - Count physical items
2. ✅ **Correct item data** - Fix incorrect information
3. ✅ **Add missing values** - Enrich incomplete records

**NOT designed for:**
- ❌ Replacing SQL Server as source of truth
- ❌ Writing enriched data back to SQL Server
- ❌ Syncing corrections to legacy system

---

## 🔄 Complete Data Flow

```
┌────────────────────────────────────────────────────────────┐
│              SQL SERVER (Legacy System)                     │
│  - Source of truth for basic item data                     │
│  - May have incomplete/incorrect data                      │
│  - Quantities update regularly                              │
│  - READ ONLY for this app                                  │
└──────────────────┬─────────────────────────────────────────┘
                   │
                   │ 1. Initial Fetch
                   │ 2. Periodic Sync (qty changes)
                   │ 3. Real-time Check (on item selection)
                   ↓
┌────────────────────────────────────────────────────────────┐
│              MONGODB (Working Database)                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  ITEMS COLLECTION (Enriched Data)                    │ │
│  │  {                                                    │ │
│  │    item_code: "ITEM001",                             │ │
│  │    description: "...",                               │ │
│  │                                                       │ │
│  │    // From SQL Server (synced)                       │ │
│  │    sql_server_qty: 100,                              │ │
│  │    last_synced: ISODate(),                           │ │
│  │                                                       │ │
│  │    // From Staff (verified)                          │ │
│  │    last_verified_qty: 98,                            │ │
│  │    last_verified_at: ISODate(),                      │ │
│  │                                                       │ │
│  │    // Enriched Data (added by staff)                 │ │
│  │    serial_number: "SN12345",      // ← ADDED         │ │
│  │    mrp: 1999.00,                  // ← ADDED         │ │
│  │    hsn_code: "8517",              // ← ADDED         │ │
│  │    barcode: "1234567890123",      // ← CORRECTED     │ │
│  │    location: "Rack A-12",         // ← ADDED         │ │
│  │    condition: "good",             // ← ADDED         │ │
│  │                                                       │ │
│  │    // Enrichment Tracking                            │ │
│  │    data_complete: true,                              │ │
│  │    last_enriched_at: ISODate(),                      │ │
│  │    enriched_by: "user123",                           │ │
│  │    enrichment_history: [...]                         │ │
│  │  }                                                    │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                   │
                   │ Serve via API
                   ↓
┌────────────────────────────────────────────────────────────┐
│              MOBILE APP (Staff)                             │
│  1. View item (SQL qty + enriched data)                    │
│  2. Count physical stock                                   │
│  3. Add/correct: Serial, MRP, HSN, etc.                    │
│  4. Submit verification + corrections                       │
└────────────────────────────────────────────────────────────┘
```

---

## 📝 Typical Staff Workflow

### **Scenario: Staff counts item ITEM001**

#### **Step 1: Item Selection**
```
Staff scans barcode or searches for "ITEM001"
↓
App checks SQL Server for latest quantity
↓
App shows item details from MongoDB (enriched data)
```

**What Staff Sees:**
```
┌─────────────────────────────────┐
│  Item: ITEM001                  │
│  Description: Widget Type A     │
│                                 │
│  Expected Qty: 100 ⚠️           │
│  (from SQL Server)              │
│                                 │
│  ⚠️ Missing Data:               │
│  • Serial Number                │
│  • MRP                          │
│  • HSN Code                     │
│                                 │
│  [Start Verification] →         │
└─────────────────────────────────┘
```

#### **Step 2: Physical Count**
```
Staff counts physical items
↓
Found: 98 pieces (not 100!)
↓
Staff enters: 98
```

#### **Step 3: Data Enrichment**
```
App prompts for missing data:

┌─────────────────────────────────┐
│  ✓ Counted Qty: 98              │
│  Discrepancy: -2 pieces         │
│                                 │
│  Add Missing Information:       │
│                                 │
│  Serial Number:                 │
│  [SN12345_____________]         │
│                                 │
│  MRP (₹):                       │
│  [1999.00_____________]         │
│                                 │
│  HSN Code:                      │
│  [8517_________________]        │
│                                 │
│  Location:                      │
│  [Rack A-12___________]         │
│                                 │
│  Condition:                     │
│  [✓ Good] [ Damaged]            │
│                                 │
│  Notes (optional):              │
│  [2 pieces damaged,            │
│   moved to scrap___________]    │
│                                 │
│  📷 Add Photo (optional)        │
│                                 │
│  [Submit Verification] →        │
└─────────────────────────────────┘
```

#### **Step 4: Submission**
```
Staff clicks "Submit"
↓
Data sent to MongoDB:
  - Verified qty: 98
  - Serial number: SN12345
  - MRP: 1999.00
  - HSN code: 8517
  - Location: Rack A-12
  - Condition: good
  - Notes: "2 pieces damaged, moved to scrap"
  - Photo: uploaded
↓
MongoDB updates item record
↓
Staff sees confirmation
↓
Move to next item
```

---

## 💾 MongoDB Schema Design

### **Items Collection**
```javascript
{
  // Primary Key
  _id: ObjectId("..."),
  item_code: "ITEM001",  // Unique from SQL Server
  
  // Basic Info (from SQL Server)
  description: "Widget Type A",
  category: "Electronics",
  unit: "PCS",
  
  // Quantity Tracking
  sql_server_qty: 100,           // Current qty in SQL Server
  last_synced: ISODate("2025-11-28T10:00:00Z"),
  sql_modified: ISODate("2025-11-28T09:30:00Z"),
  qty_changed: false,            // Did SQL qty change since last sync?
  last_checked: ISODate("2025-11-28T10:15:00Z"),
  
  // Verification Data (from staff)
  last_verified_qty: 98,
  last_verified_at: ISODate("2025-11-28T10:15:00Z"),
  last_verified_by: "user123",
  verification_status: "completed",  // pending | in_progress | completed
  
  // Enriched Data (added/corrected by staff)
  serial_number: "SN12345",      // ← Staff added
  mrp: 1999.00,                  // ← Staff added
  hsn_code: "8517",              // ← Staff added
  barcode: "1234567890123",      // ← Staff corrected
  location: "Rack A-12",         // ← Staff added
  condition: "good",             // good | damaged | obsolete
  
  // Data Completeness
  required_fields: ["serial_number", "mrp", "hsn_code", "barcode"],
  data_complete: true,           // All required fields filled?
  completion_percentage: 100,    // % of fields filled
  
  // Enrichment Tracking
  last_enriched_at: ISODate("2025-11-28T10:15:00Z"),
  enriched_by: "user123",
  enrichment_history: [
    {
      updated_at: ISODate("2025-11-28T10:15:00Z"),
      updated_by: "user123",
      fields_updated: ["serial_number", "mrp", "hsn_code", "location"],
      old_values: {},
      new_values: {
        serial_number: "SN12345",
        mrp: 1999.00,
        hsn_code: "8517",
        location: "Rack A-12"
      }
    }
  ],
  
  // Metadata
  created_at: ISODate("2025-11-28T09:00:00Z"),
  updated_at: ISODate("2025-11-28T10:15:00Z"),
  is_active: true
}
```

### **Verifications Collection**
```javascript
{
  _id: ObjectId("..."),
  verification_id: "VER-2025-001234",
  
  // Item Reference
  item_code: "ITEM001",
  item_description: "Widget Type A",
  
  // Stock Count
  sql_server_qty: 100,           // Expected from SQL Server
  counted_qty: 98,               // Actual count by staff
  discrepancy: -2,               // Difference
  discrepancy_percentage: -2.0,  // -2%
  
  // Corrections/Additions
  corrections: {
    serial_number: {
      old_value: null,
      new_value: "SN12345",
      action: "added"
    },
    mrp: {
      old_value: null,
      new_value: 1999.00,
      action: "added"
    },
    hsn_code: {
      old_value: null,
      new_value: "8517",
      action: "added"
    },
    barcode: {
      old_value: "9876543210987",
      new_value: "1234567890123",
      action: "corrected"
    },
    location: {
      old_value: null,
      new_value: "Rack A-12",
      action: "added"
    },
    condition: {
      old_value: null,
      new_value: "good",
      action: "added"
    }
  },
  
  // Additional Info
  notes: "2 pieces damaged, moved to scrap",
  photos: [
    {
      url: "/uploads/ITEM001_damaged_2025-11-28.jpg",
      uploaded_at: ISODate("2025-11-28T10:15:00Z"),
      description: "Damaged items"
    }
  ],
  
  // Audit Trail
  verified_by: "user123",
  verified_by_name: "John Doe",
  verified_at: ISODate("2025-11-28T10:15:00Z"),
  device_id: "TABLET-001",
  location_gps: {
    lat: 12.9716,
    lng: 77.5946
  },
  
  // Approval Workflow
  status: "pending_approval",    // pending_approval | approved | rejected
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  
  // Metadata
  created_at: ISODate("2025-11-28T10:15:00Z"),
  updated_at: ISODate("2025-11-28T10:15:00Z")
}
```

---

## 🎯 Key Features

### **1. Missing Data Detection**
```python
def check_missing_fields(item):
    """
    Identify which required fields are missing
    """
    required_fields = {
        "serial_number": "Serial Number",
        "mrp": "MRP",
        "hsn_code": "HSN Code",
        "barcode": "Barcode"
    }
    
    missing = []
    for field, label in required_fields.items():
        if not item.get(field):
            missing.append(label)
    
    return {
        "has_missing": len(missing) > 0,
        "missing_fields": missing,
        "completion": (len(required_fields) - len(missing)) / len(required_fields) * 100
    }
```

### **2. Data Validation**
```python
def validate_enrichment_data(data):
    """
    Validate enriched data before saving
    """
    errors = []
    
    # Serial number format
    if data.get("serial_number"):
        if not re.match(r'^SN[0-9]{5,}$', data["serial_number"]):
            errors.append("Serial number must be in format: SN12345")
    
    # MRP validation
    if data.get("mrp"):
        if data["mrp"] <= 0:
            errors.append("MRP must be greater than 0")
    
    # HSN code validation (4 or 8 digits)
    if data.get("hsn_code"):
        if not re.match(r'^\d{4}(\d{4})?$', data["hsn_code"]):
            errors.append("HSN code must be 4 or 8 digits")
    
    # Barcode validation
    if data.get("barcode"):
        if not re.match(r'^\d{13}$', data["barcode"]):
            errors.append("Barcode must be 13 digits (EAN-13)")
    
    return {
        "is_valid": len(errors) == 0,
        "errors": errors
    }
```

### **3. Bulk Data Import**
```python
def import_enriched_data_from_excel(file_path):
    """
    Bulk import enriched data from Excel
    Admin can upload Excel with:
    - Item Code
    - Serial Number
    - MRP
    - HSN Code
    - etc.
    """
    df = pd.read_excel(file_path)
    
    results = {
        "success": 0,
        "failed": 0,
        "errors": []
    }
    
    for _, row in df.iterrows():
        try:
            item_code = row['Item Code']
            
            # Validate data
            validation = validate_enrichment_data(row.to_dict())
            if not validation["is_valid"]:
                results["failed"] += 1
                results["errors"].append({
                    "item_code": item_code,
                    "errors": validation["errors"]
                })
                continue
            
            # Update MongoDB
            mongodb.items.update_one(
                {"item_code": item_code},
                {
                    "$set": {
                        "serial_number": row.get('Serial Number'),
                        "mrp": row.get('MRP'),
                        "hsn_code": row.get('HSN Code'),
                        "barcode": row.get('Barcode'),
                        "data_complete": True,
                        "last_enriched_at": datetime.now(),
                        "enriched_by": "bulk_import"
                    }
                }
            )
            
            results["success"] += 1
            
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({
                "item_code": item_code,
                "error": str(e)
            })
    
    return results
```

---

## 📊 Reports & Analytics

### **1. Data Completeness Report**
```
┌──────────────────────────────────────────────────────────┐
│  Data Completeness Report                                │
│  Generated: 2025-11-28 15:30                             │
├──────────────────────────────────────────────────────────┤
│  Total Items: 1,000                                      │
│  Complete: 750 (75%)                                     │
│  Incomplete: 250 (25%)                                   │
│                                                          │
│  Missing Fields:                                         │
│  • Serial Numbers: 180 items (18%)                      │
│  • MRP: 120 items (12%)                                 │
│  • HSN Codes: 150 items (15%)                           │
│  • Barcodes: 80 items (8%)                              │
│                                                          │
│  Progress by Category:                                   │
│  Electronics: ████████░░ 80%                            │
│  Furniture: ██████░░░░ 60%                              │
│  Stationery: ████████░░ 75%                             │
│                                                          │
│  [Export Report] [Assign Tasks]                         │
└──────────────────────────────────────────────────────────┘
```

### **2. Verification Summary**
```
┌──────────────────────────────────────────────────────────┐
│  Verification Summary - Today                            │
│  Date: 2025-11-28                                        │
├──────────────────────────────────────────────────────────┤
│  Items Verified: 245                                     │
│  Data Enriched: 180 (73%)                                │
│  Discrepancies Found: 12 (5%)                            │
│                                                          │
│  Enrichment Activity:                                    │
│  • Serial Numbers Added: 150                             │
│  • MRP Added: 130                                        │
│  • HSN Codes Added: 145                                  │
│  • Barcodes Corrected: 25                                │
│  • Locations Added: 200                                  │
│                                                          │
│  Top Contributors:                                       │
│  1. John Doe: 85 items enriched                         │
│  2. Sarah Smith: 65 items enriched                      │
│  3. Mike Johnson: 30 items enriched                     │
│                                                          │
│  [View Details] [Export]                                │
└──────────────────────────────────────────────────────────┘
```

### **3. Discrepancy Report**
```
┌──────────────────────────────────────────────────────────┐
│  Stock Discrepancies Report                              │
│  Items with Count ≠ System Qty                           │
├──────────────────────────────────────────────────────────┤
│  Item Code │ Expected │ Counted │ Diff │ Status        │
│──────────┬─────────┬────────┬──────┬─────────────────│
│  ITEM001 │   100   │   98   │  -2  │ ⏳ Pending     │
│  ITEM005 │   50    │   52   │  +2  │ ✅ Approved    │
│  ITEM012 │   75    │   70   │  -5  │ ⏳ Pending     │
│  ITEM023 │   200   │   205  │  +5  │ ❌ Rejected    │
│──────────┴─────────┴────────┴──────┴─────────────────│
│                                                          │
│  Total Discrepancies: 12                                 │
│  Total Variance: -15 pieces (-0.5%)                     │
│                                                          │
│  [Approve All] [Reject] [Investigate]                   │
└──────────────────────────────────────────────────────────┘
```

---

## 🔒 Data Security

### **Enriched Data Protection**
```javascript
// MongoDB access control
db.createRole({
  role: "staffEnrichment",
  privileges: [
    {
      resource: { db: "stock_verify", collection: "items" },
      actions: ["find", "update"]  // Can view and enrich
    },
    {
      resource: { db: "stock_verify", collection: "verifications" },
      actions: ["find", "insert"]  // Can add verifications
    }
  ],
  roles: []
})

// Field-level permissions
const staffCanUpdate = [
  "serial_number",
  "mrp",
  "hsn_code",
  "barcode",
  "location",
  "condition"
]

const staffCannotUpdate = [
  "item_code",         // System field
  "sql_server_qty",    // From SQL Server
  "created_at",        // System field
  "_id"                // MongoDB ID
]
```

---

## 📱 Mobile App Enhancements

### **Smart Form Fields**
```typescript
interface EnrichmentForm {
  // Auto-suggest based on similar items
  serial_number: {
    type: 'text',
    validation: /^SN[0-9]{5,}$/,
    placeholder: 'SN12345',
    suggestions: ['SN12345', 'SN12346', 'SN12347']  // From recent entries
  },
  
  // Number input with currency format
  mrp: {
    type: 'currency',
    currency: 'INR',
    min: 0,
    placeholder: '₹1,999.00'
  },
  
  // HSN code lookup
  hsn_code: {
    type: 'searchable',
    dataSource: 'hsn_codes',  // Predefined HSN codes
    placeholder: 'Search HSN...',
    recentlyUsed: ['8517', '8471', '8528']
  },
  
  // Barcode scanner
  barcode: {
    type: 'barcode',
    scannerEnabled: true,
    manualEntry: true,
    validation: /^\d{13}$/
  },
  
  // Location picker
  location: {
    type: 'picker',
    options: ['Rack A-12', 'Rack A-13', 'Rack B-01'],
    allowCustom: true
  },
  
  // Condition radio
  condition: {
    type: 'radio',
    options: ['good', 'damaged', 'obsolete'],
    default: 'good'
  }
}
```

---

## ✅ Success Criteria

**Data Enrichment Goals:**
- ✅ 100% of items have serial numbers
- ✅ 100% of items have MRP
- ✅ 100% of items have HSN codes
- ✅ 95%+ accuracy in stock counts
- ✅ 90%+ staff adoption rate
- ✅ Average 2 minutes per item enrichment

**System Performance:**
- ✅ Real-time SQL Server qty check < 500ms
- ✅ MongoDB write operations < 100ms
- ✅ Mobile app offline support
- ✅ 99.9% uptime during working hours

---

**Last Updated:** 2025-11-28  
**Purpose:** Stock verification + Data enrichment  
**Primary Database:** MongoDB (enriched data)  
**Source Database:** SQL Server (read-only reference)
