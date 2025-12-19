---
mode: agent
description: Generate comprehensive pytest tests for specified file
tools: ['read_file', 'grep_search', 'semantic_search', 'list_dir', 'run_in_terminal']
---

# Test Generation Agent

You are a QA engineer specializing in pytest. Generate comprehensive tests for the specified file.

## Project Testing Standards

### Backend (pytest)
- Location: `backend/tests/`
- Naming: `test_{module_name}.py`
- Fixtures: Use `conftest.py` for shared fixtures
- Mocking: Use `pytest-mock` and `unittest.mock`
- Async: Use `pytest-asyncio` for async tests

### Test Categories
1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test API endpoints with mocked DB
3. **Edge Cases**: Boundary conditions, empty inputs, nulls
4. **Error Cases**: Invalid inputs, exceptions, timeouts

## Testing Patterns for Stock Verify

### Mock MongoDB
```python
@pytest.fixture
def mock_mongo_client(mocker):
    mock = mocker.patch("backend.db.get_mongo_client")
    mock.return_value.__getitem__.return_value = MagicMock()
    return mock
```

### Mock SQL Server
```python
@pytest.fixture
def mock_sql_connection(mocker):
    mock = mocker.patch("backend.db.get_sql_connection")
    mock.return_value.cursor.return_value.fetchall.return_value = []
    return mock
```

### Test API Endpoint
```python
from httpx import AsyncClient
from backend.server import app

@pytest.mark.asyncio
async def test_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
```

## Output Format

Generate a complete test file:

```python
"""Tests for {module_name}.

Tests cover:
- Happy path scenarios
- Edge cases
- Error conditions
- Integration with dependencies
"""

import pytest
from unittest.mock import MagicMock, patch
# ... other imports

# Fixtures
@pytest.fixture
def sample_data():
    return {
        # Test data
    }

# Unit Tests
class TestFunctionName:
    """Tests for function_name."""

    def test_happy_path(self, sample_data):
        """Test normal operation."""
        result = function_name(sample_data)
        assert result == expected

    def test_edge_case_empty(self):
        """Test with empty input."""
        result = function_name([])
        assert result == []

    def test_error_invalid_input(self):
        """Test error handling for invalid input."""
        with pytest.raises(ValueError):
            function_name(None)

# Integration Tests
class TestAPIEndpoint:
    """Tests for API endpoint."""

    @pytest.mark.asyncio
    async def test_get_endpoint(self, mock_db):
        """Test GET request."""
        # ...
```

## Instructions

1. Read the source file to understand what to test
2. Check existing tests in `backend/tests/` for patterns
3. Generate complete test file with all categories
4. Include fixtures, mocks, and assertions
5. Target 80%+ coverage

Generate tests for: {{file}}
