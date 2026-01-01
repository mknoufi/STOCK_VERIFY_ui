import requests  # type: ignore
import time

BASE_URL = "http://localhost:8001"


def register_and_login():
    print("Registering staff1...")
    register_data = {
        "username": "staff1",
        "password": "password123",
        "full_name": "Staff One",
        "role": "staff",
    }

    try:
        # Register
        requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        # We don't check status here strictly because it might already exist (if re-run)

        # Login
        print("Logging in with password...")
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "staff1", "password": "password123"},
        )
        response.raise_for_status()
        data = response.json()

        # Handling potential response wrapper
        if "data" in data and "access_token" in data["data"]:
            token = data["data"]["access_token"]
        elif "access_token" in data:
            token = data["access_token"]
        else:
            print(f"❌ [FAIL] Login response missing token: {data}")
            return None

        print("✅ [PASS] Login successful")
        return token

    except Exception as e:
        print(f"❌ [FAIL] Auth failed: {e}")
        return None


def test_get_warehouses():
    # Wait for Mongo to start up properly if just started
    time.sleep(2)

    token = register_and_login()
    if not token:
        print("Skipping warehouse tests due to login failure")
        return

    headers = {"Authorization": f"Bearer {token}"}
    print("\nTesting /api/locations/warehouses...")

    # Test 1: No zone
    try:
        response = requests.get(f"{BASE_URL}/api/locations/warehouses", headers=headers)
        response.raise_for_status()
        print("✅ [PASS] Fetch all warehouses success")
    except Exception as e:
        print(f"❌ [FAIL] Fetch all warehouses failed: {e}")

    # Test 2: Zone with space (simulating Need for encoding)
    zone = "Showroom Space"
    # Note: Client side encoding test.
    # If we simply pass params={'zone': zone}, requests library encodes it.
    # The fix we made in frontend was to ensure we encode it.
    # Here we are verifying the BACKEND accepts it.

    print(f"Testing zone='{zone}'...")

    try:
        response = requests.get(
            f"{BASE_URL}/api/locations/warehouses",
            params={"zone": zone},
            headers=headers,
        )

        response.raise_for_status()
        data = response.json()
        print(f"✅ [PASS] Fetch with zone='{zone}' success. Response items: {len(data)}")
    except Exception as e:
        print(f"❌ [FAIL] Fetch with zone='{zone}' failed: {e}")
        try:
            print(f"Response: {response.text}")  # type: ignore
        except Exception:
            pass


if __name__ == "__main__":
    test_get_warehouses()
