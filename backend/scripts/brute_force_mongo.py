import asyncio
from motor.motor_asyncio import AsyncIOMotorClient


async def test_creds():
    creds = [
        "",  # No auth
        "admin:password",
        "admin:admin",
        "root:root",
        "root:example",
        "user:password",
        "stock_user:stock_pass",
        "stock_verification:stock_verification",
    ]

    for cred in creds:
        if cred:
            url = f"mongodb://{cred}@localhost:27017/stock_verification?authSource=admin"
        else:
            url = "mongodb://localhost:27017/stock_verification"

        print(f"Testing {url}...")
        try:
            client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=2000)
            db = client["stock_verification"]
            # Try to find one user
            await db.users.find_one({})
            print(f"SUCCESS! Connected and authorized with: {url}")
            return
        except Exception as e:
            print(f"Failed with {cred}: {e}")


if __name__ == "__main__":
    asyncio.run(test_creds())
