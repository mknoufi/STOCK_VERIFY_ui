# API Contracts Documentation

**Version:** 1.0  
**Last Updated:** 2025-01-12  
**Purpose:** API contract definitions for Cursor AI context

## Base Configuration

- **Backend URL:** `http://localhost:8000` (development)
- **API Prefix:** `/api/v1` (most endpoints)
- **Authentication:** JWT Bearer token in `Authorization` header

## Authentication Endpoints

### POST `/api/v1/auth/login`
**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user": {
    "id": "string",
    "username": "string",
    "role": "admin" | "supervisor" | "staff"
  }
}
```

**Errors:**
- `401`: Invalid credentials
- `422`: Validation error

### POST `/api/v1/auth/refresh`
**Headers:** `Authorization: Bearer <refresh_token>`

**Response (200):**
```json
{
  "access_token": "string",
  "token_type": "bearer"
}
```

## Item Endpoints

### GET `/api/v1/items`
**Query Parameters:**
- `search`: string (optional) - Search by name/barcode
- `page`: integer (default: 1)
- `limit`: integer (default: 20)

**Response (200):**
```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "barcode": "string",
      "stock_qty": "decimal",
      "unit": "string"
    }
  ],
  "total": integer,
  "page": integer,
  "limit": integer
}
```

### GET `/api/v1/items/{item_id}`
**Response (200):**
```json
{
  "id": "string",
  "name": "string",
  "barcode": "string",
  "stock_qty": "decimal",
  "unit": "string",
  "warehouse": "string"
}
```

**Errors:**
- `404`: Item not found

### POST `/api/v1/items/search`
**Request:**
```json
{
  "barcode": "string" | null,
  "name": "string" | null
}
```

**Response (200):** Same as GET `/api/v1/items`

## Admin Endpoints

### GET `/api/v1/admin/control`
**Headers:** `Authorization: Bearer <token>` (admin only)

**Response (200):**
```json
{
  "services": {
    "backend": "running" | "stopped",
    "frontend": "running" | "stopped",
    "database": "connected" | "disconnected"
  },
  "metrics": {
    "total_items": integer,
    "total_users": integer
  }
}
```

### POST `/api/v1/admin/control/restart`
**Headers:** `Authorization: Bearer <token>` (admin only)

**Response (200):**
```json
{
  "message": "Services restarted",
  "status": "success"
}
```

## Dynamic Fields Endpoints

### GET `/api/v1/dynamic-fields`
**Response (200):**
```json
{
  "fields": [
    {
      "name": "string",
      "label": "string",
      "type": "text" | "number" | "date" | "select",
      "required": boolean,
      "options": ["string"] | null
    }
  ]
}
```

### POST `/api/v1/dynamic-fields`
**Headers:** `Authorization: Bearer <token>` (admin only)

**Request:**
```json
{
  "name": "string",
  "label": "string",
  "type": "text" | "number" | "date" | "select",
  "required": boolean,
  "options": ["string"] | null
}
```

## Dynamic Reports Endpoints

### GET `/api/v1/dynamic-reports`
**Response (200):**
```json
{
  "reports": [
    {
      "id": "string",
      "name": "string",
      "fields": ["string"],
      "filters": {}
    }
  ]
}
```

### POST `/api/v1/dynamic-reports/generate`
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "report_id": "string",
  "filters": {}
}
```

**Response (200):**
```json
{
  "data": [{}],
  "total": integer
}
```

## Health & Status Endpoints

### GET `/api/v1/health`
**Response (200):**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "services": {
    "database": "connected" | "disconnected",
    "erp_sync": "synced" | "pending" | "error"
  },
  "timestamp": "ISO8601"
}
```

### GET `/api/v1/sync/status`
**Response (200):**
```json
{
  "last_sync": "ISO8601",
  "status": "success" | "pending" | "error",
  "items_synced": integer,
  "errors": ["string"] | []
}
```

## Error Response Format

All errors follow this structure:

```json
{
  "detail": "string",
  "error_code": "string" | null,
  "timestamp": "ISO8601"
}
```

**Common Status Codes:**
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `422`: Unprocessable Entity (validation error)
- `500`: Internal Server Error

## Rate Limiting

- **Default:** 100 requests per minute per IP
- **Authentication endpoints:** 5 requests per minute per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Pagination

All list endpoints support pagination:
- `page`: integer (1-based)
- `limit`: integer (max 100)
- Response includes `total`, `page`, `limit`

## Date/Time Format

- **Format:** ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- **Timezone:** UTC (convert to IST +05:30 for display)

---

**For Cursor AI:** When implementing API changes:
1. Update this document
2. Ensure backward compatibility (version API if breaking)
3. Add request/response validation
4. Include error handling for all edge cases
5. Update frontend API client services accordingly

