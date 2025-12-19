#!/usr/bin/env python3
"""Check SQL Server Connection and Identify Local Server Path.

Helps identify the correct connection parameters for Polosys ERP database
with proper type hints and error handling.
"""

import io
import logging
import socket
import sys
from pathlib import Path

import pymssql

# Fix Windows console encoding for Unicode characters
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Database file path provided by user
DB_PATH = r"\\Server\d\Polosys ERP 7.0\DATA"
DB_NAME = "E_MART_KITCHEN_CARE"


def get_local_hostname() -> str:
    """Get the local machine hostname.

    Returns:
        The hostname of the local machine
    """
    return socket.gethostname()


def check_path_access(path: str) -> bool:
    """Check if the database path is accessible.

    Args:
        path: File system path to check

    Returns:
        True if accessible, False otherwise
    """
    path_obj = Path(path)
    if path_obj.exists():
        print(f"✅ Database path is accessible: {path}")
        # List database files
        mdf_files = list(path_obj.glob("*.mdf"))
        ldf_files = list(path_obj.glob("*.ldf"))

        print("\n📁 Database Files Found:")
        for f in mdf_files:
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"   • {f.name} ({size_mb:.2f} MB)")
        for f in ldf_files:
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"   • {f.name} ({size_mb:.2f} MB)")
        return True
    else:
        print(f"❌ Database path not accessible: {path}")
        print("   Please ensure the path is correct and you have network access.")
        return False


def test_connection(host, port, database, user=None, password=None):
    """Test SQL Server connection"""
    print("\n🔌 Testing connection to:")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Database: {database}")
    print(f"   User: {user or '(Windows Authentication)'}")

    try:
        if user and password:
            conn = pymssql.connect(
                server=host,
                port=port,
                database=database,
                user=user,
                password=password,
                timeout=5,
            )
        else:
            # Try Windows Authentication (if on Windows)
            conn = pymssql.connect(server=host, port=port, database=database, timeout=5)

        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION")
        version = cursor.fetchone()[0]
        cursor.execute("SELECT DB_NAME()")
        current_db = cursor.fetchone()[0]
        cursor.close()
        conn.close()

        print("\n✅ Connection successful!")
        print(f"   SQL Server Version: {version[:50]}...")
        print(f"   Connected to database: {current_db}")
        return True

    except Exception as e:
        print(f"\n❌ Connection failed: {str(e)}")
        return False


def suggest_connection_params():
    """Suggest connection parameters based on the path"""
    print("\n" + "=" * 80)
    print("💡 SUGGESTED CONNECTION PARAMETERS")
    print("=" * 80)

    server_name = DB_PATH.split("\\")[2] if "\\\\" in DB_PATH else "Server"

    print("\n📍 Database Location Analysis:")
    print(f"   Network Path: {DB_PATH}")
    print(f"   Server Name: {server_name}")
    print(f"   Database Name: {DB_NAME}")

    print("\n🔧 Try these connection settings:")
    print("\n   Option 1: Using Server Name")
    print("   ┌─────────────────────────────────────────────┐")
    print(f"   │ Host: {server_name:<30} │")
    print("   │ Port: 1433                                   │")
    print(f"   │ Database: {DB_NAME:<28} │")
    print("   │ Username: [your_sql_user]                    │")
    print("   │ Password: [your_password]                   │")
    print("   └─────────────────────────────────────────────┘")

    print("\n   Option 2: Using Local Host (if SQL Server is on same machine)")
    print("   ┌─────────────────────────────────────────────┐")
    print("   │ Host: localhost                             │")
    print("   │ Port: 1433                                   │")
    print(f"   │ Database: {DB_NAME:<28} │")
    print("   │ Username: [your_sql_user]                   │")
    print("   │ Password: [your_password]                  │")
    print("   └─────────────────────────────────────────────┘")

    print("\n   Option 3: Using Instance Name (if named instance)")
    print("   ┌─────────────────────────────────────────────┐")
    print(f"   │ Host: {server_name}\\SQLEXPRESS              │")
    print("   │ Port: [instance_port or 1433]                │")
    print(f"   │ Database: {DB_NAME:<28} │")
    print("   │ Username: [your_sql_user]                    │")
    print("   │ Password: [your_password]                   │")
    print("   └─────────────────────────────────────────────┘")

    print("\n📝 Notes:")
    print(f"   • The database files are at: {DB_PATH}")
    print("   • SQL Server must have this database ATTACHED")
    print("   • You need to connect to the SQL Server INSTANCE, not the file directly")
    print("   • Contact your IT admin for exact connection details")


def find_sql_server_instances():
    """Try to find SQL Server instances on the network"""
    print("\n" + "=" * 80)
    print("🔍 SEARCHING FOR SQL SERVER INSTANCES")
    print("=" * 80)

    server_name = DB_PATH.split("\\")[2] if "\\\\" in DB_PATH else "Server"

    # Common SQL Server instances to try
    instances_to_try = [
        (server_name, 1433),  # Default instance on port 1433
        (server_name, None),  # Default instance
        (f"{server_name}\\SQLEXPRESS", 1433),
        (f"{server_name}\\MSSQLSERVER", 1433),
        ("localhost", 1433),
        ("127.0.0.1", 1433),
    ]

    print(f"\nAttempting to detect SQL Server on '{server_name}'...")
    print("(This may take a moment)\n")

    found_instances = []
    for host, port in instances_to_try:
        host_display = host
        if port:
            host_display = f"{host}:{port}"

        print(f"Testing {host_display}...", end=" ")
        try:
            if port:
                conn = pymssql.connect(
                    server=host, port=port, database="master", timeout=2
                )
            else:
                conn = pymssql.connect(server=host, database="master", timeout=2)
            conn.close()
            print("✅ Found!")
            found_instances.append((host, port))
        except Exception:
            print("❌ Not found")

    if found_instances:
        print(f"\n✅ Found {len(found_instances)} SQL Server instance(s):")
        for host, port in found_instances:
            print(f"   • {host}:{port or 'default port'}")
    else:
        print("\n⚠️  No SQL Server instances found automatically.")
        print("   You may need to provide connection details manually.")


def main():
    print("=" * 80)
    print("🔍 SQL SERVER CONNECTION CHECKER")
    print("=" * 80)
    print(f"\nDatabase Path: {DB_PATH}")
    print(f"Database Name: {DB_NAME}")

    # Check path access
    print("\n" + "-" * 80)
    path_accessible = check_path_access(DB_PATH)

    if path_accessible:
        # Suggest connection parameters
        suggest_connection_params()

        # Try to find SQL Server instances
        print("\n")
        find_sql_server_instances()

        # Interactive connection test
        print("\n" + "=" * 80)
        print("🧪 INTERACTIVE CONNECTION TEST")
        print("=" * 80)
        print("\nWould you like to test a connection? (Enter connection details)")

        try:
            host = input("\nEnter SQL Server Host/IP [Enter to skip]: ").strip()
            if host:
                port = input("Enter Port [1433]: ").strip() or "1433"
                database = (
                    input(f"Enter Database Name [{DB_NAME}]: ").strip() or DB_NAME
                )
                user = (
                    input("Enter Username [Enter for Windows Auth]: ").strip() or None
                )
                password = None
                if user:
                    password = input("Enter Password: ").strip() or None

                try:
                    port = int(port)
                except (ValueError, TypeError):
                    port = 1433

                test_connection(host, port, database, user, password)
        except (EOFError, KeyboardInterrupt):
            # Running in non-interactive mode
            print("\n⚠️  Non-interactive mode detected.")
            print("   To test connection, run this script interactively or use:")
            print(
                "   python -c \"from backend.sql_server_connector import sql_connector; sql_connector.connect('Server', 1433, 'E_MART_KITCHEN_CARE', 'user', 'pass')\""
            )
    else:
        print("\n⚠️  Cannot proceed without access to database path.")
        print("   Please check:")
        print("   1. Network connectivity to the server")
        print("   2. File permissions")
        print("   3. Path is correct")

    print("\n" + "=" * 80)
    print("✅ CHECK COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
