import logging
import os
import sys

from dotenv import load_dotenv

# Configure logging for scripts
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def validate_env():
    """Validate that required environment variables are set."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    logger.info(f"Checking .env at: {env_path}")

    if not os.path.exists(env_path):
        logger.error(".env file not found!")
        logger.info("Create one from .env.example: cp backend/.env.example backend/.env")
        return False

    load_dotenv(env_path)

    # Required keys
    required_keys = [
        "MONGO_URL",
        "DB_NAME",
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
    ]

    # Optional keys (for ERP integration)
    optional_keys = [
        "SQL_SERVER_HOST",
        "SQL_SERVER_PORT",
        "SQL_SERVER_USER",
        "SQL_SERVER_PASSWORD",
    ]

    missing = []
    for key in required_keys:
        value = os.getenv(key)
        if not value:
            missing.append(key)
        else:
            logger.info(f"✅ {key} is set")

    # Check optional keys
    for key in optional_keys:
        value = os.getenv(key)
        if value:
            logger.info(f"✅ {key} is set (optional)")
        else:
            logger.warning(f"⚠️  {key} not set (optional - only needed for ERP integration)")

    if missing:
        logger.error(f"❌ Missing required keys: {', '.join(missing)}")
        logger.info("Generate secrets with: python backend/scripts/generate_secrets.py")
        return False
    else:
        logger.info("✅ All required environment variables are present.")
        return True


if __name__ == "__main__":
    success = validate_env()
    sys.exit(0 if success else 1)
