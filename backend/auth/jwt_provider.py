from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from authlib.jose import jwt as _jwt
from authlib.jose.errors import ExpiredTokenError, JoseError

UTC = timezone.utc


class ExpiredSignatureError(Exception):
    pass


class InvalidTokenError(Exception):
    pass


def _ensure_timestamp(exp: Any) -> Optional[float]:
    if exp is None:
        return None
    if isinstance(exp, (int, float)):
        return float(exp)
    if isinstance(exp, datetime):
        if exp.tzinfo is None:
            return exp.replace(tzinfo=UTC).timestamp()
        return exp.timestamp()
    try:
        return float(exp)
    except:
        return None


def encode(payload: Dict[str, Any], key: str, algorithm: str = "HS256") -> str:
    header = {"alg": algorithm}
    token = _jwt.encode(header, payload, key)
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return str(token)


def decode(
    token: str, key: str, algorithms: Optional[List[str]] = None
) -> Dict[str, Any]:
    SUPPORTED_ALGORITHMS = ["HS256", "HS384", "HS512"]
    if algorithms:
        invalid_algs = [alg for alg in algorithms if alg not in SUPPORTED_ALGORITHMS]
        if invalid_algs:
            raise InvalidTokenError(f"Unsupported algorithm(s): {invalid_algs}")
    try:
        claims = _jwt.decode(token, key)
        exp_ts = _ensure_timestamp(claims.get("exp"))
        if exp_ts is not None:
            now = datetime.now(UTC).timestamp()
            if now > exp_ts:
                raise ExpiredTokenError("token is expired")
        return dict(claims)
    except ExpiredTokenError as exc:
        raise ExpiredSignatureError(str(exc))
    except JoseError as exc:
        raise InvalidTokenError(str(exc))
    except Exception as exc:
        raise InvalidTokenError(str(exc))


class _JWTCompat:
    encode = staticmethod(encode)
    decode = staticmethod(decode)
    ExpiredSignatureError = ExpiredSignatureError
    InvalidTokenError = InvalidTokenError


jwt = _JWTCompat()
