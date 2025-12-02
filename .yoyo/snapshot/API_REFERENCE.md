# Stock Verification System - API Reference

Version: 2.0.0

## Overview

The Stock Verification System API provides endpoints for:
- **Authentication & Authorization**: User registration, login, JWT token management
- **Item Management**: CRUD operations for inventory items with barcode support
- **Stock Verification**: Recording and tracking stock counts with discrepancy detection
- **Reporting**: Analytics and reporting capabilities for inventory management
- **Health Monitoring**: System health checks and status monitoring

## Base URL

```
http://localhost:8000 (Development)
https://api.stockverify.example.com (Production)
```

## Authentication

This API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Get your token by calling the `/auth/login` endpoint.

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Authentication endpoints: 5 requests per minute per IP
- General API endpoints: 100 requests per minute per user
- Search endpoints: 50 requests per minute per user

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages:

```json
{
    "detail": {
        "message": "Error description",
        "error_code": "SPECIFIC_ERROR_CODE",
        "timestamp": "2024-01-15T10:30:00Z",
        "request_id": "req_12345"
    }
}
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `AUTH_TOKEN_EXPIRED` | JWT token has expired |
| `AUTH_TOKEN_INVALID` | JWT token is malformed or invalid |
| `PERMISSION_DENIED` | User lacks required permissions |
| `ITEM_NOT_FOUND` | Requested item does not exist |
| `BARCODE_DUPLICATE` | Barcode already exists in system |
| `VALIDATION_ERROR` | Request data validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests from client |

---

## Authentication Endpoints

### POST /auth/register

**Register new user account**

Create a new user account with role-based access control. Passwords must be at least 8 characters with mixed case, numbers, and special characters.

**Request Body:**

*Staff User Example:*
```json
{
    "username": "john_doe",
    "email": "john.doe@company.com",
    "password": "SecurePass123!",
    "role": "staff",
    "first_name": "John",
    "last_name": "Doe",
    "department": "Warehouse"
}
```

*Admin User Example:*
```json
{
    "username": "admin_user",
    "email": "admin@company.com",
    "password": "AdminPass456!",
    "role": "admin",
    "first_name": "Admin",
    "last_name": "User",
    "department": "Management"
}
```

**Responses:**

**201** - User successfully created
```json
{
    "id": "user_12345",
    "username": "john_doe",
    "email": "john.doe@company.com",
    "role": "staff",
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z"
}
```

**422** - Validation error
```json
{
    "detail": [
        {
            "loc": ["body", "password"],
            "msg": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
            "type": "value_error"
        }
    ]
}
```

---

### POST /auth/login

**Authenticate user and get access token**

Authenticate with username/email and password to receive a JWT access token. Tokens expire after 24 hours.

**Request Body:**

*Username Login:*
```json
{
    "username": "john_doe",
    "password": "SecurePass123!"
}
```

*Email Login:*
```json
{
    "username": "john.doe@company.com",
    "password": "SecurePass123!"
}
```

**Responses:**

**200** - Login successful
```json
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
        "id": "user_12345",
        "username": "john_doe",
        "email": "john.doe@company.com",
        "role": "staff",
        "permissions": ["read:items", "write:items", "verify:stock"]
    }
}
```

---

## Item Management Endpoints

### POST /api/items/

**Create new inventory item**

Add a new item to the inventory system with barcode and stock tracking capabilities.

**Authentication:** Required (Bearer token)

**Request Body:**

*Electronic Item Example:*
```json
{
    "barcode": "1234567890123",
    "name": "Wireless Bluetooth Headphones",
    "category": "Electronics",
    "expected_stock": 50,
    "location": "Warehouse A - Shelf 3B",
    "supplier": "TechCorp Ltd",
    "cost_price": 25.99,
    "selling_price": 59.99,
    "reorder_level": 10,
    "expiry_date": "2025-12-31",
    "description": "Premium wireless Bluetooth headphones with noise cancellation"
}
```

*Consumable Item Example:*
```json
{
    "barcode": "9876543210987",
    "name": "Office Printer Paper A4",
    "category": "Office Supplies",
    "expected_stock": 200,
    "location": "Storage Room B - Section 1",
    "supplier": "Office Depot",
    "cost_price": 4.50,
    "selling_price": 8.99,
    "reorder_level": 25,
    "description": "High-quality A4 printer paper, 500 sheets per pack"
}
```

**Responses:**

**201** - Item successfully created
```json
{
    "id": "item_67890",
    "barcode": "1234567890123",
    "name": "Wireless Bluetooth Headphones",
    "category": "Electronics",
    "expected_stock": 50,
    "actual_stock": 0,
    "location": "Warehouse A - Shelf 3B",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### GET /api/items/

**List all items with pagination**

Retrieve paginated list of all inventory items with filtering and sorting options.

**Authentication:** Required (Bearer token)

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | integer | No | Page number (1-based, default: 1) |
| limit | integer | No | Items per page (default: 50, max: 100) |
| category | string | No | Filter by category |
| location | string | No | Filter by location |
| status | string | No | Filter by status (active, inactive, discontinued) |
| sort_by | string | No | Sort field (name, category, created_at, updated_at, expected_stock) |
| order | string | No | Sort order (asc, desc, default: asc) |

**Example Request:**
```
GET /api/items/?page=1&limit=20&category=Electronics&sort_by=name&order=asc
```

**Responses:**

**200** - Items retrieved successfully
```json
{
    "items": [
        {
            "id": "item_67890",
            "barcode": "1234567890123",
            "name": "Wireless Bluetooth Headphones",
            "category": "Electronics",
            "expected_stock": 50,
            "actual_stock": 47,
            "location": "Warehouse A - Shelf 3B",
            "status": "active",
            "last_verified": "2024-01-14T15:20:00Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total_items": 150,
        "total_pages": 8,
        "has_next": true,
        "has_prev": false
    }
}
```

---

### GET /api/items/{item_id}

**Get item by ID**

Retrieve detailed information for a specific inventory item including stock levels and verification history.

**Authentication:** Required (Bearer token)

**Path Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| item_id | string | Yes | Unique item identifier |

**Responses:**

**200** - Item details retrieved
```json
{
    "id": "item_67890",
    "barcode": "1234567890123",
    "name": "Wireless Bluetooth Headphones",
    "category": "Electronics",
    "expected_stock": 50,
    "actual_stock": 47,
    "location": "Warehouse A - Shelf 3B",
    "supplier": "TechCorp Ltd",
    "cost_price": 25.99,
    "selling_price": 59.99,
    "reorder_level": 10,
    "status": "active",
    "last_verified": "2024-01-14T15:20:00Z",
    "verification_count": 3,
    "total_discrepancy": -3,
    "created_at": "2024-01-10T09:00:00Z",
    "updated_at": "2024-01-14T15:20:00Z"
}
```

**404** - Item not found
```json
{
    "detail": {
        "message": "Item not found",
        "error_code": "ITEM_NOT_FOUND",
        "timestamp": "2024-01-15T10:30:00Z"
    }
}
```

---

### GET /api/items/barcode/{barcode}

**Get item by barcode**

Retrieve item information using barcode scan. Optimized for mobile barcode scanning workflow.

**Authentication:** Required (Bearer token)

**Path Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| barcode | string | Yes | Item barcode |

**Responses:**

**200** - Item found
```json
{
    "id": "item_67890",
    "barcode": "1234567890123",
    "name": "Wireless Bluetooth Headphones",
    "category": "Electronics",
    "expected_stock": 50,
    "actual_stock": 47,
    "location": "Warehouse A - Shelf 3B",
    "status": "active"
}
```

---

### PUT /api/items/{item_id}/stock

**Update item stock count**

Update the actual stock count for an item, typically after physical verification.

**Authentication:** Required (Bearer token)

**Path Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| item_id | string | Yes | Unique item identifier |

**Request Body:**
```json
{
    "actual_stock": 47,
    "verified_by": "john_doe",
    "verification_notes": "Physical count completed, 3 units missing"
}
```

**Responses:**

**200** - Stock updated successfully
```json
{
    "id": "item_67890",
    "barcode": "1234567890123",
    "name": "Wireless Bluetooth Headphones",
    "expected_stock": 50,
    "actual_stock": 47,
    "discrepancy": -3,
    "last_verified": "2024-01-15T10:30:00Z",
    "verified_by": "john_doe"
}
```

---

### GET /api/items/search

**Search items**

Search items by name, barcode, category, or description. Supports full-text search.

**Authentication:** Required (Bearer token)

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| q | string | Yes | Search query |
| limit | integer | No | Maximum results (default: 50) |

**Example Request:**
```
GET /api/items/search?q=bluetooth+headphones&limit=10
```

**Responses:**

**200** - Search results
```json
{
    "results": [
        {
            "id": "item_67890",
            "barcode": "1234567890123",
            "name": "Wireless Bluetooth Headphones",
            "category": "Electronics",
            "location": "Warehouse A - Shelf 3B",
            "match_score": 0.95
        }
    ],
    "total_results": 1,
    "search_time_ms": 15
}
```

---

## Stock Verification Endpoints

### POST /api/verification/

**Create stock verification record**

Record a stock verification with actual count and automatically calculate discrepancies.

**Authentication:** Required (Bearer token)

**Request Body:**

*Exact Count Match:*
```json
{
    "item_id": "item_67890",
    "expected_count": 50,
    "actual_count": 50,
    "status": "verified",
    "notes": "Physical count matches system record exactly",
    "verification_method": "manual_count",
    "location_verified": "Warehouse A - Shelf 3B"
}
```

*Count Discrepancy:*
```json
{
    "item_id": "item_67890",
    "expected_count": 50,
    "actual_count": 47,
    "status": "discrepancy",
    "notes": "Missing 3 units - possible theft or system error",
    "verification_method": "manual_count",
    "location_verified": "Warehouse A - Shelf 3B"
}
```

**Responses:**

**201** - Verification record created
```json
{
    "id": "verify_123456",
    "item_id": "item_67890",
    "expected_count": 50,
    "actual_count": 47,
    "discrepancy": -3,
    "status": "discrepancy",
    "verified_by": "john_doe",
    "verified_at": "2024-01-15T10:30:00Z",
    "notes": "Missing 3 units - possible theft or system error"
}
```

---

### GET /api/verification/discrepancies

**Get items with discrepancies**

Retrieve all items with stock discrepancies for review and resolution.

**Authentication:** Required (Bearer token)

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| threshold | integer | No | Minimum discrepancy threshold (default: 1) |
| status | string | No | Filter by status (pending, resolved) |

**Responses:**

**200** - Discrepancies found
```json
{
    "discrepancies": [
        {
            "item_id": "item_67890",
            "item_name": "Wireless Bluetooth Headphones",
            "expected_count": 50,
            "actual_count": 47,
            "discrepancy": -3,
            "last_verified": "2024-01-15T10:30:00Z",
            "status": "pending",
            "priority": "medium"
        }
    ],
    "summary": {
        "total_discrepancies": 15,
        "total_shortage": -45,
        "total_overage": 12,
        "net_discrepancy": -33
    }
}
```

---

### GET /api/verification/item/{item_id}

**Get verification history for item**

Retrieve all verification records for a specific item.

**Authentication:** Required (Bearer token)

**Path Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| item_id | string | Yes | Unique item identifier |

**Responses:**

**200** - Verification history
```json
{
    "item_id": "item_67890",
    "verifications": [
        {
            "id": "verify_123456",
            "expected_count": 50,
            "actual_count": 47,
            "discrepancy": -3,
            "status": "discrepancy",
            "verified_by": "john_doe",
            "verified_at": "2024-01-15T10:30:00Z",
            "notes": "Missing 3 units"
        }
    ],
    "summary": {
        "total_verifications": 5,
        "average_discrepancy": -1.2,
        "last_verification": "2024-01-15T10:30:00Z"
    }
}
```

---

## Health and Monitoring Endpoints

### GET /health

**System health check**

Check overall system health and component status.

**Authentication:** None required

**Responses:**

**200** - System healthy
```json
{
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "components": {
        "database": "healthy",
        "cache": "healthy",
        "external_apis": "healthy"
    },
    "performance": {
        "response_time_ms": 45,
        "memory_usage_mb": 128,
        "active_connections": 12
    }
}
```

**503** - System unhealthy
```json
{
    "status": "unhealthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "components": {
        "database": "unhealthy",
        "cache": "healthy",
        "external_apis": "degraded"
    },
    "errors": [
        "Database connection timeout",
        "High response latency detected"
    ]
}
```

---

### GET /api/stats

**System statistics**

Get system usage statistics and metrics.

**Authentication:** Required (Bearer token)

**Responses:**

**200** - Statistics retrieved
```json
{
    "items": {
        "total_count": 1250,
        "active_count": 1200,
        "categories": 15,
        "locations": 8
    },
    "verifications": {
        "today": 45,
        "this_week": 312,
        "this_month": 1280,
        "accuracy_rate": 0.94
    },
    "discrepancies": {
        "pending": 8,
        "resolved_today": 12,
        "total_value": -450.25
    },
    "users": {
        "active_today": 15,
        "total_registered": 25
    }
}
```

---

## Data Models

### User Roles and Permissions

| Role | Permissions |
|------|-------------|
| `admin` | Full system access, user management, reports |
| `manager` | Item management, verification oversight, reports |
| `staff` | Item verification, stock updates, basic reports |
| `viewer` | Read-only access to items and reports |

### Item Status Values

| Status | Description |
|--------|-------------|
| `active` | Item is in active inventory |
| `inactive` | Item is temporarily disabled |
| `discontinued` | Item is no longer in inventory |

### Verification Status Values

| Status | Description |
|--------|-------------|
| `verified` | Count matches expected (within tolerance) |
| `discrepancy` | Count differs from expected |
| `pending` | Verification in progress |
| `disputed` | Discrepancy under investigation |

---

## SDK and Integration Examples

### JavaScript/TypeScript Example

```javascript
class StockVerifyAPI {
    constructor(baseURL, token) {
        this.baseURL = baseURL;
        this.token = token;
    }

    async createItem(itemData) {
        const response = await fetch(`${this.baseURL}/api/items/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });
        return await response.json();
    }

    async verifyStock(itemId, actualCount, notes) {
        const item = await this.getItem(itemId);
        const verificationData = {
            item_id: itemId,
            expected_count: item.expected_stock,
            actual_count: actualCount,
            notes: notes,
            status: actualCount === item.expected_stock ? 'verified' : 'discrepancy'
        };

        const response = await fetch(`${this.baseURL}/api/verification/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(verificationData)
        });
        return await response.json();
    }
}
```

### Python Example

```python
import requests

class StockVerifyClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

    def create_item(self, item_data):
        response = requests.post(
            f'{self.base_url}/api/items/',
            json=item_data,
            headers=self.headers
        )
        return response.json()

    def verify_stock(self, item_id, actual_count, notes=''):
        item = self.get_item(item_id)
        verification_data = {
            'item_id': item_id,
            'expected_count': item['expected_stock'],
            'actual_count': actual_count,
            'notes': notes,
            'status': 'verified' if actual_count == item['expected_stock'] else 'discrepancy'
        }
        
        response = requests.post(
            f'{self.base_url}/api/verification/',
            json=verification_data,
            headers=self.headers
        )
        return response.json()
```

---

## Support and Resources

- **API Status Page**: https://status.stockverify.example.com
- **Developer Portal**: https://developers.stockverify.example.com  
- **Support Email**: api-support@stockverify.example.com
- **Rate Limit Headers**: All responses include `X-RateLimit-*` headers
- **API Versioning**: Use `Accept: application/vnd.stockverify.v2+json` header for version pinning

---

*Last Updated: January 15, 2024*
*API Version: 2.0.0*