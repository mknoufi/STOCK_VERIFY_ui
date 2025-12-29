import asyncio
import os
import sys

import httpx

from backend.config import settings

# Add backend to path for module imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

BASE_URL = f"http://localhost:{settings.PORT}"


async def verify_security_headers():
    print(f"Checking security headers on {BASE_URL}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/health")

            headers = response.headers
            required_headers = {
                # "Strict-Transport-Security": "max-age=31536000; includeSubDomains", # Only for HTTPS
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "X-XSS-Protection": "1; mode=block",
            }

            missing = []
            for header, _value in required_headers.items():
                if header not in headers:
                    missing.append(header)
                # elif headers[header] != value:
                #     print(f"⚠️  Header {header} mismatch: expected '{value}', got '{headers[header]}'")

            if missing:
                print(f"❌ Missing security headers: {', '.join(missing)}")
                return False
            else:
                print("✅ Security headers present")
                return True

    except Exception as e:
        print(f"❌ Error connecting to API: {e}")
        return False


async def verify_jwt_handling():
    print("Checking JWT handling...")
    # This would require a valid token generation or mock
    # For now, we check if the auth endpoint rejects invalid tokens
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BASE_URL}/api/admin/security/summary",
                headers={"Authorization": "Bearer invalid_token"},
            )

            if response.status_code == 401:
                print("✅ Invalid token rejected (401 Unauthorized)")
                return True
            else:
                print(f"❌ Expected 401 for invalid token, got {response.status_code}")
                return False
    except Exception as e:
        print(f"❌ Error checking JWT: {e}")
        return False


async def main():
    print("Starting Security Verification...")
    headers_ok = await verify_security_headers()
    jwt_ok = await verify_jwt_handling()

    if headers_ok and jwt_ok:
        print("\n✅ All security checks passed!")
        sys.exit(0)
    else:
        print("\n❌ Security checks failed!")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
