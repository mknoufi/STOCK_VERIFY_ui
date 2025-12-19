import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from motor.motor_asyncio import AsyncIOMotorClient

try:
    from backend.config import settings
except Exception:

    class MockSettings:
        MONGO_URL = "mongodb://localhost:27017"
        DB_NAME = "stock_count"

    settings = MockSettings()


async def analyze_variances():
    print(f"Connecting to: {settings.MONGO_URL}")
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]

    # 1. Sample Variance Schema
    sample = await db.variances.find_one({})
    print("\n[Variance Sample]:")
    print(sample)

    # 2. Category Distribution of Variances
    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    results = await db.variances.aggregate(pipeline).to_list(None)
    print("\n[Variances by Category]:")
    for r in results:
        print(f" - {r['_id']}: {r['count']}")

    # 3. Reason Distribution
    pipeline = [{"$group": {"_id": "$reason_id", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    results = await db.variances.aggregate(pipeline).to_list(None)
    print("\n[Variances by Reason]:")
    for r in results:
        print(f" - {r['_id']}: {r['count']}")

    # 4. Check if items had variances
    item_variances = await db.variances.distinct("item_code")
    print(f"\nUnique items with variances: {len(item_variances)}")

    client.close()


if __name__ == "__main__":
    asyncio.run(analyze_variances())
