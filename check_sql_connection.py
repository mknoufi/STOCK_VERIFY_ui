import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from backend.sql_server_connector import sql_connector
from backend.config import settings

def check_connection():
    print("--- SQL Server Connection Diagnostic ---")
    
    # 1. Check Configuration
    host = settings.SQL_SERVER_HOST
    port = settings.SQL_SERVER_PORT
    db = settings.SQL_SERVER_DATABASE
    user = settings.SQL_SERVER_USER
    
    print(f"Configuration:")
    print(f"  Host: {host}")
    print(f"  Port: {port}")
    print(f"  Database: {db}")
    print(f"  User: {user}")
    
    if not host:
        print("\n❌ SQL_SERVER_HOST is not set in configuration.")
        print("   If running in Dev mode, note that scripts/start_backend.sh disables it by default.")
        return

    # 2. Ping Test
    print(f"\nTesting network connectivity to {host}...")
    response = os.system(f"ping -c 1 -W 1000 {host} > /dev/null 2>&1")
    if response == 0:
        print("✅ Ping successful.")
    else:
        print("❌ Ping failed. Host is unreachable.")
        print("   Possible causes: Host down, network unreachable (VPN?), firewall.")

    # 3. Connection Test
    print(f"\nTesting SQL Server connection (Port {port})...")
    try:
        success = sql_connector.connect(host, port, db, user, settings.SQL_SERVER_PASSWORD)
        if success:
            print("✅ Connection successful!")
            sql_connector.disconnect()
        else:
            print("❌ Connection failed.")
            print("   Check logs for details.")
    except Exception as e:
        print(f"❌ Connection raised exception: {e}")

if __name__ == "__main__":
    check_connection()
