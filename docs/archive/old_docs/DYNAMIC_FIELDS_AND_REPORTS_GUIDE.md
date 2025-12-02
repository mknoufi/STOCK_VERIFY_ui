# Dynamic Fields & Report Generation System

## 🎯 Overview

A comprehensive system for adding custom fields to items dynamically and generating custom reports with flexible configurations.

---

## 📋 Table of Contents

1. [Dynamic Fields System](#dynamic-fields-system)
2. [Database Mapping](#database-mapping)
3. [Dynamic Report Generation](#dynamic-report-generation)
4. [API Endpoints](#api-endpoints)
5. [Usage Examples](#usage-examples)
6. [Integration Guide](#integration-guide)

---

## 🔧 Dynamic Fields System

### Features

✅ **Add Custom Fields** - Create new fields for items without modifying database schema
✅ **Multiple Field Types** - Text, number, date, select, multiselect, boolean, JSON, etc.
✅ **Database Mapping** - Map dynamic fields to existing database columns
✅ **Validation Rules** - Min/max, regex, required, options validation
✅ **Field History** - Track all changes to field values
✅ **Bulk Operations** - Set values for multiple items at once
✅ **Search & Filter** - Find items by dynamic field values
✅ **Statistics** - Get analytics for field usage and distributions

### Supported Field Types

| Type | Description | Example Use Case |
|------|-------------|------------------|
| `text` | Single-line text | Supplier name, Location |
| `number` | Numeric value | Warranty months, Reorder level |
| `date` | Date only | Expiry date, Purchase date |
| `datetime` | Date and time | Last inspection, Arrival time |
| `select` | Single selection | Category, Grade, Status |
| `multiselect` | Multiple selections | Tags, Features, Certifications |
| `boolean` | True/False | Is perishable, Requires refrigeration |
| `json` | Complex data | Specifications, Dimensions |
| `url` | Web link | Product page, Manual URL |
| `email` | Email address | Supplier contact |
| `phone` | Phone number | Customer service number |

---

## 🗄️ Database Mapping

### Overview

Dynamic fields can be mapped to existing database columns, allowing:
- Gradual migration to new schema
- Unified interface for old and new fields
- Backward compatibility
- Automatic synchronization

### How It Works

```json
{
  "field_name": "warranty_period",
  "field_type": "number",
  "display_label": "Warranty Period (months)",
  "db_mapping": "warranty_months",  // Maps to items.warranty_months
  "validation_rules": {
    "min": 0,
    "max": 120
  }
}
```

When a value is set:
1. Value is saved in `dynamic_field_values` collection
2. If `db_mapping` exists, value is also written to `items.warranty_months`
3. Both locations stay synchronized

### Benefits

- **No Schema Changes** - Add fields without ALTER TABLE
- **Zero Downtime** - No database migrations required
- **Flexible** - Easy to add/remove fields
- **Auditable** - All changes tracked with history
- **Performant** - Indexed queries on mapped fields

---

## 📊 Dynamic Report Generation

### Features

✅ **Custom Templates** - Save reusable report configurations
✅ **Multiple Formats** - Excel, CSV, JSON, PDF
✅ **Flexible Filtering** - Filter by any field or condition
✅ **Grouping & Aggregation** - Group data and calculate sums, averages, etc.
✅ **Dynamic Fields Included** - Automatically include custom fields
✅ **Runtime Filters** - Override template filters at generation time
✅ **Report History** - Track all generated reports
✅ **Quick Reports** - Pre-configured common reports

### Report Types

#### 1. Items Report
- All item master data
- Includes dynamic fields
- Filter by categories, suppliers, etc.

#### 2. Sessions Report
- Counting session details
- Include session items
- Filter by date, warehouse, staff

#### 3. Variance Report
- Variance analysis
- Grouped by warehouse, item, date
- Aggregate total variance

#### 4. Audit Report
- Activity logs
- User actions tracking
- Filter by user, action, date

#### 5. Custom Report
- Aggregated data from multiple sources
- Complex joins and calculations
- Fully customizable

### Output Formats

| Format | Extension | MIME Type | Best For |
|--------|-----------|-----------|----------|
| Excel | .xlsx | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | Data analysis, pivot tables |
| CSV | .csv | text/csv | Import to other systems, simple data |
| JSON | .json | application/json | API integration, programmatic access |
| PDF | .pdf | application/pdf | Sharing, printing, archives |

---

## 🌐 API Endpoints

### Dynamic Fields API

#### Create Field Definition
```http
POST /api/dynamic-fields/definitions
Authorization: Bearer {token}
Permissions: manage_dynamic_fields

{
  "field_name": "warranty_period",
  "field_type": "select",
  "display_label": "Warranty Period",
  "options": ["1 year", "2 years", "3 years", "5 years"],
  "required": false,
  "visible": true,
  "in_reports": true,
  "order": 10
}
```

#### Get All Field Definitions
```http
GET /api/dynamic-fields/definitions?enabled_only=true&visible_only=false
Authorization: Bearer {token}
```

#### Set Field Value
```http
POST /api/dynamic-fields/values
Authorization: Bearer {token}

{
  "item_code": "ITEM001",
  "field_name": "warranty_period",
  "value": "2 years"
}
```

#### Bulk Set Field Values
```http
POST /api/dynamic-fields/values/bulk
Authorization: Bearer {token}
Permissions: bulk_edit_items

{
  "item_codes": ["ITEM001", "ITEM002", "ITEM003"],
  "field_values": {
    "warranty_period": "2 years",
    "supplier": "ABC Corp"
  }
}
```

#### Get Item Field Values
```http
GET /api/dynamic-fields/values/{item_code}
Authorization: Bearer {token}
```

#### Get Field Statistics
```http
GET /api/dynamic-fields/statistics/{field_name}
Authorization: Bearer {token}
```

### Dynamic Reports API

#### Create Report Template
```http
POST /api/reports/templates
Authorization: Bearer {token}
Permissions: manage_reports

{
  "name": "Monthly Variance Report",
  "description": "Variance analysis by warehouse",
  "report_type": "variance",
  "fields": [
    {"name": "warehouse", "label": "Warehouse"},
    {"name": "item_code", "label": "Item Code"},
    {"name": "variance", "label": "Variance"}
  ],
  "filters": {
    "session_date": {"$gte": "2025-01-01"}
  },
  "grouping": ["warehouse"],
  "aggregations": {
    "variance": "sum"
  },
  "format": "excel"
}
```

#### Generate Report from Template
```http
POST /api/reports/generate
Authorization: Bearer {token}
Permissions: generate_reports

{
  "template_id": "507f1f77bcf86cd799439011",
  "runtime_filters": {
    "warehouse": "Main Warehouse"
  }
}
```

#### Download Report
```http
GET /api/reports/{report_id}/download
Authorization: Bearer {token}
```

#### Quick Report: Items with Fields
```http
GET /api/reports/quick/items-with-fields?format=excel
Authorization: Bearer {token}
```

#### Quick Report: Variance Summary
```http
GET /api/reports/quick/variance-summary?start_date=2025-01-01&warehouse=Main&format=excel
Authorization: Bearer {token}
```

---

## 💡 Usage Examples

### Example 1: Add Warranty Field

```python
# 1. Create field definition
POST /api/dynamic-fields/definitions
{
  "field_name": "warranty_months",
  "field_type": "number",
  "display_label": "Warranty Period (Months)",
  "db_mapping": "warranty",  // Map to existing column
  "validation_rules": {"min": 0, "max": 120},
  "required": false,
  "searchable": true,
  "in_reports": true
}

# 2. Set values for items
POST /api/dynamic-fields/values/bulk
{
  "item_codes": ["ITEM001", "ITEM002", "ITEM003"],
  "field_values": {
    "warranty_months": 24
  }
}

# 3. Search items by warranty
GET /api/dynamic-fields/items?field_name=warranty_months&field_value=24
```

### Example 2: Generate Custom Variance Report

```python
# 1. Create template
POST /api/reports/templates
{
  "name": "High Variance Items",
  "report_type": "variance",
  "fields": [
    {"name": "item_code", "label": "Item Code"},
    {"name": "item_name", "label": "Item Name"},
    {"name": "warehouse", "label": "Warehouse"},
    {"name": "variance", "label": "Variance"},
    {"name": "warranty_months", "label": "Warranty", "source": "dynamic"}
  ],
  "filters": {
    "variance": {"$gte": 100}  // Only high variance
  },
  "sorting": [{"field": "variance", "order": "desc"}],
  "format": "excel"
}

# 2. Generate report
POST /api/reports/generate
{
  "template_id": "abc123",
  "runtime_filters": {
    "warehouse": "Main Warehouse"
  }
}

# 3. Download
GET /api/reports/xyz789/download
```

### Example 3: Add Multiple Field Types

```python
# Supplier information
POST /api/dynamic-fields/definitions
{
  "field_name": "supplier_name",
  "field_type": "text",
  "display_label": "Supplier Name",
  "searchable": true
}

# Temperature requirements
POST /api/dynamic-fields/definitions
{
  "field_name": "storage_temp",
  "field_type": "select",
  "display_label": "Storage Temperature",
  "options": ["Ambient", "Refrigerated", "Frozen"],
  "required": true
}

# Expiry tracking
POST /api/dynamic-fields/definitions
{
  "field_name": "expiry_date",
  "field_type": "date",
  "display_label": "Expiry Date",
  "in_reports": true
}

# Bulk set values
POST /api/dynamic-fields/values/bulk
{
  "item_codes": ["FOOD001", "FOOD002"],
  "field_values": {
    "supplier_name": "Fresh Foods Inc",
    "storage_temp": "Refrigerated",
    "expiry_date": "2025-12-31"
  }
}
```

---

## 🔗 Integration Guide

### Step 1: Add Routers to Server

```python
# backend/server.py

from backend.api.dynamic_fields_api import dynamic_fields_router
from backend.api.dynamic_reports_api import dynamic_reports_router

# Add to API router
api_router.include_router(dynamic_fields_router)
api_router.include_router(dynamic_reports_router)
```

### Step 2: Create Database Indexes

```python
# For better performance
await db.dynamic_field_definitions.create_index([("field_name", 1)], unique=True)
await db.dynamic_field_definitions.create_index([("enabled", 1), ("order", 1)])
await db.dynamic_field_values.create_index([("item_code", 1), ("field_name", 1)])
await db.dynamic_field_values.create_index([("field_name", 1), ("value", 1)])
await db.report_templates.create_index([("enabled", 1), ("report_type", 1)])
await db.generated_reports.create_index([("generated_by", 1), ("generated_at", -1)])
```

### Step 3: Add Permissions

```python
# backend/auth/permissions.py

DYNAMIC_FIELDS_PERMISSIONS = [
    "manage_dynamic_fields",   # Create/edit/delete field definitions
    "view_dynamic_fields",     # View field definitions
    "edit_field_values",       # Set field values
    "bulk_edit_items",         # Bulk set field values
]

REPORTS_PERMISSIONS = [
    "manage_reports",          # Create/edit report templates
    "generate_reports",        # Generate reports
    "view_all_reports",        # View all generated reports
    "download_reports",        # Download report files
]

# Assign to roles
ROLE_PERMISSIONS = {
    "supervisor": [
        ...existing_permissions,
        "manage_dynamic_fields",
        "bulk_edit_items",
        "manage_reports",
        "generate_reports",
        "view_all_reports"
    ],
    "staff": [
        ...existing_permissions,
        "view_dynamic_fields",
        "edit_field_values",
        "generate_reports",
        "download_reports"
    ]
}
```

### Step 4: Frontend Integration

```typescript
// services/dynamicFieldsService.ts

export const getFieldDefinitions = async () => {
  const response = await api.get('/api/dynamic-fields/definitions');
  return response.data;
};

export const setFieldValue = async (itemCode: string, fieldName: string, value: any) => {
  const response = await api.post('/api/dynamic-fields/values', {
    item_code: itemCode,
    field_name: fieldName,
    value: value
  });
  return response.data;
};

export const generateReport = async (templateId: string, filters: any) => {
  const response = await api.post('/api/reports/generate', {
    template_id: templateId,
    runtime_filters: filters
  });
  return response.data;
};

export const downloadReport = async (reportId: string) => {
  const response = await api.get(`/api/reports/${reportId}/download`, {
    responseType: 'blob'
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', response.headers['content-disposition'].split('filename=')[1]);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
```

---

## 📊 Database Schema

### Collections Created

#### 1. `dynamic_field_definitions`
```javascript
{
  _id: ObjectId,
  field_name: String,           // Unique field name
  field_type: String,           // Field type
  display_label: String,        // Display label
  db_mapping: String,           // Optional DB column mapping
  options: [String],            // Options for select types
  validation_rules: Object,     // Validation configuration
  default_value: Any,           // Default value
  required: Boolean,            // Is required
  visible: Boolean,             // Is visible in UI
  searchable: Boolean,          // Can be searched
  in_reports: Boolean,          // Include in reports
  order: Number,                // Display order
  created_by: String,
  created_at: Date,
  updated_at: Date,
  enabled: Boolean
}
```

#### 2. `dynamic_field_values`
```javascript
{
  _id: ObjectId,
  item_code: String,            // Item code
  field_name: String,           // Field name
  field_type: String,           // Field type
  value: Any,                   // Field value
  set_by: String,               // Who set it
  created_at: Date,
  updated_at: Date,
  history: [                    // Change history
    {
      value: Any,
      updated_by: String,
      updated_at: Date
    }
  ]
}
```

#### 3. `report_templates`
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  report_type: String,
  fields: [Object],             // Field configurations
  filters: Object,              // Filter criteria
  grouping: [String],           // Group by fields
  sorting: [Object],            // Sort configuration
  aggregations: Object,         // Aggregation functions
  format: String,               // Output format
  created_by: String,
  created_at: Date,
  updated_at: Date,
  enabled: Boolean,
  usage_count: Number
}
```

#### 4. `generated_reports`
```javascript
{
  _id: ObjectId,
  template_id: ObjectId,
  template_name: String,
  report_type: String,
  filters_applied: Object,
  record_count: Number,
  file_name: String,
  file_size: Number,
  mime_type: String,
  format: String,
  generated_by: String,
  generated_at: Date,
  download_count: Number
}
```

#### 5. `report_files`
```javascript
{
  _id: ObjectId,
  report_id: ObjectId,
  file_data: Binary,            // File content
  created_at: Date
}
```

---

## 🎯 Benefits

### For Business
- ✅ **No Development Delays** - Add fields instantly
- ✅ **Flexible Reporting** - Generate any report on demand
- ✅ **Data-Driven Decisions** - Better analytics and insights
- ✅ **Cost Savings** - No consultant fees for schema changes
- ✅ **Regulatory Compliance** - Easy to add compliance fields

### For Users
- ✅ **Self-Service** - Create fields without IT help
- ✅ **Custom Reports** - Design reports that match workflow
- ✅ **Quick Exports** - Download data in preferred format
- ✅ **Easy Tracking** - Track any data point needed

### For Developers
- ✅ **Zero Downtime** - No schema migrations
- ✅ **API-First** - RESTful endpoints
- ✅ **Type-Safe** - Pydantic validation
- ✅ **Scalable** - Indexed queries, async operations
- ✅ **Maintainable** - Clean service layer architecture

---

## 🚀 Next Steps

1. ✅ Integrate routers into server
2. ✅ Create database indexes
3. ✅ Add permissions to roles
4. ✅ Build frontend UI components
5. ✅ Test with sample data
6. ✅ Deploy to production

---

## 📞 Support

For questions or issues:
- Check API documentation: `/api/docs`
- Review error logs in activity logs
- Contact system administrator

**Developed with:** FastAPI, MongoDB, Pandas, Pydantic
