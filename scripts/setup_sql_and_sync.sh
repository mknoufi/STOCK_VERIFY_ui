#!/bin/bash
# SQL Server Connection & Data Sync Setup Script
# This script configures SQL Server connection and syncs all ERP data

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║         SQL SERVER CONNECTION & DATA SYNC SETUP                        ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if interactive mode
if [ $# -eq 0 ]; then
    echo "INTERACTIVE SETUP MODE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Prompt for credentials
    read -p "SQL Server Host (e.g., 192.168.1.100): " SQL_SERVER_HOST
    read -p "SQL Server Port [1433]: " SQL_SERVER_PORT
    SQL_SERVER_PORT=${SQL_SERVER_PORT:-1433}
    
    read -p "Database Name: " SQL_SERVER_DATABASE
    read -p "Username [readonly_user]: " SQL_SERVER_USER
    SQL_SERVER_USER=${SQL_SERVER_USER:-readonly_user}
    
    read -sp "Password: " SQL_SERVER_PASSWORD
    echo ""
    
else
    # Use command line arguments
    SQL_SERVER_HOST=$1
    SQL_SERVER_PORT=${2:-1433}
    SQL_SERVER_DATABASE=$3
    SQL_SERVER_USER=${4:-readonly_user}
    SQL_SERVER_PASSWORD=$5
fi

# Validate inputs
if [ -z "$SQL_SERVER_HOST" ] || [ -z "$SQL_SERVER_DATABASE" ] || [ -z "$SQL_SERVER_PASSWORD" ]; then
    echo "❌ Error: Missing required parameters"
    echo "Usage: $0 <host> [port] <database> [user] <password>"
    exit 1
fi

echo ""
echo "📋 CONFIGURATION SUMMARY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Host:     $SQL_SERVER_HOST"
echo "Port:     $SQL_SERVER_PORT"
echo "Database: $SQL_SERVER_DATABASE"
echo "User:     $SQL_SERVER_USER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Export environment variables
export SQL_SERVER_HOST="$SQL_SERVER_HOST"
export SQL_SERVER_PORT="$SQL_SERVER_PORT"
export SQL_SERVER_DATABASE="$SQL_SERVER_DATABASE"
export SQL_SERVER_USER="$SQL_SERVER_USER"
export SQL_SERVER_PASSWORD="$SQL_SERVER_PASSWORD"

echo "🔧 Step 1: Stopping previous backend instance..."
pkill -f "uvicorn.*8001" || true
sleep 2
echo "✅ Done"

echo ""
echo "🔄 Step 2: Testing SQL Server connection..."
cd "$(dirname "$0")/.."

# Test connection with Python
python3 << 'PYTHON_TEST'
import os
import sys

try:
    import pyodbc
    
    host = os.getenv('SQL_SERVER_HOST')
    port = os.getenv('SQL_SERVER_PORT', '1433')
    database = os.getenv('SQL_SERVER_DATABASE')
    user = os.getenv('SQL_SERVER_USER')
    password = os.getenv('SQL_SERVER_PASSWORD')
    
    # Build connection string
    conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={host},{port};DATABASE={database};UID={user};PWD={password}'
    
    print(f"   Connecting to {host}:{port}/{database}...")
    conn = pyodbc.connect(conn_str, timeout=10)
    cursor = conn.cursor()
    
    # Test query
    cursor.execute("SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES")
    result = cursor.fetchone()
    
    print(f"   ✅ Connection successful!")
    print(f"   Database has {result[0]} tables")
    
    conn.close()
    sys.exit(0)
    
except ImportError:
    print("   ⚠️  pyodbc not installed - skipping connection test")
    print("   Install with: pip install pyodbc")
    sys.exit(0)
except Exception as e:
    print(f"   ❌ Connection failed: {e}")
    print("")
    print("   Troubleshooting:")
    print("   1. Verify SQL Server is running")
    print("   2. Check credentials are correct")
    print("   3. Verify firewall allows connection on port ${SQL_SERVER_PORT}")
    print("   4. Ensure pyodbc is installed: pip install pyodbc")
    sys.exit(1)
PYTHON_TEST

echo ""
echo "🚀 Step 3: Starting backend with SQL Server connection..."
cd backend

# Start backend in background
export PYTHONPATH=..
python3 -m backend.server &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Waiting for backend to initialize (10 seconds)..."
sleep 10

# Check if backend is running
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Backend failed to start"
    exit 1
fi

echo "✅ Backend started successfully"

echo ""
echo "📊 Step 4: Checking system health..."
cd ..

HEALTH=$(curl -s http://localhost:8001/health | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('dependencies', {}).get('sql_server', {}).get('status', 'unknown'))" 2>/dev/null || echo "error")

if [ "$HEALTH" = "healthy" ]; then
    echo "✅ SQL Server connection: HEALTHY"
else
    echo "⚠️  SQL Server connection: $HEALTH"
fi

echo ""
echo "🔐 Step 5: Getting authentication token..."

TOKEN=$(curl -s -X POST "http://localhost:8001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' | \
  python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data']['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    exit 1
fi

echo "✅ Got authentication token"

echo ""
echo "📥 Step 6: Syncing ERP data to MongoDB..."
echo "   This may take a few minutes depending on data volume..."
echo ""

SYNC_RESPONSE=$(curl -s -X POST "http://localhost:8001/api/sync/trigger" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_sync": true}')

echo "$SYNC_RESPONSE" | python3 << 'PYTHON_PARSE'
import sys, json

try:
    data = json.load(sys.stdin)
    
    if data.get('success'):
        sync_data = data.get('data', {})
        print(f"✅ Sync completed successfully!")
        print(f"")
        print(f"   Items synced:    {sync_data.get('items_synced', 0):,}")
        print(f"   Duration:        {sync_data.get('duration_seconds', 0):.2f}s")
        print(f"   Status:          {sync_data.get('status', 'completed')}")
        
        if sync_data.get('errors'):
            print(f"   Errors:          {len(sync_data['errors'])}")
            for error in sync_data['errors'][:3]:
                print(f"                    - {error}")
    else:
        print(f"❌ Sync failed: {data.get('error', 'Unknown error')}")
        sys.exit(1)
except Exception as e:
    print(f"Error parsing response: {e}")
    print(f"Response: {sys.stdin.read()}")
    sys.exit(1)
PYTHON_PARSE

echo ""
echo "📊 Step 7: Verifying sync results..."

ITEMS=$(curl -s -X GET "http://localhost:8001/api/items/search/optimized?q=51&limit=1" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('total_results', 0))" 2>/dev/null || echo "0")

if [ "$ITEMS" -gt 0 ]; then
    echo "✅ Data verification successful!"
    echo "   Total items in range 51xxxx: $ITEMS"
else
    echo "⚠️  No items found in verification"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETE! ✅                                  ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📱 NEXT STEPS:"
echo ""
echo "1. Open the app:"
echo "   - Web: http://localhost:19006"
echo "   - Mobile: Scan QR code in Expo terminal"
echo ""
echo "2. Login with admin credentials:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo ""
echo "3. Try searching for items:"
echo "   - Use barcode prefixes 51, 52, 53"
echo "   - Example: barcode 510001"
echo ""
echo "4. Run barcode gap analysis:"
echo "   python3 scripts/find_missing_barcodes.py --start 510001 --end 529999"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💾 Backend is running on: http://localhost:8001"
echo "   API Docs: http://localhost:8001/api/docs"
echo "   Health: http://localhost:8001/health"
echo ""
echo "To stop services: pkill -f uvicorn && pkill -f expo"
echo ""
