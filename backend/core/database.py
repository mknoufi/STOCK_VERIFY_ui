import logging
import sys
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

from backend.config import settings

logger = logging.getLogger(__name__)

RUNNING_UNDER_PYTEST = "pytest" in sys.modules

# MongoDB connection with optimization
mongo_url = settings.MONGO_URL
# Normalize trailing slash (avoid accidental DB name in URL)
mongo_url = mongo_url.rstrip("/")

mongo_client_options: dict[str, Any] = {
    "maxPoolSize": 100,
    "minPoolSize": 10,
    "maxIdleTimeMS": 45000,
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 20000,
    "socketTimeoutMS": 20000,
    "retryWrites": True,
    "retryReads": True,
}

logger.info(f"🔌 Connecting to MongoDB at: {mongo_url}")

client: AsyncIOMotorClient = AsyncIOMotorClient(
    mongo_url,
    **mongo_client_options,
)
# Use DB_NAME from settings
db = client[settings.DB_NAME]
