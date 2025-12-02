"""Check database connections - MongoDB and SQL Server"""

import asyncio
import os
import sys
import io
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Set UTF-8 encoding for Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

load_dotenv(Path(__file__).parent / ".env")


async def check_mongodb():
    """Check MongoDB connection"""
    print("=" * 80)
    print("MONGODB CONNECTION CHECK")
    print("=" * 80)

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "stock_count")

    print(f"\nMongoDB URL: {mongo_url}")
    print(f"Database Name: {db_name}")

    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)

        # Check connection
        await client.admin.command("ping")
        print("✓ MongoDB: Connected successfully")

        db = client[db_name]

        # Check collections
        collections = await db.list_collection_names()
        print(f"\nCollections found: {len(collections)}")
        for col in collections:
            count = await db[col].count_documents({})
            print(f"  - {col}: {count} documents")

        # Check users
        users_count = await db.users.count_documents({})
        print(f"\nUsers in database: {users_count}")
        if users_count > 0:
            users = await db.users.find({}).to_list(5)
            for u in users:
                print(f"  - {u.get('username')} ({u.get('role')})")

        client.close()
        return True

    except Exception as e:
        print("✗ MongoDB: Connection failed")
        print(f"  Error: {str(e)}")
        print("\nTroubleshooting:")
        print("  1. Check MongoDB service is running")
        print("  2. Verify MONGO_URL in .env file")
        print("  3. Check network connectivity")
        return False


async def check_sql_server():
    """Check SQL Server connection"""
    print("\n" + "=" * 80)
    print("SQL SERVER CONNECTION CHECK")
    print("=" * 80)

    host = os.environ.get("SQL_SERVER_HOST", "localhost")
    port = os.environ.get("SQL_SERVER_PORT", "1433")
    database = os.environ.get("SQL_SERVER_DATABASE", "E_MART_KITCHEN_CARE")
    user = os.environ.get("SQL_SERVER_USER", "")
    password = os.environ.get("SQL_SERVER_PASSWORD", "")

    print(f"\nHost: {host}")
    print(f"Port: {port}")
    print(f"Database: {database}")
    print(f"User: {user if user else '(Windows Authentication)'}")

    try:
        import pyodbc

        # Build connection string
        if user and password:
            conn_str = (
                f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                f"SERVER={host},{port};"
                f"DATABASE={database};"
                f"UID={user};"
                f"PWD={password}"
            )
        else:
            conn_str = (
                f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                f"SERVER={host},{port};"
                f"DATABASE={database};"
                f"Trusted_Connection=yes;"
            )

        print("\nAttempting connection...")
        conn = pyodbc.connect(conn_str, timeout=5)
        cursor = conn.cursor()

        # Test query
        cursor.execute("SELECT @@VERSION")
        version = cursor.fetchone()[0]
        print("✓ SQL Server: Connected successfully")
        print(f"  Version: {version.split(chr(10))[0] if version else 'Unknown'}")

        # Check if ERP tables exist
        tables_query = """
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME IN ('Products', 'ProductBase', 'ProductGroups', 'ProductBarcodes')
        """
        cursor.execute(tables_query)
        tables = cursor.fetchall()

        print(f"\nERP Tables found: {len(tables)}")
        if tables:
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM [{table[0]}]")
                count = cursor.fetchone()[0]
                print(f"  - {table[0]}: {count} rows")
        else:
            print("  ⚠ No ERP tables found (Products, ProductBase, ProductGroups, ProductBarcodes)")

        cursor.close()
        conn.close()
        return True

    except ImportError:
        print("✗ SQL Server: pyodbc not installed")
        print("  Install with: pip install pyodbc")
        return False
    except Exception as e:
        print("✗ SQL Server: Connection failed")
        print(f"  Error: {str(e)}")
        print("\nTroubleshooting:")
        print("  1. Check SQL Server is running")
        print("  2. Verify SQL_SERVER_HOST, SQL_SERVER_PORT, SQL_SERVER_DATABASE in .env")
        print("  3. Check SQL Server Authentication (SQL_SERVER_USER and SQL_SERVER_PASSWORD)")
        print("  4. Verify ODBC Driver 17 for SQL Server is installed")
        print("  5. Check network connectivity and firewall")
        return False


async def main():
    """Main check function"""
    print("\n" + "=" * 80)
    print("DATABASE CONNECTION CHECK")
    print("=" * 80)

    mongodb_ok = await check_mongodb()
    sql_server_ok = await check_sql_server()

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"MongoDB: {'✓ Connected' if mongodb_ok else '✗ Failed'}")
    print(f"SQL Server: {'✓ Connected' if sql_server_ok else '✗ Failed'}")

    if mongodb_ok and sql_server_ok:
        print("\n✓ All databases connected successfully!")
        return 0
    else:
        print("\n⚠ Some databases failed to connect. Check errors above.")
        return 1


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nCheck cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nError: {str(e)}")
        sys.exit(1)
