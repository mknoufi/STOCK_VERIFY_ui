import logging
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.utils.auth_utils import get_password_hash

logger = logging.getLogger(__name__)


async def init_default_users(db: AsyncIOMotorDatabase):
    """Create default users if they don't exist"""
    try:
        # Check for staff1
        staff_exists = await db.users.find_one({"username": "staff1"})
        if not staff_exists:
            await db.users.insert_one(
                {
                    "username": "staff1",
                    "hashed_password": get_password_hash("staff123"),
                    "full_name": "Staff Member",
                    "role": "staff",
                    "is_active": True,
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                }
            )
            logger.info("Default user created: staff1/staff123")

        # Check for supervisor
        supervisor_exists = await db.users.find_one({"username": "supervisor"})
        if not supervisor_exists:
            await db.users.insert_one(
                {
                    "username": "supervisor",
                    "hashed_password": get_password_hash("super123"),
                    "full_name": "Supervisor",
                    "role": "supervisor",
                    "is_active": True,
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                }
            )
            logger.info("Default user created: supervisor/super123")

        # Check for admin
        admin_exists = await db.users.find_one({"username": "admin"})
        if not admin_exists:
            await db.users.insert_one(
                {
                    "username": "admin",
                    "hashed_password": get_password_hash("admin123"),
                    "full_name": "Administrator",
                    "role": "admin",
                    "is_active": True,
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                }
            )
            logger.info("Default user created: admin/admin123")

    except Exception as e:
        logger.error(f"Error initializing default users: {str(e)}")
        raise
