import requests

# Constants
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/api/auth/login"
WATCHTOWER_URL = f"{BASE_URL}/api/v2/sessions/watchtower"
ADMIN_USERNAME = "supervisor"
ADMIN_PASSWORD = "super123"


def verify_watchtower():
    print(f"Testing Watchtower Endpoint at {WATCHTOWER_URL}")

    # 1. Login to get token
    try:
        login_payload = {"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        # Custom login endpoint expects JSON
        response = requests.post(LOGIN_URL, json=login_payload)

        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return

        response_json = response.json()
        if "data" in response_json:
            token = response_json["data"].get("access_token")
        else:
            token = response_json.get("access_token")

        if not token:
            print(f"❌ Could not extract access token. Response: {response_json}")
            return

        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")

        # 2. Call Watchtower Endpoint
        response = requests.get(WATCHTOWER_URL, headers=headers)

        if response.status_code == 200:
            data = response.json()
            print("✅ Watchtower endpoint returned 200 OK")
            print("Response Data Structure:")
            # Validate keys
            expected_keys = [
                "active_sessions",
                "total_scans_today",
                "active_users",
                "hourly_throughput",
                "recent_activity",
            ]
            payload = data.get("data", {})

            missing_keys = [k for k in expected_keys if k not in payload]

            if not missing_keys:
                print("✅ All expected keys present")
                print(f"   Active Sessions: {payload.get('active_sessions')}")
                print(f"   Total Scans: {payload.get('total_scans_today')}")
                print(f"   Active Users: {payload.get('active_users')}")
            else:
                print(f"❌ Missing keys in response: {missing_keys}")
                print(f"Received: {payload.keys()}")

        else:
            print(f"❌ Watchtower endpoint failed: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"❌ Verification script failed with exception: {e}")


if __name__ == "__main__":
    verify_watchtower()
