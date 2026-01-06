
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.stock_verify

    # Check if admin exists
    if await db.users.find_one({"username": "admin"}):
        print("Admin user already exists")
        return

    hashed_password = pwd_context.hash("admin123")

    admin_user = {
        "username": "admin",
        "full_name": "Administrator",
        "password": hashed_password,
        "role": "admin",
        "is_active": True,
        "permissions": ["all"]
    }

    await db.users.insert_one(admin_user)
    print("Admin user created successfully")

if __name__ == "__main__":
    asyncio.run(create_admin())
