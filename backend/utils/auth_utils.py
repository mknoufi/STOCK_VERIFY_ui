import logging
from typing import Any, Dict

from backend.auth.jwt_provider import jwt
from passlib.context import CryptContext

from backend.config import settings

logger = logging.getLogger(__name__)

# Security - Modern password hashing with Argon2 (OWASP recommended)
# Fallback to bcrypt-only if argon2 is not available
try:
    pwd_context = CryptContext(
        schemes=[
            "argon2",
            "bcrypt",
        ],  # Argon2 first (preferred), bcrypt for backward compatibility
        deprecated="auto",  # Auto-upgrade old hashes on next login
        argon2__memory_cost=65536,  # 64 MB memory (resistant to GPU attacks)
        argon2__time_cost=3,  # 3 iterations
        argon2__parallelism=4,  # 4 threads
    )
    # Test if bcrypt backend is available
    try:
        import bcrypt

        # Verify bcrypt is working
        test_hash = bcrypt.hashpw(b"test", bcrypt.gensalt())
        bcrypt.checkpw(b"test", test_hash)
        logger.info("Password hashing: Using Argon2 with bcrypt fallback")
    except Exception as e:
        logger.warning(f"Bcrypt backend check failed, using bcrypt-only context: {str(e)}")
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception as e:
    logger.warning(f"Argon2 not available, using bcrypt-only: {str(e)}")
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = str(settings.JWT_SECRET) if settings.JWT_SECRET else "unsafe-secret-key"
ALGORITHM = str(settings.JWT_ALGORITHM) if settings.JWT_ALGORITHM else "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash using multiple fallback strategies.

    Args:
        plain_password: The plain text password to verify
        hashed_password: The hashed password to compare against

    Returns:
        True if password matches, False otherwise
    """
    if not plain_password or not hashed_password:
        logger.warning("Empty password or hash provided")
        return False

    # Bcrypt has a 72-byte limit, truncate if necessary
    password_bytes = plain_password.encode("utf-8")
    if len(password_bytes) > 72:
        logger.warning("Password exceeds 72 bytes, truncating")
        plain_password = plain_password[:72]
        password_bytes = plain_password.encode("utf-8")

    # Strategy 1: Try passlib CryptContext (supports multiple schemes)
    try:
        result = pwd_context.verify(plain_password, hashed_password)
        if result:
            logger.debug("Password verified using passlib CryptContext")
            return True
        # If result is False, we continue to fallback
    except Exception as e:
        logger.debug(f"Passlib verification failed: {type(e).__name__}: {str(e)}")

    # Strategy 2: Direct bcrypt verification (fallback)
    return _verify_bcrypt_fallback(password_bytes, hashed_password)


def _verify_bcrypt_fallback(password_bytes: bytes, hashed_password: str) -> bool:
    try:
        import bcrypt

        if isinstance(hashed_password, str):
            hash_bytes = hashed_password.encode("utf-8")
            result = bcrypt.checkpw(password_bytes, hash_bytes)
            if result:
                logger.debug("Password verified using direct bcrypt")
            return bool(result)
        else:
            logger.error(f"Password hash is not a string: {type(hashed_password)}")
            return False
    except ImportError:
        logger.error("bcrypt module not available - password verification cannot proceed")
        return False
    except Exception as e:
        logger.error(f"Direct bcrypt verification failed: {type(e).__name__}: {str(e)}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a password using the configured context"""
    return str(pwd_context.hash(password))


def create_access_token(data: Dict[str, Any], secret_key: str = None, algorithm: str = None) -> str:
    """Create a JWT access token from user data"""
    key = secret_key if secret_key else SECRET_KEY
    algo = algorithm if algorithm else ALGORITHM
    return str(jwt.encode(data, key, algorithm=algo))
