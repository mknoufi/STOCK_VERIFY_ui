import asyncio
import sys
from pathlib import Path
import json
from datetime import datetime
from bson import ObjectId

# Add project root to path
project_root = Path(__file__).parents[2]
sys.path.insert(0, str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

# Helper to serialize datetime and ObjectId
class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

async def inspect_barcode(barcode):
    print(f"🔍 Inspecting data for barcode: {barcode}")

    try:
        client = AsyncIOMotorClient(settings.MONGO_URL)
        db = client[settings.DB_NAME]

        # 1. Check ERP Items (Master Data)
        print("\n📦 Checking 'erp_items' (Master Data)...")
        erp_item = await db.erp_items.find_one({"barcode": barcode})
        if not erp_item:
            # Try searching by item_code if barcode search fails, or maybe it's stored differently
            erp_item = await db.erp_items.find_one({"item_code": barcode})

        if erp_item:
            print(json.dumps(erp_item, indent=2, cls=DateTimeEncoder))
        else:
            print("❌ No record found in 'erp_items'")

        # 2. Check Verification Records (Scans)
        print("\n✅ Checking 'verification_records' (Scans)...")
        # Try different possible field names for barcode
        query = {"$or": [
            {"barcode": barcode},
            {"scanned_barcode": barcode},
            {"item_code": barcode} # Sometimes item_code is used
        ]}
        cursor = db.verification_records.find(query).sort("scanned_at", -1)
        records = await cursor.to_list(length=10)

        if records:
            print(f"Found {len(records)} scan records:")
            for record in records:
                print(json.dumps(record, indent=2, cls=DateTimeEncoder))
        else:
            print("❌ No scan records found in 'verification_records'")

        # 3. Check Unknown Items (if any)
        print("\n❓ Checking 'unknown_items'...")
        unknown = await db.unknown_items.find_one({"barcode": barcode})
        if unknown:
             print(json.dumps(unknown, indent=2, cls=DateTimeEncoder))
        else:
            print("❌ No record found in 'unknown_items'")

        # 4. Check Users
        print("\n👥 Checking Users...")
        users_collection = db["users"]

        # Check staff1
        staff1 = await users_collection.find_one({"username": "staff1"})
        if staff1:
            print(f"Found 'staff1': {json.dumps(staff1, cls=DateTimeEncoder, indent=2)}")
        else:
            print("User 'staff1' not found.")

        # Search for Ali
        print("Searching for 'ali'...")
        found_ali = False
        async for user in users_collection.find({"username": {"$regex": "ali", "$options": "i"}}):
            print(f"Found user matching 'ali' (username): {json.dumps(user, cls=DateTimeEncoder, indent=2)}")
            found_ali = True

        async for user in users_collection.find({"full_name": {"$regex": "ali", "$options": "i"}}):
            print(f"Found user matching 'ali' (full_name): {json.dumps(user, cls=DateTimeEncoder, indent=2)}")
            found_ali = True

        if not found_ali:
            print("❌ No user found matching 'ali'")

        # 5. Check Session
        session_id = "39fd03b1-0ef0-40e9-b413-0b2b2a5f9e90"
        print(f"\n📅 Checking Session '{session_id}'...")
        session = await db.sessions.find_one({"session_id": session_id})
        if session:
            print(json.dumps(session, indent=2, cls=DateTimeEncoder))
        else:
            print("❌ Session not found")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    barcode = "524375"
    if len(sys.argv) > 1:
        barcode = sys.argv[1]
    asyncio.run(inspect_barcode(barcode))
