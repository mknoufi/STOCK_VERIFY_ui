# API Contracts Documentation

This document defines the standardized request/response formats used throughout the Stock Verification API. All endpoints follow these contracts unless explicitly documented otherwise.

> **Document Roles**:
> - **This document** (`API_CONTRACTS.md`): **Normative** — defines the target API contract, response envelopes, and standards. Use for API design decisions and client implementation guidance.
> - **[APP_LOGIC_OVERVIEW.md](APP_LOGIC_OVERVIEW.md)**: **Descriptive** — describes actual runtime behavior, data flows, and implementation details. Use for debugging, onboarding, and understanding how the system works.
>
> Note: Some endpoints currently return responses that differ from these contracts (see [Response Envelope Reality Check](APP_LOGIC_OVERVIEW.md#response-envelope-reality-check) in APP_LOGIC_OVERVIEW.md for details).

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response payload (varies by endpoint)
  },
  "message": "Human-readable message (optional)",
  "timestamp": "2025-12-23T15:30:45.123456",
  "request_id": "uuid-correlation-id"
}
```

**Fields:**
- `success` (boolean): Always `true` for successful requests
- `data` (any): Response payload containing requested data
- `message` (string, optional): User-friendly message
- `timestamp` (ISO8601): Server timestamp when response was generated
- `request_id` (string, optional): Request correlation ID for tracking

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context about the error",
      "reason": "Why the error occurred"
    }
  },
  "timestamp": "2025-12-23T15:30:45.123456",
  "request_id": "uuid-correlation-id"
}
```

**Fields:**
- `success` (boolean): Always `false` for error responses
- `data` (null): Always null for errors
- `error` (object): Error details containing:
  - `code` (string): Machine-readable error code
  - `message` (string): Human-readable error message
  - `details` (object, optional): Additional context about the error
- `timestamp` (ISO8601): Server timestamp
- `request_id` (string, optional): Request correlation ID

## Standard Error Codes

### Authentication Errors (401)
- `UNAUTHORIZED` - Missing or invalid authentication
- `TOKEN_EXPIRED` - JWT token has expired
- `INVALID_CREDENTIALS` - Invalid username/password

### Authorization Errors (403)
- `FORBIDDEN` - Authenticated but not authorized
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `ROLE_NOT_ALLOWED` - User role not permitted for operation

### Validation Errors (422)
- `VALIDATION_ERROR` - Request data validation failed
- `INVALID_FIELD` - Specific field validation failed
- `MISSING_REQUIRED_FIELD` - Required field is missing

### Resource Errors (404)
- `NOT_FOUND` - Requested resource not found
- `RESOURCE_DELETED` - Resource has been deleted
- `COLLECTION_EMPTY` - Collection has no items

### Conflict Errors (409)
- `CONFLICT` - Request conflicts with existing data
- `DUPLICATE_ENTRY` - Duplicate entry already exists
- `SYNC_CONFLICT` - Data synchronization conflict

### Rate Limiting (429)
- `RATE_LIMITED` - Too many requests
- `QUOTA_EXCEEDED` - Usage quota exceeded

### Server Errors (500)
- `INTERNAL_ERROR` - Unexpected server error
- `DATABASE_ERROR` - Database operation failed
- `SERVICE_UNAVAILABLE` - Required service is unavailable

## Paginated Response Format

For endpoints returning lists, the response follows this format:

```json
{
  "success": true,
  "data": {
    "items": [
      // Array of items
    ],
    "total": 150,
    "page": 1,
    "page_size": 20,
    "total_pages": 8,
    "has_next": true,
    "has_previous": false
  },
  "message": null,
  "timestamp": "2025-12-23T15:30:45.123456",
  "request_id": "uuid-correlation-id"
}
```

**Fields:**
- `items` (array): List of returned items
- `total` (integer): Total number of items across all pages
- `page` (integer): Current page number (1-indexed)
- `page_size` (integer): Number of items per page
- `total_pages` (integer): Total number of pages
- `has_next` (boolean): Whether a next page exists
- `has_previous` (boolean): Whether a previous page exists

**Query Parameters:**
- `page` (integer, optional, default=1): Page number to retrieve
- `page_size` (integer, optional, default=20): Items per page (max 100)
- `sort_by` (string, optional): Field to sort by
- `sort_order` (string, optional): 'asc' or 'desc'

## Health Check Response

```json
{
  "status": "ok",
  "timestamp": "2025-12-23T15:30:45.123456",
  "mongodb": "connected",
  "sql_server": "connected",
  "cache": "connected",
  "version": "1.0.0"
}
```

## HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET/PATCH/DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Malformed request syntax |
| 401 | Unauthorized | Missing/invalid authentication |
| 403 | Forbidden | Authenticated but unauthorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Data conflict or duplicate entry |
| 422 | Unprocessable Entity | Validation error in request body |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Required service is down |

## Authentication

All protected endpoints require the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

The JWT token must be obtained via the `/api/auth/login` endpoint and is valid for 24 hours.

## Request Headers

All requests should include:

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token> (for protected endpoints)
```

## Response Headers

All responses include:

```
Content-Type: application/json
X-Request-ID: <correlation-id>
X-Process-Time: <milliseconds>
```

## Rate Limiting

API requests are rate-limited per user:

- **Standard tier**: 1000 requests/hour
- **Admin tier**: 5000 requests/hour

Current limits are returned in response headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1703339445
```

## CORS Policy

Cross-Origin Requests:

- **Allowed Origins**: Configured via `CORS_ALLOW_ORIGINS` environment variable
- **Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, X-Request-ID
- **Credentials**: Allowed (cookies/auth headers)

## API Versioning

Current API version: `v1`

All endpoints are prefixed with `/api/`:
```
/api/v1/items
/api/v1/auth/login
/api/v1/reports
```

Legacy endpoints (without version) are mapped to v1 for backward compatibility.

## Common Request/Response Examples

### Example: User Login

**Request:**
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "staff@example.com",
    "password": "secure_password"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "expires_in": 86400,
    "user_id": "user-123",
    "username": "staff@example.com",
    "role": "staff"
  },
  "message": "Login successful",
  "timestamp": "2025-12-23T15:30:45.123456",
  "request_id": "abc-123-def"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password",
    "details": {
      "username": "Provided username not found or password incorrect"
    }
  },
  "timestamp": "2025-12-23T15:30:45.123456",
  "request_id": "abc-123-def"
}
```

### Example: Get Items (Paginated)

**Request:**
```bash
curl -X GET "http://localhost:8001/api/items?page=1&page_size=20" \
  -H "Authorization: Bearer <token>"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item-123",
        "barcode": "510001",
        "name": "Product A",
        "quantity": 100,
        "status": "in_stock"
      }
    ],
    "total": 1500,
    "page": 1,
    "page_size": 20,
    "total_pages": 75,
    "has_next": true,
    "has_previous": false
  },
  "message": null,
  "timestamp": "2025-12-23T15:30:45.123456",
  "request_id": "abc-123-def"
}
```

### Example: Validation Error

**Request:**
```bash
curl -X POST http://localhost:8001/api/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "barcode": "invalid"
  }'
```

**Error Response (422):**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "barcode": "Must be a 6-digit number starting with 51, 52, or 53",
      "name": "This field is required"
    }
  },
  "timestamp": "2025-12-23T15:30:45.123456",
  "request_id": "abc-123-def"
}
```

## Testing API Endpoints

### Using cURL
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"staff","password":"password"}' | jq -r '.data.access_token')

# Use token in subsequent requests
curl -X GET http://localhost:8001/api/items \
  -H "Authorization: Bearer $TOKEN"
```

### Using HTTPie
```bash
# Login and store token
http POST :8001/api/auth/login username=staff password=password

# Use token
http GET :8001/api/items Authorization:"Bearer <token>"
```

### Using Postman
1. Set `Authorization` tab to "Bearer Token"
2. Paste JWT token from login response
3. All subsequent requests will include the token

## Changelog

### Version 1.0.0 (Current)
- Standardized response format with `success`, `data`, `error`, `timestamp`, `request_id`
- Standardized error format with `code`, `message`, `details`
- Pagination support with `PaginatedResponse`
- Rate limiting headers
- Request correlation IDs for tracing

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

