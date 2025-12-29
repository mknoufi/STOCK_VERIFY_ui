import asyncio

import httpx

BASE_URL = "http://localhost:8001"


async def test_admin_api():
    async with httpx.AsyncClient() as client:
        # 1. Login
        print("--- Logging in as Admin ---")
        login_payload = {"username": "admin", "password": "admin123"}

        # Try /auth/login
        print(f"Attempting POST {BASE_URL}/auth/login")
        response = await client.post(f"{BASE_URL}/auth/login", json=login_payload)

        if response.status_code == 404:
            print(f"Attempting POST {BASE_URL}/api/auth/login")
            response = await client.post(f"{BASE_URL}/api/auth/login", json=login_payload)

        if response.status_code != 200:
            print(f"Login failed: {response.status_code} {response.text}")
            return

        data = response.json()
        if "data" in data:
            data = data["data"]

        token = data.get("access_token")
        if not token:
            print("No access token in response:", data)
            return

        print("Login successful.")

        headers = {"Authorization": f"Bearer {token}"}

        # 2. Search for the item "SUJ001"
        # 2. Search for the item "SUJ001"
        print("\n--- Searching for 'SUJ001' in ERP Items ---")
        response = await client.get(
            f"{BASE_URL}/api/v2/erp/items/filtered",
            params={"search": "SUJ001"},
            headers=headers,
        )
        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            data_resp = response.json()
            # print("Response Data:", data_resp)
            items = data_resp.get("items", [])

            if items:
                print(f"Found {len(items)} items:")
                for item in items:
                    print(
                        f"Item: {item.get('item_code')} MRP: {item.get('mrp')} "
                        f"Stock: {item.get('stock_qty')} Verified: {item.get('verified')} "
                        f"Verified Qty: {item.get('verified_qty')}"
                    )
            else:
                print("No items found.")
        else:
            print(f"Error: {response.text}")

        # 3. Check Variances (Pending Verifications)
        print("\n--- Checking Variances ---")
        response = await client.get(
            f"{BASE_URL}/api/v2/erp/items/variances", params={"search": "SUJ001"}, headers=headers
        )
        if response.status_code == 200:
            variances_resp = response.json()
            variances = (
                variances_resp.get("data", variances_resp)
                if isinstance(variances_resp, dict)
                else variances_resp
            )

            print(f"Found {len(variances) if isinstance(variances, list) else 0} variances.")
            if isinstance(variances, list):
                for v in variances:
                    print(
                        f"Variance Item: {v.get('item_code')} Verified Qty: {v.get('verified_qty')} Damaged: {v.get('damaged_qty')}"
                    )
        else:
            print(f"Variances endpoint failed: {response.status_code} {response.text}")


if __name__ == "__main__":
    asyncio.run(test_admin_api())
