"""
Test to verify SQL Server is read-only (no write operations)
"""

import pytest
import re
from pathlib import Path


def test_sql_server_connector_readonly():
    """Verify SQL Server connector only has read operations"""
    sql_connector_file = Path(__file__).parent.parent / "sql_server_connector.py"

    if not sql_connector_file.exists():
        pytest.skip("sql_server_connector.py not found")

    content = sql_connector_file.read_text(encoding="utf-8")

    # Check for write operations
    write_patterns = [
        r"\.execute\(.*INSERT",
        r"\.execute\(.*UPDATE",
        r"\.execute\(.*DELETE",
        r"\.execute\(.*CREATE\s+TABLE",
        r"\.execute\(.*DROP",
        r"\.execute\(.*ALTER",
        r"\.commit\(",
        r"\.cursor\(\)\.execute\(.*INSERT",
        r"\.cursor\(\)\.execute\(.*UPDATE",
        r"\.cursor\(\)\.execute\(.*DELETE",
    ]

    found_writes = []
    for pattern in write_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE | re.MULTILINE)
        if matches:
            found_writes.extend(matches)

    # Should only have SELECT/READ operations
    assert len(found_writes) == 0, f"Found write operations in SQL Server connector: {found_writes}"


def test_sql_server_methods_readonly():
    """Verify SQL Server connector methods are read-only"""
    sql_connector_file = Path(__file__).parent.parent / "sql_server_connector.py"

    if not sql_connector_file.exists():
        pytest.skip("sql_server_connector.py not found")

    content = sql_connector_file.read_text(encoding="utf-8")

    # Check method names
    write_method_patterns = [
        r"def\s+insert",
        r"def\s+update",
        r"def\s+delete",
        r"def\s+create",
        r"def\s+save",
        r"def\s+modify",
        r"def\s+remove",
    ]

    found_write_methods = []
    for pattern in write_method_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            found_write_methods.extend(matches)

    # Should only have read/get methods
    assert len(found_write_methods) == 0, (
        f"Found write methods in SQL Server connector: {found_write_methods}"
    )


def test_all_sql_queries_select_only():
    """Verify all SQL queries are SELECT only"""
    sql_connector_file = Path(__file__).parent.parent / "sql_server_connector.py"

    if not sql_connector_file.exists():
        pytest.skip("sql_server_connector.py not found")

    content = sql_connector_file.read_text(encoding="utf-8")

    # Find all execute statements
    execute_pattern = r'\.execute\(["\']([^"\']+)["\']'
    matches = re.findall(execute_pattern, content, re.IGNORECASE | re.MULTILINE)

    write_queries = []
    for query in matches:
        query_upper = query.upper().strip()
        if not query_upper.startswith("SELECT"):
            if any(
                keyword in query_upper
                for keyword in ["INSERT", "UPDATE", "DELETE", "CREATE", "DROP", "ALTER"]
            ):
                write_queries.append(query[:100])  # First 100 chars

    assert len(write_queries) == 0, f"Found non-SELECT queries: {write_queries}"
