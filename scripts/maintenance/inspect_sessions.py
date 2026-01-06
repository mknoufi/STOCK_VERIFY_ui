import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def inspect_sessions():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.stock_verify

    cursor = db.sessions.find({})
    async for session in cursor:
        print(f"ID: {session.get('id')}, SessionID: {session.get('session_id')}, _id: {session.get('_id')}")

if __name__ == "__main__":
    asyncio.run(inspect_sessions())
