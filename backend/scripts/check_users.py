"""Check and create default users if they don't exist"""

import asyncio
import os
from datetime import datetime

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

load_dotenv()


# Password context - Modern Argon2 hashing
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=4,
)


async def check_users():
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    users = await db.users.find({}).to_list(10)
    print(f"Users found: {len(users)}")

    for u in users:
        print(f"  - {u.get('username')} ({u.get('role')})")

    if len(users) == 0:
        print("\nNo users found - creating default users...")
        await db.users.insert_many(
            [
                {
                    "username": "staff1",
                    "password": pwd_context.hash("staff123"),
                    "full_name": "Staff Member",
                    "role": "staff",
                    "created_at": datetime.utcnow(),
                },
                {
                    "username": "supervisor",
                    "password": pwd_context.hash("super123"),
                    "full_name": "Supervisor",
                    "role": "supervisor",
                    "created_at": datetime.utcnow(),
                },
            ]
        )
        print("✓ Default users created")
        users = await db.users.find({}).to_list(10)
        print(f"Total users: {len(users)}")

    client.close()


if __name__ == "__main__":
    asyncio.run(check_users())
