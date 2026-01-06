import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_sessions():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.stock_verify

    # Find sessions with missing session_id
    cursor = db.sessions.find({"session_id": None})
    async for session in cursor:
        if session.get("id"):
            print(f"Migrating session {session['id']}...")
            await db.sessions.update_one(
                {"_id": session["_id"]},
                {"$set": {"session_id": session["id"]}}
            )
            print("Done.")
        else:
            print(f"Skipping session {session['_id']} (no id field)")

if __name__ == "__main__":
    asyncio.run(migrate_sessions())
