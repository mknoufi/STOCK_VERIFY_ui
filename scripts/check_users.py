import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.stock_verification


async def list_users():
    users = await db.users.find({}).to_list(length=100)
    print("Found Users:")
    for u in users:
        print(f"Username: {u.get('username')}, Role: {u.get('role')}, Pin: {u.get('pin')}")


if __name__ == "__main__":
    asyncio.run(list_users())
