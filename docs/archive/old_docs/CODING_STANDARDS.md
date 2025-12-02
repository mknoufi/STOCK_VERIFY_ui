# 📋 Coding Standards & Best Practices

**Version:** 1.0
**Last Updated:** 2025-11-06
**Applies To:** Stock Verification ERPNext Custom App

---

## 🎯 Overview

This document defines coding standards, conventions, and best practices for the Stock Verification application. All code should adhere to these standards for consistency, maintainability, and quality.

---

## 📁 Project Structure

### Backend (`backend/`)
```
backend/
├── api/              # API endpoints (FastAPI routers)
├── auth/             # Authentication & authorization
├── services/         # Business logic services
├── utils/            # Utility functions
├── db/               # Database models & migrations
├── config.py         # Configuration management
└── server.py         # FastAPI application entry point
```

### Frontend (`frontend/`)
```
frontend/
├── app/              # Expo Router pages
├── components/       # Reusable React components
├── services/         # API services & utilities
├── styles/           # Global styles & design tokens
├── utils/            # Utility functions
└── hooks/            # Custom React hooks
```

---

## 🐍 Python Standards

### Code Formatting

**Tools:**
- **Black** - Code formatter (line length: 100)
- **isort** - Import sorter (profile: black)
- **flake8** - Linter (with specific rules)

**Configuration:**
- See `pyproject.toml` for Black and isort settings
- See `.flake8` for linting rules

### Import Organization

**Order:**
1. Standard library imports
2. Third-party imports
3. Local application imports

**Example:**
```python
# Standard library
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Third-party
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import motor.motor_asyncio

# Local application
from backend.auth import get_current_user
from backend.services.item_service import ItemService
from backend.utils.result import Result, Ok, Fail
```

**Rules:**
- ✅ Use absolute imports: `from backend.api import router`
- ❌ Avoid relative imports: `from ..api import router`
- ✅ Group imports with blank lines between groups
- ✅ Sort imports alphabetically within groups

### Naming Conventions

**Variables & Functions:**
- Use `snake_case` for variables and functions
- Use descriptive names: `get_item_by_barcode()` not `get_item()`

**Classes:**
- Use `PascalCase` for classes
- Use descriptive names: `ItemService` not `Service`

**Constants:**
- Use `UPPER_SNAKE_CASE` for constants
- Example: `MAX_RETRY_ATTEMPTS = 3`

**Private:**
- Prefix with single underscore: `_internal_method()`
- Prefix with double underscore for name mangling: `__private_attr`

### Type Hints

**Required:**
- All function parameters must have type hints
- All return types must be specified
- Use `Optional[T]` for nullable types
- Use `Dict[str, Any]` for flexible dictionaries

**Example:**
```python
from typing import Dict, List, Optional, Any

async def get_item(
    barcode: str,
    include_metadata: bool = False,
    current_user: Optional[dict] = None
) -> Dict[str, Any]:
    """Get item by barcode."""
    ...
```

### Error Handling

**Pattern:**
```python
from backend.utils.result import Result, Ok, Fail

async def process_item(item_id: str) -> Result[Dict[str, Any], Exception]:
    """Process item with error handling."""
    try:
        item = await db.items.find_one({"_id": item_id})
        if not item:
            return Fail(ValueError(f"Item {item_id} not found"))
        return Ok(item)
    except Exception as e:
        logger.error(f"Error processing item: {e}")
        return Fail(e)
```

**HTTP Exceptions:**
```python
from fastapi import HTTPException, status

if not item:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Item not found"
    )
```

### API Response Format

**Standard Response:**
```python
{
    "success": True,
    "data": {
        # Response data
    },
    "message": "Operation successful",
    "timestamp": "2025-11-06T12:00:00Z"
}
```

**Error Response:**
```python
{
    "success": False,
    "error": {
        "code": "ITEM_NOT_FOUND",
        "message": "Item not found",
        "details": {}
    },
    "timestamp": "2025-11-06T12:00:00Z"
}
```

### Logging

**Format:**
```python
import logging

logger = logging.getLogger(__name__)

# Use appropriate levels
logger.debug("Detailed debugging information")
logger.info("General information")
logger.warning("Warning message")
logger.error("Error occurred", exc_info=True)
logger.critical("Critical error")
```

**Structured Logging:**
```python
logger.info(
    "Item processed",
    extra={
        "item_id": item_id,
        "user": current_user["username"],
        "duration_ms": duration
    }
)
```

### Docstrings

**Format:**
```python
def get_item_by_barcode(
    barcode: str,
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get item by barcode.

    Args:
        barcode: Item barcode to search for
        current_user: Authenticated user (from dependency)

    Returns:
        Dictionary containing item data

    Raises:
        HTTPException: If item not found or unauthorized

    Example:
        >>> response = await get_item_by_barcode("1234567890")
        >>> print(response["item"]["name"])
    """
    ...
```

---

## ⚛️ TypeScript/JavaScript Standards

### Code Formatting

**Tools:**
- **Prettier** - Code formatter
- **ESLint** - Linter (with Expo config)

**Configuration:**
- See `.prettierrc` for Prettier settings
- See `.eslintrc.js` for ESLint rules

### Import Organization

**Order:**
1. React & React Native imports
2. Expo imports
3. Third-party imports
4. Local imports (components, services, utils)
5. Type imports

**Example:**
```typescript
// React & React Native
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Expo
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Third-party
import axios from 'axios';
import { z } from 'zod';

// Local
import { api } from '../services/api';
import { colors, spacing } from '../styles/globalStyles';
import Button from '../components/Button';

// Types
import type { Item } from '../types/item';
```

### Naming Conventions

**Variables & Functions:**
- Use `camelCase` for variables and functions
- Use descriptive names: `getItemByBarcode()` not `getItem()`

**Components:**
- Use `PascalCase` for components
- Use descriptive names: `ItemCard` not `Card`

**Constants:**
- Use `UPPER_SNAKE_CASE` for constants
- Example: `MAX_RETRY_ATTEMPTS = 3`

**Types & Interfaces:**
- Use `PascalCase` for types and interfaces
- Prefix interfaces with `I` if needed: `IItemResponse`

### TypeScript Types

**Required:**
- All function parameters must have types
- All return types must be specified
- Use `interface` for object shapes
- Use `type` for unions, intersections, and aliases

**Example:**
```typescript
interface Item {
  id: string;
  name: string;
  barcode: string;
  price?: number;
}

async function getItemByBarcode(
  barcode: string,
  includeMetadata: boolean = false
): Promise<Item | null> {
  // ...
}
```

### Error Handling

**Pattern:**
```typescript
try {
  const item = await api.getItemByBarcode(barcode);
  return item;
} catch (error) {
  if (error instanceof Error) {
    console.error('Error fetching item:', error.message);
    throw error;
  }
  throw new Error('Unknown error occurred');
}
```

### API Service Pattern

**Standard:**
```typescript
// services/api.ts
export const api = {
  async getItemByBarcode(barcode: string): Promise<Item> {
    try {
      const response = await axios.get(`/api/items/barcode/${barcode}`);
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error?.message || 'Request failed');
      }
      throw error;
    }
  }
};
```

### Component Structure

**Standard:**
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Item } from '../types/item';

interface ItemCardProps {
  item: Item;
  onPress?: (item: Item) => void;
}

export default function ItemCard({ item, onPress }: ItemCardProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Component logic
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{item.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

---

## 🔧 Configuration Files

### Required Files

1. **`.editorconfig`** - Editor configuration
2. **`pyproject.toml`** - Python tooling configuration
3. **`.prettierrc`** - Prettier configuration
4. **`.eslintrc.js`** - ESLint configuration
5. **`.flake8`** - Flake8 configuration

---

## ✅ Code Quality Checklist

### Before Committing

- [ ] Code formatted with Black/Prettier
- [ ] Imports sorted with isort
- [ ] No linting errors (flake8/ESLint)
- [ ] Type hints/types added
- [ ] Docstrings added for public functions
- [ ] Error handling implemented
- [ ] Logging added where appropriate
- [ ] Tests pass (if applicable)

### Code Review

- [ ] Follows naming conventions
- [ ] Uses standard API response format
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate
- [ ] No hardcoded values
- [ ] Security best practices followed
- [ ] Performance considerations addressed

---

## 📚 Additional Resources

- [PEP 8](https://www.python.org/dev/peps/pep-0008/) - Python style guide
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [React Native Style Guide](https://reactnative.dev/docs/style)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

## 🔄 Updates

This document should be reviewed and updated quarterly or when major changes are made to the codebase.

**Last Review:** 2025-11-06
**Next Review:** 2026-02-06
