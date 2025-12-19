# ruff: noqa: E402
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.config import settings  # noqa: E402
from backend.sql_server_connector import SQLServerConnector  # noqa: E402

print("=" * 60)
print("🔍 SQL SERVER CONFIGURATION DEBUG")
print("=" * 60)
print(f"HOST: {settings.SQL_SERVER_HOST}")
print(f"PORT: {settings.SQL_SERVER_PORT}")
print(f"DATABASE: {settings.SQL_SERVER_DATABASE}")
print(f"USER: {settings.SQL_SERVER_USER}")
print(f"PASSWORD: {'******' if settings.SQL_SERVER_PASSWORD else 'None'}")
print("=" * 60)

if not settings.SQL_SERVER_HOST:
    print("❌ SQL_SERVER_HOST is not set. Connection will fail.")
    sys.exit(1)

print("\n🔌 Attempting connection...")
connector = SQLServerConnector()
try:
    connector.connect(
        host=settings.SQL_SERVER_HOST,
        port=settings.SQL_SERVER_PORT,
        database=settings.SQL_SERVER_DATABASE,
        user=settings.SQL_SERVER_USER,
        password=settings.SQL_SERVER_PASSWORD,
    )
    print("✅ Connection SUCCESSFUL!")

    # Try a simple query
    cursor = connector.connection.cursor()
    cursor.execute("SELECT @@VERSION")
    row = cursor.fetchone()
    print(f"   Version: {row[0]}")

    cursor.close()
    connector.disconnect()
except Exception as e:
    print(f"❌ Connection FAILED: {e}")
