import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.stock_verification


async def check_sujata():
    collections = await db.list_collection_names()
    print(f"Collections: {collections}")

    print("\n--- Checking erp_items for SUJ001 ---")
    item = await db.erp_items.find_one({"item_code": "SUJ001"})
    print(f"ERP Item: {item}")

    if "verification_records" in collections:
        print("\n--- Checking Verification Records ---")
        async for rec in db.verification_records.find({"item_code": "SUJ001"}):
            print(f"Record: {rec}")

    if "count_lines" in collections:
        print("\n--- Dumping All Count Lines ---")
        async for line in db.count_lines.find({}):
            print(f"Count Line: {line}")

    if "verification_sessions" in collections:
        print("\n--- Dumping All Verification Sessions ---")
        async for vs in db.verification_sessions.find({}):
            print(f"Verif Session: {vs}")

    print("\n--- Dumping All Sessions ---")
    session_id = None
    async for session in db.sessions.find({}):
        print(f"Session: {session}")
        session_id = session.get("id")

    if session_id:
        print(f"\n--- Injecting Count Line for SUJ001 into Session {session_id} ---")
        from datetime import datetime

        new_line = {
            "id": "manual-inject-sujata-001",
            "session_id": session_id,
            "item_code": "SUJ001",
            "item_name": "Sujata Dynamix Mixer Grinder",
            "barcode": "8901234567890",
            "erp_qty": 15.0,
            "counted_qty": 15.0,
            "variance": 0.0,
            "damaged_qty": 1.0,
            "mrp_erp": 12500.0,
            "mrp_counted": 14650.0,
            "serial_numbers": ["ab23", "ab38"],
            "status": "pending",
            "approval_status": "NEEDS_REVIEW",
            "counted_by": "staff1",
            "counted_at": datetime.now(),
            "verified": True,
            "risk_flags": [],
        }
        await db.count_lines.insert_one(new_line)
        print("Injection Successful.")
    else:
        print("No active session found to inject into.")


if __name__ == "__main__":
    asyncio.run(check_sujata())
