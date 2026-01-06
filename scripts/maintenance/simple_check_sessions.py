import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def list_sessions():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["stock_verification"]

    print("Checking sessions in 'stock_verification'...")
    sessions = await db.sessions.find().to_list(length=100)

    if not sessions:
        print("No sessions found.")
    else:
        print(f"Found {len(sessions)} sessions:")
        for s in sessions:
            print(f"- ID: {s.get('id')}, Status: {s.get('status')}, User: {s.get('user_id')}")

if __name__ == "__main__":
    asyncio.run(list_sessions())
