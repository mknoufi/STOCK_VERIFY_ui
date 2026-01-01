"""
PIN Authentication Service
Handles PIN-based login for staff/quick access
"""

import logging
from datetime import datetime, timedelta
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class PINAuthService:
    """Service for PIN-based authentication"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.pin_authentication
        self.max_attempts = 3
        self.lockout_duration = 15  # minutes

    async def initialize(self):
        """Initialize indexes"""
        try:
            await self.collection.create_index("user_id", unique=True)
            await self.collection.create_index("last_used")
            await self.collection.create_index("locked_until")
            logger.info("PIN authentication indexes created")
        except Exception as e:
            logger.error(f"Error creating PIN indexes: {e}")

    async def set_pin(self, user_id: str, pin: str) -> bool:
        """
        Set or update PIN for a user

        Args:
            user_id: User ID
            pin: 4-6 digit PIN

        Returns:
            True if successful
        """
        try:
            if not self._validate_pin_format(pin):
                raise ValueError("PIN must be 4-6 digits")

            hashed_pin = pwd_context.hash(pin)

            await self.collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "pin_hash": hashed_pin,
                        "created_at": datetime.utcnow(),
                        "enabled": True,
                        "failed_attempts": 0,
                    }
                },
                upsert=True,
            )

            logger.info(f"PIN set for user: {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error setting PIN: {e}")
            return False

    async def verify_pin(self, user_id: str, pin: str) -> bool:
        """
        Verify PIN for a user

        Args:
            user_id: User ID
            pin: PIN to verify

        Returns:
            True if PIN is correct
        """
        try:
            pin_record = await self.collection.find_one({"user_id": user_id})

            if not pin_record or not pin_record.get("enabled"):
                return False

            # Check if account is locked
            if pin_record.get("locked_until"):
                if datetime.utcnow() < pin_record["locked_until"]:
                    logger.warning(f"PIN login attempt for locked account: {user_id}")
                    return False
                else:
                    # Unlock account
                    await self.collection.update_one(
                        {"user_id": user_id},
                        {
                            "$set": {
                                "locked_until": None,
                                "failed_attempts": 0,
                            }
                        },
                    )

            # Verify PIN
            if pwd_context.verify(pin, pin_record.get("pin_hash", "")):
                # Reset failed attempts
                await self.collection.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {
                            "last_used": datetime.utcnow(),
                            "failed_attempts": 0,
                        }
                    },
                )
                logger.info(f"Successful PIN login for user: {user_id}")
                return True
            else:
                # Increment failed attempts
                failed_attempts = pin_record.get("failed_attempts", 0) + 1

                update_data = {"$set": {"failed_attempts": failed_attempts}}

                # Lock account after max attempts
                if failed_attempts >= self.max_attempts:
                    locked_until = datetime.utcnow() + timedelta(minutes=self.lockout_duration)
                    update_data["$set"]["locked_until"] = locked_until
                    logger.warning(f"PIN account locked due to failed attempts: {user_id}")

                await self.collection.update_one({"user_id": user_id}, update_data)
                return False

        except Exception as e:
            logger.error(f"Error verifying PIN: {e}")
            return False

    async def disable_pin(self, user_id: str) -> bool:
        """Disable PIN for a user"""
        try:
            result = await self.collection.update_one(
                {"user_id": user_id},
                {"$set": {"enabled": False}},
            )
            logger.info(f"PIN disabled for user: {user_id}")
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error disabling PIN: {e}")
            return False

    async def get_pin_status(self, user_id: str) -> dict[str, Any]:
        """Get PIN status for a user"""
        try:
            pin_record = await self.collection.find_one({"user_id": user_id})

            if not pin_record:
                return {"enabled": False, "status": "not_set"}

            is_locked = (
                pin_record.get("locked_until") and datetime.utcnow() < pin_record["locked_until"]
            )

            return {
                "enabled": pin_record.get("enabled", False),
                "status": "locked" if is_locked else "active",
                "failed_attempts": pin_record.get("failed_attempts", 0),
                "last_used": pin_record.get("last_used"),
                "locked_until": pin_record.get("locked_until") if is_locked else None,
            }
        except Exception as e:
            logger.error(f"Error getting PIN status: {e}")
            return {"enabled": False, "status": "error"}

    def _validate_pin_format(self, pin: str) -> bool:
        """Validate PIN format (4-6 digits)"""
        return isinstance(pin, str) and len(pin) >= 4 and len(pin) <= 6 and pin.isdigit()
