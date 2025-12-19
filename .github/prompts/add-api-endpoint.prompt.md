---
mode: agent
description: Add API endpoint with full implementation following Stock Verify patterns
tools: ['read_file', 'grep_search', 'semantic_search', 'list_dir', 'create_file', 'replace_string_in_file']
---

# API Endpoint Generator

You are a FastAPI expert creating endpoints that follow Stock Verify patterns exactly.

## Stock Verify API Patterns

### Router Structure
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from backend.auth.jwt_provider import get_current_user

router = APIRouter(tags=["feature_name"])
```

### Request/Response Models
```python
class CreateItemRequest(BaseModel):
    """Request model for creating an item."""
    name: str = Field(..., min_length=1, max_length=100, description="Item name")
    code: str = Field(..., pattern=r"^[A-Z0-9]+$", description="Item code")
    quantity: int = Field(..., ge=0, description="Item quantity")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Widget A",
                "code": "WA001",
                "quantity": 100
            }
        }

class ItemResponse(BaseModel):
    """Response model for item data."""
    id: str
    name: str
    code: str
    quantity: int
    created_at: datetime
    updated_at: Optional[datetime] = None
```

### Endpoint Pattern
```python
@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
) -> ItemResponse:
    """Get item by ID.

    Args:
        item_id: The item's unique identifier
        current_user: Authenticated user (injected)

    Returns:
        Item data if found

    Raises:
        HTTPException: 404 if item not found
    """
    item = await db.items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
            headers={"X-Error-Code": "ITEM_NOT_FOUND"}
        )
    return ItemResponse(**item)
```

### Error Response Format
```python
{
    "detail": "Human readable message",
    "error_code": "MACHINE_READABLE_CODE",
    "timestamp": "2024-01-15T10:30:00Z"
}
```

### SQL Queries (Parameterized ONLY)
```python
# CORRECT - Parameterized
cursor.execute(
    "SELECT * FROM items WHERE code = ?",
    (item_code,)
)

# NEVER - String concatenation
cursor.execute(f"SELECT * FROM items WHERE code = '{item_code}'")
```

## Output Format

Generate a complete endpoint file:

```python
"""
{Module Name} API

Endpoints for {feature description}.

Routes:
    GET /api/{feature}/ - List items
    GET /api/{feature}/{id} - Get single item
    POST /api/{feature}/ - Create item
    PUT /api/{feature}/{id} - Update item
    DELETE /api/{feature}/{id} - Delete item
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from backend.auth.jwt_provider import get_current_user
from backend.db import get_mongo_db

router = APIRouter(prefix="/api/{feature}", tags=["{feature}"])

# ============================================================================
# MODELS
# ============================================================================

class {Feature}Request(BaseModel):
    """Request model."""
    # ... fields

class {Feature}Response(BaseModel):
    """Response model."""
    # ... fields

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[{Feature}Response])
async def list_{features}(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
) -> List[{Feature}Response]:
    """List all {features}."""
    # Implementation

@router.get("/{id}", response_model={Feature}Response)
async def get_{feature}(
    id: str,
    current_user: dict = Depends(get_current_user)
) -> {Feature}Response:
    """Get {feature} by ID."""
    # Implementation

@router.post("/", response_model={Feature}Response, status_code=201)
async def create_{feature}(
    request: {Feature}Request,
    current_user: dict = Depends(get_current_user)
) -> {Feature}Response:
    """Create new {feature}."""
    # Implementation

@router.put("/{id}", response_model={Feature}Response)
async def update_{feature}(
    id: str,
    request: {Feature}Request,
    current_user: dict = Depends(get_current_user)
) -> {Feature}Response:
    """Update {feature}."""
    # Implementation

@router.delete("/{id}", status_code=204)
async def delete_{feature}(
    id: str,
    current_user: dict = Depends(get_current_user)
) -> None:
    """Delete {feature}."""
    # Implementation
```

Also update `backend/server.py` to include the new router.

## Instructions

1. Read existing API files for patterns
2. Create complete endpoint file
3. Include all CRUD operations
4. Add proper validation and error handling
5. Show how to register router in server.py

Create endpoint for: {{feature_name}} with operations: {{operations}}
