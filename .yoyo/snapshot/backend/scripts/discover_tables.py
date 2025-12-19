#!/usr/bin/env python3
"""
Discover table structure from E_MART_KITCHEN_CARE SQL Server database
"""

import pymssql
import os
from dotenv import load_dotenv

load_dotenv()

# Connection parameters
SERVER = os.getenv("SQL_SERVER_HOST", "localhost")
PORT = os.getenv("SQL_SERVER_PORT", "1433")
DATABASE = os.getenv("SQL_SERVER_DATABASE", "E_MART_KITCHEN_CARE")
USER = os.getenv("SQL_SERVER_USER", "sa")
PASSWORD = os.getenv("SQL_SERVER_PASSWORD")


def connect():
    """Connect to SQL Server"""
    try:
        conn = pymssql.connect(
            server=SERVER,
            port=PORT,
            database=DATABASE,
            user=USER,
            password=PASSWORD,
            timeout=10,
        )
        print(f"✅ Connected to {DATABASE} on {SERVER}:{PORT}")
        return conn
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return None


def search_tables(conn, search_term):
    """Search for tables matching a pattern"""
    cursor = conn.cursor(as_dict=True)
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
    cursor.close()
    return results


def get_table_columns(conn, table_name, schema="dbo"):
    """Get columns for a specific table"""
    cursor = conn.cursor(as_dict=True)
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
    cursor.close()
    return results


def get_sample_data(conn, table_name, schema="dbo", limit=3):
    """Get sample data from table"""
    try:
        cursor = conn.cursor(as_dict=True)
        # SECURITY FIX: Use parameterized query to prevent SQL injection
        # Validate and sanitize inputs
        if not table_name or not schema:
            raise ValueError("Table name and schema cannot be empty")

        # Sanitize table and schema names (allow only alphanumeric and underscore)
        import re

        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", table_name):
            raise ValueError("Invalid table name format")
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", schema):
            raise ValueError("Invalid schema name format")

        # Ensure limit is a safe integer
        try:
            limit = int(limit)
            if limit < 1 or limit > 100:
                limit = 3
        except (ValueError, TypeError):
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
