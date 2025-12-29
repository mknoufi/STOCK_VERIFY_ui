from datetime import datetime

import jwt

from backend.utils.auth_utils import create_access_token


def test_access_token_claims():
    # Test data
    data = {"sub": "testuser", "role": "staff"}
    secret_key = "test-secret"
    algorithm = "HS256"

    # Generate token
    token = create_access_token(data=data, secret_key=secret_key, algorithm=algorithm)

    # Decode token without verification to inspect payload
    payload = jwt.decode(token, options={"verify_signature": False})

    print(f"\nPayload: {payload}")

    # Verify claims
    assert payload["sub"] == "testuser"
    assert payload["role"] == "staff"
    assert payload["type"] == "access"
    assert "exp" in payload

    # Verify expiration is in the future
    assert payload["exp"] > datetime.utcnow().timestamp()


if __name__ == "__main__":
    test_access_token_claims()
    print("Test passed!")
