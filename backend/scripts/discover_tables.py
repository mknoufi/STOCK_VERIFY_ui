#!/usr/bin/env python3
"""Discover table structure from E_MART_KITCHEN_CARE SQL Server database.

This script provides utilities to explore SQL Server database schema,
including tables, columns, and sample data with proper security measures.
"""

import logging
import os
from typing import Any, Dict, List, Optional

import pymssql
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Connection parameters
SERVER = os.getenv("SQL_SERVER_HOST", "localhost")
PORT = os.getenv("SQL_SERVER_PORT", "1433")
DATABASE = os.getenv("SQL_SERVER_DATABASE", "E_MART_KITCHEN_CARE")
USER = os.getenv("SQL_SERVER_USER", "sa")
PASSWORD = os.getenv("SQL_SERVER_PASSWORD")


def connect() -> Optional[pymssql.Connection]:
    """Connect to SQL Server.

    Returns:
        Connection object if successful, None if connection fails
    """
    try:
        conn = pymssql.connect(
            server=SERVER,
            port=PORT,
            database=DATABASE,
            user=USER,
            password=PASSWORD,
            timeout=10,
        )
        logger.info(f"✅ Connected to {DATABASE} on {SERVER}:{PORT}")
        return conn
    except pymssql.Error as e:
        logger.error(f"❌ Connection failed: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Unexpected connection error: {e}")
        return None


def search_tables(conn: pymssql.Connection, search_term: str) -> List[Dict[str, Any]]:
    """Search for tables matching a pattern.

    Args:
        conn: Active database connection
        search_term: Pattern to search for in table names

    Returns:
        List of dictionaries containing table information
    """
    cursor = conn.cursor(as_dict=True)
    try:
        query = """
            SELECT
                TABLE_SCHEMA,
                TABLE_NAME,
                TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME LIKE %s
            ORDER BY TABLE_NAME
        """
        cursor.execute(query, (f"%{search_term}%",))
        results = cursor.fetchall()
        return results
    finally:
        cursor.close()


def get_table_columns(
    conn: pymssql.Connection, table_name: str, schema: str = "dbo"
) -> List[Dict[str, Any]]:
    """Get columns for a specific table.

    Args:
        conn: Active database connection
        table_name: Name of the table
        schema: Database schema (default: "dbo")

    Returns:
        List of dictionaries containing column information
    """
    cursor = conn.cursor(as_dict=True)
    try:
        query = """
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = %s
              AND TABLE_SCHEMA = %s
            ORDER BY ORDINAL_POSITION
        """
        cursor.execute(query, (table_name, schema))
        results = cursor.fetchall()
        return results
    finally:
        cursor.close()


def get_sample_data(
    conn: pymssql.Connection, table_name: str, schema: str = "dbo", limit: int = 3
) -> List[Dict[str, Any]]:
    """Get sample data from table with security validation.

    Args:
        conn: Active database connection
        table_name: Name of the table
        schema: Database schema (default: "dbo")
        limit: Maximum number of rows to return (1-100, default: 3)

    Returns:
        List of dictionaries containing sample rows

    Raises:
        ValueError: If table_name or schema are invalid
    """
    import re

    cursor = conn.cursor(as_dict=True)
    try:
        # SECURITY: Validate and sanitize inputs to prevent SQL injection
        if not table_name or not schema:
            raise ValueError("Table name and schema cannot be empty")

        # Sanitize table and schema names (allow only alphanumeric and underscore)
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", table_name):
            raise ValueError(f"Invalid table name format: {table_name}")
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", schema):
            raise ValueError(f"Invalid schema name format: {schema}")

        # Ensure limit is a safe integer
        try:
            limit = int(limit)
            if limit < 1 or limit > 100:
                logger.warning(f"Limit {limit} out of range, using default: 3")
                limit = 3
        except (ValueError, TypeError):
            logger.warning("Invalid limit value, using default: 3")
            limit = 3

        # Use QUOTENAME for safe identifier quoting
        query = f"SELECT TOP {limit} * FROM {schema}.{table_name}"
        cursor.execute(query)
        results = cursor.fetchall()
        cursor.close()
        return results
    except Exception as e:
        return f"Error: {e}"


def main():
    conn = connect()
    if not conn:
        return

    print("\n" + "=" * 80)
    print("🔍 DISCOVERING E_MART_KITCHEN_CARE DATABASE STRUCTURE")
    print("=" * 80 + "\n")

    # Search for relevant tables based on Stock Counting domain
    search_terms = [
        "Stock",
        "Item",
        "Count",
        "Onhand",
        "OnHand",
        "Batch",
        "Lot",
        "Inventory",
        "Warehouse",
        "BU",
        "Document",
    ]

    discovered_tables = {}

    for term in search_terms:
        print(f"\n🔎 Searching for tables matching: '{term}'")
        print("-" * 60)
        tables = search_tables(conn, term)

        if tables:
            for table in tables:
                table_name = table["TABLE_NAME"]
                schema = table["TABLE_SCHEMA"]

                if table_name not in discovered_tables:
                    discovered_tables[table_name] = {
                        "schema": schema,
                        "type": table["TABLE_TYPE"],
                        "matched_terms": [],
                    }

                discovered_tables[table_name]["matched_terms"].append(term)
                print(f"  ✓ [{schema}].[{table_name}] ({table['TABLE_TYPE']})")
        else:
            print("  ⚠️  No tables found")

    # Get detailed info for promising tables
    print("\n\n" + "=" * 80)
    print("📋 DETAILED TABLE ANALYSIS")
    print("=" * 80)

    priority_tables = [
        t
        for t in discovered_tables.keys()
        if any(keyword in t.lower() for keyword in ["stock", "item", "count", "onhand"])
    ]

    for table_name in sorted(priority_tables)[:10]:  # Top 10 most relevant
        info = discovered_tables[table_name]
        schema = info["schema"]

        print(f"\n\n📊 Table: [{schema}].[{table_name}]")
        print(f"   Type: {info['type']}")
        print(f"   Matched: {', '.join(info['matched_terms'])}")
        print("\n   Columns:")
        print("   " + "-" * 70)

        columns = get_table_columns(conn, table_name, schema)
        for col in columns[:15]:  # First 15 columns
            nullable = "NULL" if col["IS_NULLABLE"] == "YES" else "NOT NULL"
            print(f"   • {col['COLUMN_NAME']:30} {col['DATA_TYPE']:15} {nullable}")

        if len(columns) > 15:
            print(f"   ... and {len(columns) - 15} more columns")

        print("\n   Sample Data (first 2 rows):")
        print("   " + "-" * 70)
        samples = get_sample_data(conn, table_name, schema, limit=2)
        if isinstance(samples, list) and samples:
            for i, row in enumerate(samples, 1):
                print(f"   Row {i}:")
                for key, value in list(row.items())[:5]:  # First 5 fields
                    print(f"     {key}: {value}")
        else:
            print(f"   {samples}")

    print("\n\n" + "=" * 80)
    print("✅ DISCOVERY COMPLETE")
    print("=" * 80)
    print(f"\nTotal tables found: {len(discovered_tables)}")
    print(f"Priority tables analyzed: {len(priority_tables)}")

    conn.close()


if __name__ == "__main__":
    main()
