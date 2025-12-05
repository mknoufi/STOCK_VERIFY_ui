import asyncio
import os
import sys

import httpx

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.config import settings  # noqa: E402

BASE_URL = f"http://localhost:{settings.PORT}"


async def get_auth_token():
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Login as staff1
        response = await client.post(
            f"{BASE_URL}/api/auth/login", json={"username": "staff1", "password": "staff123"}
        )
        if response.status_code == 200:
            return response.json()["data"]["access_token"]
        else:
            print(f"❌ Login failed: {response.text}")
            return None


async def verify_items_flow(token):
    print("Checking items flow...")
    async with httpx.AsyncClient(follow_redirects=True) as client:
        # Get items
        response = await client.get(
            f"{BASE_URL}/api/v2/items",
            headers={"Authorization": f"Bearer {token}"},
            params={"limit": 10},
        )

        if response.status_code == 200:
            data = response.json()
            items = data.get("data", {}).get("items", [])
            if items:
                print(f"✅ Found {len(items)} items in API")
                print(f"   First item keys: {list(items[0].keys())}")
                # print(f"   Sample item: {items[0]['item_name']} ({items[0]['item_code']})")
                return True
            else:
                print("⚠️  No items found in API (Mock data might not be initialized)")
                return False
        else:
            print(f"❌ Failed to get items: {response.status_code} - {response.text}")
            return False


async def main():
    print("Starting Integration Flow Verification...")

    token = await get_auth_token()
    if not token:
        sys.exit(1)

    items_ok = await verify_items_flow(token)

    if items_ok:
        print("\n✅ Integration flow verified (Mock Data -> API)")
        sys.exit(0)
    else:
        print("\n❌ Integration flow failed!")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
