import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings

async def list_users():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]
    users = await db.users.find({}).to_list(length=10)
    print(f"Found {len(users)} users:")
    for user in users:
        print(f"Username: {user.get('username')}, Role: {user.get('role')}")

if __name__ == "__main__":
    asyncio.run(list_users())
