# Quality Control API Reference

## Base URL
```
/api/v1/quality
```

## Authentication
All endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Quality Inspections

#### Create Inspection
```http
POST /api/v1/quality/inspections
```

**Request Body:**
```json
{
  "item_code": "ITEM001",
  "batch_number": "BATCH-2024-001",
  "condition_status": "GOOD",
  "expiry_date": "2024-12-31",
  "quality_notes": "Item in excellent condition",
  "photos": ["photo1.jpg", "photo2.jpg"],
  "disposition": "ACCEPTED",
  "session_id": "session123"
}
```

**Response:**
```json
{
  "inspection_id": "60d5ec49f1b2c8b1f8e4e1a1",
  "message": "Inspection created successfully"
}
```

---

#### Get Inspection
```http
GET /api/v1/quality/inspections/{inspection_id}
```

**Response:**
```json
{
  "_id": "60d5ec49f1b2c8b1f8e4e1a1",
  "item_code": "ITEM001",
  "condition_status": "GOOD",
  "disposition": "ACCEPTED",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

#### List Item Inspections
```http
GET /api/v1/quality/inspections?item_code=ITEM001&limit=10
```

**Query Parameters:**
- `item_code` (required): Item to query
- `limit` (optional): Max results (default: 10)

---

#### Update Inspection
```http
PUT /api/v1/quality/inspections/{inspection_id}
```

**Request Body:**
```json
{
  "quality_notes": "Updated notes",
  "disposition": "QUARANTINE"
}
```

---

### 2. Expiry Management

#### Get Expiring Items
```http
GET /api/v1/quality/expiring?days_threshold=30&limit=50
```

**Query Parameters:**
- `days_threshold` (optional): Days until expiry (default: 30)
- `limit` (optional): Max results (default: 50)

**Response:**
```json
[
  {
    "item_code": "ITEM001",
    "batch_number": "BATCH-001",
    "expiry_date": "2024-02-15",
    "days_until_expiry": 15
  }
]
```

---

#### Get Expired Items
```http
GET /api/v1/quality/expired?limit=50
```

---

#### Create Expiry Alert
```http
POST /api/v1/quality/alerts
```

**Request Body:**
```json
{
  "itemCode": "ITEM001",
  "batchNumber": "BATCH-001",
  "expiryDate": "2024-02-15",
  "alertType": "EXPIRING_SOON"
}
```

**Alert Types:**
- `EXPIRING_SOON` - Item expiring soon
- `EXPIRED` - Item already expired

---

#### Acknowledge Alert
```http
PUT /api/v1/quality/alerts/{alert_id}/acknowledge
```

**Response:**
```json
{
  "message": "Alert acknowledged successfully"
}
```

---

#### Get Unacknowledged Alerts
```http
GET /api/v1/quality/alerts/unacknowledged?limit=50
```

---

### 3. Defective Items

#### Report Defective Item
```http
POST /api/v1/quality/defective-items
```

**Request Body:**
```json
{
  "itemCode": "ITEM001",
  "batchNumber": "BATCH-001",
  "defectDescription": "Packaging damaged during shipping",
  "severity": "MEDIUM",
  "photos": ["defect1.jpg", "defect2.jpg"],
  "reportedBy": "user123"
}
```

**Severity Levels:**
- `LOW` - Minor cosmetic issues
- `MEDIUM` - Functional issues
- `HIGH` - Major defects
- `CRITICAL` - Safety hazards

---

#### Get Defective Items
```http
GET /api/v1/quality/defective-items?status=REPORTED&severity=HIGH&limit=50
```

**Query Parameters:**
- `status` (optional): Filter by status
- `severity` (optional): Filter by severity
- `limit` (optional): Max results (default: 50)

**Statuses:**
- `REPORTED` - Newly reported
- `UNDER_REVIEW` - Being investigated
- `RESOLVED` - Issue resolved

---

#### Update Defective Item Status
```http
PUT /api/v1/quality/defective-items/{item_id}/status
```

**Request Body:**
```json
{
  "status": "RESOLVED",
  "resolution_notes": "Item replaced with new stock"
}
```

---

### 4. Quality Metrics

#### Get Quality Metrics
```http
GET /api/v1/quality/metrics?days=30
```

**Query Parameters:**
- `days` (optional): Time period for metrics (default: 30)

**Response:**
```json
{
  "condition_stats": [
    { "_id": "GOOD", "count": 150 },
    { "_id": "DAMAGED", "count": 10 },
    { "_id": "EXPIRED", "count": 5 }
  ],
  "defective_stats": [
    { "_id": "LOW", "count": 8 },
    { "_id": "MEDIUM", "count": 5 },
    { "_id": "HIGH", "count": 2 },
    { "_id": "CRITICAL", "count": 1 }
  ],
  "expiring_count": 15,
  "total_inspections": 165
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid condition_status value"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 404 Not Found
```json
{
  "detail": "Inspection not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Database error: connection timeout"
}
```

---

## TypeScript Client Usage

```typescript
import { qualityControlApi } from '@/services/api/qualityControlApi';

// Create inspection
const inspection = await qualityControlApi.createInspection({
  itemCode: "ITEM001",
  conditionStatus: "GOOD",
  qualityNotes: "Excellent condition",
  photos: [],
  disposition: "ACCEPTED"
});

// Get metrics
const metrics = await qualityControlApi.getQualityMetrics(30);

// Report defect
const defect = await qualityControlApi.reportDefectiveItem({
  itemCode: "ITEM002",
  defectDescription: "Packaging torn",
  severity: "LOW",
  photos: ["photo.jpg"],
  reportedBy: userId
});
```

---

## Rate Limiting

No rate limiting currently implemented. Consider adding for production:
- 100 requests per minute per user
- 1000 requests per hour per user

---

## Best Practices

1. **Always include photos** for DAMAGED or EXPIRED items
2. **Use batch numbers** when available for traceability
3. **Link to sessions** for audit trail
4. **Acknowledge alerts** promptly to avoid duplicates
5. **Add resolution notes** when closing defect reports
6. **Use appropriate severity levels** for defects

---

## Future Enhancements

- Bulk inspection endpoints
- Export quality reports (CSV, PDF)
- Webhook notifications for critical defects
- Quality trend analysis endpoints
- Integration with ERP for RMA processing
