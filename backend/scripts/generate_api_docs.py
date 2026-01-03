"""
API Documentation generator for Stock Verification System.
Generates OpenAPI/Swagger documentation with comprehensive examples.
"""

import json
from typing import Any

import yaml
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


def generate_comprehensive_api_docs(app: FastAPI) -> dict[str, Any]:
    """Generate comprehensive API documentation"""

    # Base OpenAPI schema
    openapi_schema = get_openapi(
        title="Stock Verification System API",
        version="2.0.0",
        description="""
# Stock Verification System API

A comprehensive inventory management and verification system built with FastAPI and React Native.

## Overview

The Stock Verification System API provides endpoints for:
- **Authentication & Authorization**: User registration, login, JWT token management
- **Item Management**: CRUD operations for inventory items with barcode support
- **Stock Verification**: Recording and tracking stock counts with discrepancy detection
- **Reporting**: Analytics and reporting capabilities for inventory management
- **Health Monitoring**: System health checks and status monitoring

## Authentication

This API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

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
        "timestamp": "2024-01-15T10:30:00Z"
    }
}
```

## Data Validation

All input data is validated using Pydantic models. Invalid data will return a 422 Unprocessable Entity error with validation details.
        """,
        routes=app.routes,
        servers=[
            {"url": "http://localhost:8000", "description": "Development server"},
            {
                "url": "https://api.stockverify.example.com",
                "description": "Production server",
            },
        ],
    )

    # Enhanced security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT token obtained from /auth/login endpoint",
        }
    }

    # Add comprehensive examples for each endpoint
    enhanced_paths = {}

    for path, methods in openapi_schema.get("paths", {}).items():
        enhanced_paths[path] = {}

        for method, operation in methods.items():
            enhanced_operation = operation.copy()

            # Add examples based on endpoint
            if path == "/auth/register" and method == "post":
                enhanced_operation.update(
                    {
                        "summary": "Register new user account",
                        "description": "Create a new user account with role-based access control. Passwords must be at least 8 characters with mixed case, numbers, and special characters.",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/UserCreate"},
                                    "examples": {
                                        "staff_user": {
                                            "summary": "Register staff user",
                                            "value": {
                                                "username": "john_doe",
                                                "email": "john.doe@company.com",
                                                "password": "SecurePass123!",
                                                "role": "staff",
                                                "first_name": "John",
                                                "last_name": "Doe",
                                                "department": "Warehouse",
                                            },
                                        },
                                        "admin_user": {
                                            "summary": "Register admin user",
                                            "value": {
                                                "username": "admin_user",
                                                "email": "admin@company.com",
                                                "password": "AdminPass456!",
                                                "role": "admin",
                                                "first_name": "Admin",
                                                "last_name": "User",
                                                "department": "Management",
                                            },
                                        },
                                    },
                                }
                            },
                        },
                        "responses": {
                            "201": {
                                "description": "User successfully created",
                                "content": {
                                    "application/json": {
                                        "example": {
                                            "id": "user_12345",
                                            "username": "john_doe",
                                            "email": "john.doe@company.com",
                                            "role": "staff",
                                            "is_active": True,
                                            "created_at": "2024-01-15T10:30:00Z",
                                        }
                                    }
                                },
                            },
                            "422": {
                                "description": "Validation error",
                                "content": {
                                    "application/json": {
                                        "example": {
                                            "detail": [
                                                {
                                                    "loc": ["body", "password"],
                                                    "msg": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
                                                    "type": "value_error",
                                                }
                                            ]
                                        }
                                    }
                                },
                            },
                        },
                    }
                )

            elif path == "/auth/login" and method == "post":
                enhanced_operation.update(
                    {
                        "summary": "Authenticate user and get access token",
                        "description": "Authenticate with username/email and password to receive a JWT access token. Tokens expire after 24 hours.",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "examples": {
                                        "username_login": {
                                            "summary": "Login with username",
                                            "value": {
                                                "username": "john_doe",
                                                "password": "SecurePass123!",
                                            },
                                        },
                                        "email_login": {
                                            "summary": "Login with email",
                                            "value": {
                                                "username": "john.doe@company.com",
                                                "password": "SecurePass123!",
                                            },
                                        },
                                    }
                                }
                            },
                        },
                        "responses": {
                            "200": {
                                "description": "Login successful",
                                "content": {
                                    "application/json": {
                                        "example": {
                                            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                            "token_type": "bearer",
                                            "expires_in": 86400,
                                            "user": {
                                                "id": "user_12345",
                                                "username": "john_doe",
                                                "email": "john.doe@company.com",
                                                "role": "staff",
                                                "permissions": [
                                                    "read:items",
                                                    "write:items",
                                                    "verify:stock",
                                                ],
                                            },
                                        }
                                    }
                                },
                            }
                        },
                    }
                )

            elif path == "/api/items/" and method == "post":
                enhanced_operation.update(
                    {
                        "summary": "Create new inventory item",
                        "description": "Add a new item to the inventory system with barcode and stock tracking capabilities.",
                        "security": [{"bearerAuth": []}],
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "examples": {
                                        "electronic_item": {
                                            "summary": "Electronic device",
                                            "value": {
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
                                                "description": "Premium wireless Bluetooth headphones with noise cancellation",
                                            },
                                        },
                                        "consumable_item": {
                                            "summary": "Consumable product",
                                            "value": {
                                                "barcode": "9876543210987",
                                                "name": "Office Printer Paper A4",
                                                "category": "Office Supplies",
                                                "expected_stock": 200,
                                                "location": "Storage Room B - Section 1",
                                                "supplier": "Office Depot",
                                                "cost_price": 4.50,
                                                "selling_price": 8.99,
                                                "reorder_level": 25,
                                                "description": "High-quality A4 printer paper, 500 sheets per pack",
                                            },
                                        },
                                    }
                                }
                            },
                        },
                        "responses": {
                            "201": {
                                "description": "Item successfully created",
                                "content": {
                                    "application/json": {
                                        "example": {
                                            "id": "item_67890",
                                            "barcode": "1234567890123",
                                            "name": "Wireless Bluetooth Headphones",
                                            "category": "Electronics",
                                            "expected_stock": 50,
                                            "actual_stock": 0,
                                            "location": "Warehouse A - Shelf 3B",
                                            "status": "active",
                                            "created_at": "2024-01-15T10:30:00Z",
                                            "updated_at": "2024-01-15T10:30:00Z",
                                        }
                                    }
                                },
                            }
                        },
                    }
                )

            elif path.startswith("/api/items/") and method == "get":
                if "{item_id}" in path:
                    enhanced_operation.update(
                        {
                            "summary": "Get item by ID",
                            "description": "Retrieve detailed information for a specific inventory item including stock levels and verification history.",
                            "responses": {
                                "200": {
                                    "description": "Item details",
                                    "content": {
                                        "application/json": {
                                            "example": {
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
                                            }
                                        }
                                    },
                                }
                            },
                        }
                    )
                else:
                    enhanced_operation.update(
                        {
                            "summary": "List all items with pagination",
                            "description": "Retrieve paginated list of all inventory items with filtering and sorting options.",
                            "parameters": [
                                {
                                    "name": "page",
                                    "in": "query",
                                    "description": "Page number (1-based)",
                                    "schema": {
                                        "type": "integer",
                                        "default": 1,
                                        "minimum": 1,
                                    },
                                },
                                {
                                    "name": "limit",
                                    "in": "query",
                                    "description": "Items per page",
                                    "schema": {
                                        "type": "integer",
                                        "default": 50,
                                        "minimum": 1,
                                        "maximum": 100,
                                    },
                                },
                                {
                                    "name": "category",
                                    "in": "query",
                                    "description": "Filter by category",
                                    "schema": {"type": "string"},
                                },
                                {
                                    "name": "location",
                                    "in": "query",
                                    "description": "Filter by location",
                                    "schema": {"type": "string"},
                                },
                                {
                                    "name": "status",
                                    "in": "query",
                                    "description": "Filter by status",
                                    "schema": {
                                        "type": "string",
                                        "enum": ["active", "inactive", "discontinued"],
                                    },
                                },
                                {
                                    "name": "sort_by",
                                    "in": "query",
                                    "description": "Sort field",
                                    "schema": {
                                        "type": "string",
                                        "enum": [
                                            "name",
                                            "category",
                                            "created_at",
                                            "updated_at",
                                            "expected_stock",
                                        ],
                                    },
                                },
                                {
                                    "name": "order",
                                    "in": "query",
                                    "description": "Sort order",
                                    "schema": {
                                        "type": "string",
                                        "enum": ["asc", "desc"],
                                        "default": "asc",
                                    },
                                },
                            ],
                        }
                    )

            elif path == "/api/verification/" and method == "post":
                enhanced_operation.update(
                    {
                        "summary": "Create stock verification record",
                        "description": "Record a stock verification with actual count and automatically calculate discrepancies.",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "examples": {
                                        "exact_count": {
                                            "summary": "Exact count match",
                                            "value": {
                                                "item_id": "item_67890",
                                                "expected_count": 50,
                                                "actual_count": 50,
                                                "status": "verified",
                                                "notes": "Physical count matches system record exactly",
                                                "verification_method": "manual_count",
                                                "location_verified": "Warehouse A - Shelf 3B",
                                            },
                                        },
                                        "discrepancy_found": {
                                            "summary": "Count discrepancy",
                                            "value": {
                                                "item_id": "item_67890",
                                                "expected_count": 50,
                                                "actual_count": 47,
                                                "status": "discrepancy",
                                                "notes": "Missing 3 units - possible theft or system error",
                                                "verification_method": "manual_count",
                                                "location_verified": "Warehouse A - Shelf 3B",
                                            },
                                        },
                                    }
                                }
                            },
                        },
                        "responses": {
                            "201": {
                                "description": "Verification record created",
                                "content": {
                                    "application/json": {
                                        "example": {
                                            "id": "verify_123456",
                                            "item_id": "item_67890",
                                            "expected_count": 50,
                                            "actual_count": 47,
                                            "discrepancy": -3,
                                            "status": "discrepancy",
                                            "verified_by": "john_doe",
                                            "verified_at": "2024-01-15T10:30:00Z",
                                            "notes": "Missing 3 units - possible theft or system error",
                                        }
                                    }
                                },
                            }
                        },
                    }
                )

            enhanced_paths[path][method] = enhanced_operation

    openapi_schema["paths"] = enhanced_paths

    # Add comprehensive component schemas
    openapi_schema["components"]["schemas"].update(
        {
            "UserCreate": {
                "type": "object",
                "required": ["username", "email", "password", "role"],
                "properties": {
                    "username": {
                        "type": "string",
                        "minLength": 3,
                        "maxLength": 50,
                        "pattern": "^[a-zA-Z0-9_]+$",
                        "description": "Unique username (alphanumeric and underscores only)",
                    },
                    "email": {
                        "type": "string",
                        "format": "email",
                        "description": "Valid email address",
                    },
                    "password": {
                        "type": "string",
                        "minLength": 8,
                        "description": "Password with mixed case, numbers, and special characters",
                    },
                    "role": {
                        "type": "string",
                        "enum": ["admin", "manager", "staff", "viewer"],
                        "description": "User role determining access permissions",
                    },
                    "first_name": {
                        "type": "string",
                        "maxLength": 100,
                        "description": "User's first name",
                    },
                    "last_name": {
                        "type": "string",
                        "maxLength": 100,
                        "description": "User's last name",
                    },
                    "department": {
                        "type": "string",
                        "maxLength": 100,
                        "description": "User's department or team",
                    },
                },
            },
            "ItemCreate": {
                "type": "object",
                "required": ["barcode", "name", "category", "expected_stock"],
                "properties": {
                    "barcode": {
                        "type": "string",
                        "minLength": 8,
                        "maxLength": 50,
                        "description": "Unique barcode identifier (UPC, EAN, or internal code)",
                    },
                    "name": {
                        "type": "string",
                        "maxLength": 200,
                        "description": "Item display name",
                    },
                    "category": {
                        "type": "string",
                        "maxLength": 100,
                        "description": "Item category for organization",
                    },
                    "expected_stock": {
                        "type": "integer",
                        "minimum": 0,
                        "description": "Expected quantity in inventory",
                    },
                    "location": {
                        "type": "string",
                        "maxLength": 200,
                        "description": "Physical storage location",
                    },
                    "supplier": {
                        "type": "string",
                        "maxLength": 200,
                        "description": "Supplier or vendor name",
                    },
                    "cost_price": {
                        "type": "number",
                        "minimum": 0,
                        "multipleOf": 0.01,
                        "description": "Cost price per unit",
                    },
                    "selling_price": {
                        "type": "number",
                        "minimum": 0,
                        "multipleOf": 0.01,
                        "description": "Selling price per unit",
                    },
                    "reorder_level": {
                        "type": "integer",
                        "minimum": 0,
                        "description": "Minimum stock level before reordering",
                    },
                    "expiry_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Product expiry date (if applicable)",
                    },
                    "description": {
                        "type": "string",
                        "maxLength": 1000,
                        "description": "Detailed item description",
                    },
                },
            },
            "VerificationCreate": {
                "type": "object",
                "required": ["item_id", "expected_count", "actual_count"],
                "properties": {
                    "item_id": {
                        "type": "string",
                        "description": "ID of the item being verified",
                    },
                    "expected_count": {
                        "type": "integer",
                        "minimum": 0,
                        "description": "Expected quantity from system records",
                    },
                    "actual_count": {
                        "type": "integer",
                        "minimum": 0,
                        "description": "Actual counted quantity",
                    },
                    "status": {
                        "type": "string",
                        "enum": ["verified", "discrepancy", "pending", "disputed"],
                        "default": "verified",
                        "description": "Verification status",
                    },
                    "notes": {
                        "type": "string",
                        "maxLength": 1000,
                        "description": "Verification notes or comments",
                    },
                    "verification_method": {
                        "type": "string",
                        "enum": [
                            "manual_count",
                            "barcode_scan",
                            "system_audit",
                            "cycle_count",
                        ],
                        "default": "manual_count",
                        "description": "Method used for verification",
                    },
                    "location_verified": {
                        "type": "string",
                        "maxLength": 200,
                        "description": "Location where verification was performed",
                    },
                },
            },
            "ErrorResponse": {
                "type": "object",
                "properties": {
                    "detail": {
                        "type": "object",
                        "properties": {
                            "message": {
                                "type": "string",
                                "description": "Human-readable error message",
                            },
                            "error_code": {
                                "type": "string",
                                "description": "Specific error code for programmatic handling",
                            },
                            "timestamp": {
                                "type": "string",
                                "format": "date-time",
                                "description": "When the error occurred",
                            },
                            "request_id": {
                                "type": "string",
                                "description": "Unique request ID for debugging",
                            },
                        },
                    }
                },
            },
        }
    )

    # Add tags for organization
    openapi_schema["tags"] = [
        {
            "name": "Authentication",
            "description": "User registration, login, and token management",
        },
        {"name": "Items", "description": "Inventory item management and operations"},
        {
            "name": "Verification",
            "description": "Stock verification and discrepancy tracking",
        },
        {"name": "Reports", "description": "Analytics and reporting endpoints"},
        {"name": "Health", "description": "System health and status monitoring"},
    ]

    return openapi_schema


def save_api_documentation(app: FastAPI, output_dir: str = "/tmp/"):  # nosec
    """Save API documentation in multiple formats"""

    # Generate comprehensive documentation
    openapi_schema = generate_comprehensive_api_docs(app)

    # Save as JSON
    with open(f"{output_dir}/api_documentation.json", "w") as f:
        json.dump(openapi_schema, f, indent=2)

    # Save as YAML
    with open(f"{output_dir}/api_documentation.yaml", "w") as f:
        yaml.dump(openapi_schema, f, default_flow_style=False, sort_keys=False)

    # Generate Markdown documentation
    markdown_doc = generate_markdown_documentation(openapi_schema)
    with open(f"{output_dir}/API_REFERENCE.md", "w") as f:
        f.write(markdown_doc)

    print(f"API documentation saved to {output_dir}")
    return openapi_schema


def _generate_md_header(openapi_schema: dict[str, Any]) -> str:
    """Generate the Markdown header section."""
    return f"""# {openapi_schema["info"]["title"]}

Version: {openapi_schema["info"]["version"]}

{openapi_schema["info"]["description"]}

## Base URL

```
{openapi_schema["servers"][0]["url"]}
```

## Authentication

This API uses Bearer Token authentication. Include your JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Get your token by calling the `/auth/login` endpoint.

## Endpoints

"""


def _group_endpoints_by_tag(openapi_schema: dict[str, Any]) -> dict[str, list[dict]]:
    """Group endpoints by their tags."""
    endpoints_by_tag: dict[str, list[dict]] = {}
    for path, methods in openapi_schema.get("paths", {}).items():
        for method, operation in methods.items():
            tags = operation.get("tags", ["General"])
            tag = tags[0] if tags else "General"
            if tag not in endpoints_by_tag:
                endpoints_by_tag[tag] = []
            endpoints_by_tag[tag].append(
                {"path": path, "method": method.upper(), "operation": operation}
            )
    return endpoints_by_tag


def _generate_parameters_md(parameters: list[dict]) -> str:
    """Generate markdown for API parameters."""
    if not parameters:
        return ""
    lines = [
        "**Parameters:**\n",
        "| Name | Type | Required | Description |",
        "|------|------|----------|-------------|",
    ]
    for param in parameters:
        name = param.get("name", "")
        param_type = param.get("schema", {}).get("type", "string")
        required = "Yes" if param.get("required", False) else "No"
        desc = param.get("description", "")
        lines.append(f"| {name} | {param_type} | {required} | {desc} |")
    return "\n".join(lines) + "\n\n"


def _generate_request_examples_md(request_body: dict) -> str:
    """Generate markdown for request body examples."""
    if not request_body:
        return ""
    content = request_body.get("content", {}).get("application/json", {})
    examples = content.get("examples", {})
    if not examples:
        return ""

    md = "**Request Examples:**\n\n"
    for example_name, example_data in examples.items():
        summary = example_data.get("summary", example_name)
        value = example_data.get("value", {})
        md += f"*{summary}:*\n```json\n{json.dumps(value, indent=2)}\n```\n\n"
    return md


def _generate_responses_md(responses: dict) -> str:
    """Generate markdown for API responses."""
    if not responses:
        return ""
    md = "**Responses:**\n\n"
    for status_code, response in responses.items():
        description = response.get("description", "")
        content = response.get("content", {}).get("application/json", {})
        example = content.get("example")
        md += f"**{status_code}** - {description}\n\n"
        if example:
            md += f"```json\n{json.dumps(example, indent=2)}\n```\n\n"
    return md


def _generate_endpoint_md(endpoint: dict) -> str:
    """Generate markdown for a single endpoint."""
    path = endpoint["path"]
    method = endpoint["method"]
    operation = endpoint["operation"]
    summary = operation.get("summary", f"{method} {path}")
    description = operation.get("description", "")

    md = f"#### {method} {path}\n\n**{summary}**\n\n"
    if description:
        md += f"{description}\n\n"
    md += _generate_parameters_md(operation.get("parameters", []))
    md += _generate_request_examples_md(operation.get("requestBody", {}))
    md += _generate_responses_md(operation.get("responses", {}))
    md += "---\n\n"
    return md


def generate_markdown_documentation(openapi_schema: dict[str, Any]) -> str:
    """Generate Markdown API reference documentation"""
    md_content = _generate_md_header(openapi_schema)
    endpoints_by_tag = _group_endpoints_by_tag(openapi_schema)

    for tag, endpoints in endpoints_by_tag.items():
        md_content += f"### {tag}\n\n"
        for endpoint in endpoints:
            md_content += _generate_endpoint_md(endpoint)

    return md_content


if __name__ == "__main__":
    # This would normally import your FastAPI app
    # For demonstration, we'll create a minimal app structure
    print("API documentation generator ready")
    print("Usage: from api_docs import save_api_documentation; save_api_documentation(app)")
