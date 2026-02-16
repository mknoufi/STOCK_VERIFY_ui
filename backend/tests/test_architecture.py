"""
Test architecture - Verify SQL Server is read-only and MongoDB handles all writes
"""

import re
from pathlib import Path

import pytest


def test_mongodb_handles_all_writes():
    """Verify MongoDB is used for all write operations"""
    server_file = Path(__file__).parent.parent / "server.py"

    if not server_file.exists():
        pytest.skip("server.py not found")

    content = server_file.read_text(encoding="utf-8")

    # Check that write operations use MongoDB (db.*)
    mongo_write_patterns = [
        r"db\.\w+\.insert_one\(",
        r"db\.\w+\.insert_many\(",
        r"db\.\w+\.update_one\(",
        r"db\.\w+\.update_many\(",
        r"db\.\w+\.replace_one\(",
        r"db\.\w+\.delete_one\(",
        r"db\.\w+\.delete_many\(",
    ]

    found_mongo_writes = []
    for pattern in mongo_write_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            found_mongo_writes.extend(matches)

    # Should have MongoDB write operations
    assert len(found_mongo_writes) > 0, (
        "No MongoDB write operations found - architecture issue!"
    )


def test_no_sql_server_writes_in_server():
    """Verify server.py doesn't write to SQL Server"""
    server_file = Path(__file__).parent.parent / "server.py"

    if not server_file.exists():
        pytest.skip("server.py not found")

    content = server_file.read_text(encoding="utf-8")

    # Check for SQL Server write patterns
    sql_write_patterns = [
        r"sql_connector\.\w+\(.*INSERT",
        r"sql_connector\.\w+\(.*UPDATE",
        r"sql_connector\.\w+\(.*DELETE",
        r"sql_connector\.execute\(.*INSERT",
        r"sql_connector\.execute\(.*UPDATE",
        r"sql_connector\.execute\(.*DELETE",
    ]

    found_sql_writes = []
    for pattern in sql_write_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE | re.MULTILINE)
        if matches:
            found_sql_writes.extend(matches)

    assert len(found_sql_writes) == 0, (
        f"Found SQL Server write operations in server.py: {found_sql_writes}"
    )


def test_erp_sync_reads_from_sql_writes_to_mongo():
    """Verify ERP sync service reads from SQL and writes to MongoDB"""
    sync_file = Path(__file__).parent.parent / "services" / "erp_sync_service.py"

    if not sync_file.exists():
        pytest.skip("erp_sync_service.py not found")

    content = sync_file.read_text(encoding="utf-8")

    # Should read from SQL Server
    sql_read_patterns = [
        r"self\.sql_connector\.get_",
        r"self\.sql_connector\.fetch_",
        r"self\.sql_connector\.query",
    ]

    has_sql_reads = any(
        re.search(pattern, content, re.IGNORECASE) for pattern in sql_read_patterns
    )

    # Should write to MongoDB
    mongo_write_patterns = [
        r"self\.mongo_db\.\w+\.insert",
        r"self\.mongo_db\.\w+\.update",
        r"self\.mongo_db\.\w+\.replace",
    ]

    has_mongo_writes = any(
        re.search(pattern, content, re.IGNORECASE) for pattern in mongo_write_patterns
    )

    assert has_sql_reads, "ERP sync service should read from SQL Server"
    assert has_mongo_writes, "ERP sync service should write to MongoDB"
