import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient

# Connect to local MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.stock_verification


async def update_admin_pin():
    # Update admin user with PIN '8888'
    result = await db.users.update_one(
        {"username": "admin"}, {"$set": {"pin": "8888", "role": "admin"}}
    )
    print(f"Updated Admin PIN: Matched {result.matched_count}, Modified {result.modified_count}")


if __name__ == "__main__":
    asyncio.run(update_admin_pin())
