"""
JWT provider wrapper using Authlib

This module provides a small compatibility layer with a very small surface
matching the previous usage in the codebase (encode, decode) and defines
exceptions named the same as the old library so callers need minimal changes.

It avoids ECDSA transitive dependencies by using the `authlib` library with
HMAC (HS*) signatures for symmetric keys. For asymmetric (ES/RS) algorithms
you can extend this module to load keys from files or secure stores.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from authlib.jose import jwt as _jwt
from authlib.jose.errors import JoseError, ExpiredTokenError


class ExpiredSignatureError(Exception):
    """Raised when token is expired (compat wrapper)."""

    pass


class InvalidTokenError(Exception):
    """Raised when token cannot be decoded/verified (compat wrapper)."""

    pass


def _ensure_timestamp(exp: Any) -> Optional[float]:
    if exp is None:
        return None
    if isinstance(exp, (int, float)):
        return float(exp)
    # If it's a datetime, convert to timestamp
    if isinstance(exp, datetime):
        return exp.replace(tzinfo=timezone.utc).timestamp()
    try:
        # Try parsing numeric string
        return float(exp)
    except Exception:
        return None


def encode(payload: Dict[str, Any], key: str, algorithm: str = "HS256") -> str:
    """Encode a payload into a JWT string.

    Args:
        payload: dict of claims
        key: secret or key material
        algorithm: algorithm name (default HS256)

    Returns:
        Compact JWT as string
    """
    header = {"alg": algorithm}
    token = _jwt.encode(header, payload, key)
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return str(token)


def decode(token: str, key: str, algorithms: Optional[list] = None) -> Dict[str, Any]:
    """Decode and verify a JWT, returning claims.

    This function maps authlib exceptions into the compat exceptions used by
    the existing code (ExpiredSignatureError, InvalidTokenError).
    """
    # Whitelist supported algorithms (HS* for symmetric keys)
    SUPPORTED_ALGORITHMS = ["HS256", "HS384", "HS512"]
    if algorithms:
        invalid_algs = [alg for alg in algorithms if alg not in SUPPORTED_ALGORITHMS]
        if invalid_algs:
            raise InvalidTokenError(
                f"Unsupported algorithm(s): {invalid_algs}. Supported: {SUPPORTED_ALGORITHMS}"
            )
    try:
        # authlib will validate signature and common claims (e.g., exp) when
        # using jwt.decode; it returns a dict of claims.
        claims = _jwt.decode(token, key)

        # authlib may not convert numeric exp into datetime; ensure expiry
        exp_ts = _ensure_timestamp(claims.get("exp"))
        if exp_ts is not None:
            now = datetime.now(timezone.utc).timestamp()
            if now > exp_ts:
                raise ExpiredTokenError("token is expired")

        return dict(claims)
    except ExpiredTokenError as exc:
        raise ExpiredSignatureError(str(exc))
    except JoseError as exc:
        # Generic jose errors map to invalid token
        raise InvalidTokenError(str(exc))
    except Exception as exc:
        # Any other error treat as invalid token for compatibility
        raise InvalidTokenError(str(exc))


# Provide a small object with attribute-style access similar to the old `jwt`
class _JWTCompat:
    encode = staticmethod(encode)
    decode = staticmethod(decode)
    ExpiredSignatureError = ExpiredSignatureError
    InvalidTokenError = InvalidTokenError


jwt = _JWTCompat()
