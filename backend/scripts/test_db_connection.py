#!/usr/bin/env python3
"""
Test Database Connection
Tests MongoDB connection from backend perspective
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# ruff: noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

# Import settings with fallback
try:
    from backend.config import settings
except ImportError:
    # os is already imported

    from dotenv import load_dotenv

    load_dotenv()

    class Settings:
        MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        DB_NAME = os.getenv("DB_NAME", "stock_verification")

    settings = Settings()  # type: ignore


async def test_mongodb_connection():
    """Test MongoDB connection"""
    print("🔍 Testing MongoDB Connection...")
    print("=" * 60)

    try:
        # Connect using settings
        client: AsyncIOMotorClient = AsyncIOMotorClient(settings.MONGO_URL)
        db = client[settings.DB_NAME]

        # Test connection
        await client.admin.command("ping")
        print("✅ MongoDB Connection: SUCCESS")
        print(f"   URL: {settings.MONGO_URL}")
        print(f"   Database: {settings.DB_NAME}")

        # Test collections
        collections = await db.list_collection_names()
        print(f"\n📁 Collections: {len(collections)}")

        # Test key collections
        test_collections = {
            "erp_items": "ERP Items",
            "users": "Users",
            "sessions": "Sessions",
            "erp_config": "ERP Config",
        }

        print("\n📊 Collection Status:")
        for coll_name, label in test_collections.items():
            try:
                count = await db[coll_name].count_documents({})
                status = "✅" if count > 0 else "⚠️"
                print(f"   {status} {label}: {count:,} documents")
            except Exception as e:
                print(f"   ❌ {label}: Error - {e}")

        # Test item lookup (barcode)
        print("\n🔍 Testing Item Lookup:")
        test_barcode = "523658"
        item = await db.erp_items.find_one({"barcode": test_barcode})
        if item:
            print(f"   ✅ Barcode {test_barcode}: Found")
            print(f"      Item: {item.get('item_name', 'N/A')}")
            print(f"      Code: {item.get('item_code', 'N/A')}")
        else:
            print(f"   ❌ Barcode {test_barcode}: Not found")

        # Test user lookup
        print("\n👤 Testing User Lookup:")
        user = await db.users.find_one({})
        if user:
            print("   ✅ Users: Found")
            print(f"      Sample: {user.get('username', 'N/A')} ({user.get('role', 'N/A')})")
        else:
            print("   ❌ Users: Not found")

        client.close()
        return True

    except Exception as e:
        print("❌ MongoDB Connection: FAILED")
        print(f"   Error: {e}")
        import traceback

        traceback.print_exc()
        return False


async def test_backend_api():
    """Test backend API endpoints"""
    print("\n" + "=" * 60)
    print("🌐 Testing Backend API...")
    print("=" * 60)

    import requests  # noqa: E402

    # Test health endpoint
    try:
        response = requests.get("http://localhost:8000/health/", timeout=5)
        if response.status_code == 200:
            health = response.json()
            print("✅ Health Endpoint: SUCCESS")
            print(f"   Status: {health.get('status', 'N/A')}")
            print(f"   MongoDB: {health.get('mongodb', {}).get('status', 'N/A')}")
        else:
            print(f"⚠️  Health Endpoint: Status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Health Endpoint: Backend not running on port 8000")
    except Exception as e:
        print(f"❌ Health Endpoint: Error - {e}")

    # Test items endpoint (requires auth, but we can check if it exists)
    try:
        response = requests.get("http://localhost:8000/api/erp/items/barcode/523658", timeout=5)
        if response.status_code == 200:
            print("✅ Item Lookup API: SUCCESS")
            item = response.json()
            print(f"   Item: {item.get('item_name', 'N/A')}")
        elif response.status_code == 401:
            print("⚠️  Item Lookup API: Requires authentication (endpoint exists)")
        else:
            print(f"⚠️  Item Lookup API: Status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Item Lookup API: Backend not running")
    except Exception as e:
        print(f"❌ Item Lookup API: Error - {e}")


if __name__ == "__main__":
    print("🧪 Database Connection Test")
    print("=" * 60)

    # Test MongoDB
    mongo_ok = asyncio.run(test_mongodb_connection())

    # Test Backend API
    asyncio.run(test_backend_api())

    print("\n" + "=" * 60)
    if mongo_ok:
        print("✅ Database Connection Test: PASSED")
        sys.exit(0)
    else:
        print("❌ Database Connection Test: FAILED")
        sys.exit(1)
