"""
Enterprise Security Service
Advanced security features for enterprise deployments
- IP Whitelisting/Blacklisting
- Brute force protection
- Session management
- Security event monitoring
"""

import hashlib
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class SecurityAction(str, Enum):
    """Security actions"""

    ALLOW = "allow"
    DENY = "deny"
    CHALLENGE = "challenge"  # Require additional verification


class IPListType(str, Enum):
    """IP list types"""

    WHITELIST = "whitelist"
    BLACKLIST = "blacklist"


class SecurityEvent(BaseModel):
    """Security event for monitoring"""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: str
    ip_address: str
    username: Optional[str] = None
    details: dict[str, Any] = Field(default_factory=dict)
    severity: str = "info"


class EnterpriseSecurityService:
    """
    Enterprise security service providing:
    - IP whitelisting/blacklisting
    - Brute force protection
    - Session management
    - Account lockout
    - Security monitoring
    """

    def __init__(
        self,
        mongo_db: AsyncIOMotorDatabase,
        max_login_attempts: int = 5,
        lockout_duration_minutes: int = 30,
        session_timeout_minutes: int = 480,
        max_concurrent_sessions: int = 5,
        enable_ip_filtering: bool = True,
    ):
        self.db = mongo_db
        self.ip_list_collection = mongo_db.security_ip_lists
        self.lockout_collection = mongo_db.security_lockouts
        self.session_collection = mongo_db.security_sessions
        self.events_collection = mongo_db.security_events

        self.max_login_attempts = max_login_attempts
        self.lockout_duration = timedelta(minutes=lockout_duration_minutes)
        self.session_timeout = timedelta(minutes=session_timeout_minutes)
        self.max_concurrent_sessions = max_concurrent_sessions
        self.enable_ip_filtering = enable_ip_filtering

        # In-memory cache for performance
        self._whitelist_cache: set[str] = set()
        self._blacklist_cache: set[str] = set()
        self._cache_loaded = False

    async def initialize(self):
        """Initialize indexes and load IP lists"""
        # Create indexes
        await self.ip_list_collection.create_index("ip_address")
        await self.ip_list_collection.create_index("list_type")
        await self.lockout_collection.create_index("username")
        await self.lockout_collection.create_index("expires_at")
        await self.session_collection.create_index("user_id")
        await self.session_collection.create_index("expires_at")
        await self.events_collection.create_index("timestamp")
        await self.events_collection.create_index([("timestamp", -1)])

        # Load IP lists into cache
        await self._load_ip_cache()

        logger.info("Enterprise security service initialized")

    async def _load_ip_cache(self):
        """Load IP lists into memory for fast lookup"""
        self._whitelist_cache.clear()
        self._blacklist_cache.clear()

        async for doc in self.ip_list_collection.find(
            {"list_type": IPListType.WHITELIST.value}
        ):
            self._whitelist_cache.add(doc["ip_address"])

        async for doc in self.ip_list_collection.find(
            {"list_type": IPListType.BLACKLIST.value}
        ):
            self._blacklist_cache.add(doc["ip_address"])

        self._cache_loaded = True
        logger.info(
            f"Loaded {len(self._whitelist_cache)} whitelisted and {len(self._blacklist_cache)} blacklisted IPs"
        )

    # =========================================================================
    # IP FILTERING
    # =========================================================================

    async def check_ip(self, ip_address: str) -> SecurityAction:
        """
        Check if IP is allowed

        Returns:
            SecurityAction.ALLOW - IP is whitelisted or not in blacklist
            SecurityAction.DENY - IP is blacklisted
        """
        if not self.enable_ip_filtering:
            return SecurityAction.ALLOW

        if not self._cache_loaded:
            await self._load_ip_cache()

        # Check blacklist first (security priority)
        if ip_address in self._blacklist_cache:
            await self._log_security_event(
                "ip_blocked",
                ip_address,
                severity="warning",
                details={"reason": "blacklisted"},
            )
            return SecurityAction.DENY

        # If whitelist exists and IP not in it, deny
        if self._whitelist_cache and ip_address not in self._whitelist_cache:
            await self._log_security_event(
                "ip_blocked",
                ip_address,
                severity="warning",
                details={"reason": "not_whitelisted"},
            )
            return SecurityAction.DENY

        return SecurityAction.ALLOW

    async def add_to_ip_list(
        self,
        ip_address: str,
        list_type: IPListType,
        reason: Optional[str] = None,
        added_by: Optional[str] = None,
        expires_at: Optional[datetime] = None,
    ) -> bool:
        """Add IP to whitelist or blacklist"""
        try:
            await self.ip_list_collection.update_one(
                {"ip_address": ip_address, "list_type": list_type.value},
                {
                    "$set": {
                        "ip_address": ip_address,
                        "list_type": list_type.value,
                        "reason": reason,
                        "added_by": added_by,
                        "added_at": datetime.utcnow(),
                        "expires_at": expires_at,
                    }
                },
                upsert=True,
            )

            # Update cache
            if list_type == IPListType.WHITELIST:
                self._whitelist_cache.add(ip_address)
            else:
                self._blacklist_cache.add(ip_address)

            logger.info(f"Added {ip_address} to {list_type.value}")
            return True

        except Exception as e:
            logger.error(f"Failed to add IP to list: {e}")
            return False

    async def remove_from_ip_list(self, ip_address: str, list_type: IPListType) -> bool:
        """Remove IP from list"""
        try:
            await self.ip_list_collection.delete_one(
                {"ip_address": ip_address, "list_type": list_type.value}
            )

            # Update cache
            if list_type == IPListType.WHITELIST:
                self._whitelist_cache.discard(ip_address)
            else:
                self._blacklist_cache.discard(ip_address)

            return True
        except Exception as e:
            logger.error(f"Failed to remove IP from list: {e}")
            return False

    async def get_ip_lists(self) -> dict[str, list[dict[str, Any]]]:
        """Get all IP lists"""
        whitelist = []
        blacklist = []

        async for doc in self.ip_list_collection.find():
            entry = {
                "ip_address": doc["ip_address"],
                "reason": doc.get("reason"),
                "added_by": doc.get("added_by"),
                "added_at": doc.get("added_at"),
                "expires_at": doc.get("expires_at"),
            }
            if doc["list_type"] == IPListType.WHITELIST.value:
                whitelist.append(entry)
            else:
                blacklist.append(entry)

        return {"whitelist": whitelist, "blacklist": blacklist}

    # =========================================================================
    # BRUTE FORCE PROTECTION
    # =========================================================================

    async def record_login_attempt(
        self, username: str, ip_address: str, success: bool
    ) -> dict[str, Any]:
        """
        Record login attempt and check for lockout

        Returns:
            Dict with lockout status and remaining attempts
        """
        now = datetime.utcnow()

        # Get current lockout status
        lockout = await self.lockout_collection.find_one(
            {"username": username, "expires_at": {"$gt": now}}
        )

        if lockout:
            remaining = (lockout["expires_at"] - now).total_seconds()
            return {
                "locked": True,
                "reason": "Too many failed login attempts",
                "remaining_seconds": int(remaining),
                "attempts": lockout.get("attempts", 0),
            }

        if success:
            # Clear failed attempts on successful login
            await self.lockout_collection.delete_many({"username": username})
            return {"locked": False, "attempts": 0}

        # Record failed attempt
        result = await self.lockout_collection.find_one_and_update(
            {"username": username},
            {
                "$inc": {"attempts": 1},
                "$set": {"last_attempt": now, "last_ip": ip_address},
                "$push": {
                    "attempt_history": {
                        "$each": [{"timestamp": now, "ip": ip_address}],
                        "$slice": -10,  # Keep last 10 attempts
                    }
                },
            },
            upsert=True,
            return_document=True,
        )

        attempts = result.get("attempts", 1)

        if attempts >= self.max_login_attempts:
            # Lock the account
            await self.lockout_collection.update_one(
                {"username": username},
                {"$set": {"expires_at": now + self.lockout_duration}},
            )

            await self._log_security_event(
                "account_locked",
                ip_address,
                username=username,
                severity="warning",
                details={"attempts": attempts},
            )

            # Auto-blacklist IP if too many lockouts
            ip_lockouts = await self.lockout_collection.count_documents(
                {"last_ip": ip_address, "expires_at": {"$gt": now}}
            )

            if ip_lockouts >= 3:
                await self.add_to_ip_list(
                    ip_address,
                    IPListType.BLACKLIST,
                    reason="Automated: Multiple account lockouts",
                    expires_at=now + timedelta(hours=24),
                )

            return {
                "locked": True,
                "reason": "Account locked due to too many failed attempts",
                "remaining_seconds": int(self.lockout_duration.total_seconds()),
                "attempts": attempts,
            }

        return {
            "locked": False,
            "attempts": attempts,
            "remaining_attempts": self.max_login_attempts - attempts,
        }

    async def unlock_account(self, username: str, unlocked_by: str) -> bool:
        """Manually unlock an account"""
        try:
            await self.lockout_collection.delete_many({"username": username})

            await self._log_security_event(
                "account_unlocked",
                "",
                username=username,
                details={"unlocked_by": unlocked_by},
            )

            return True
        except Exception as e:
            logger.error(f"Failed to unlock account: {e}")
            return False

    async def get_locked_accounts(self) -> list[dict[str, Any]]:
        """Get all currently locked accounts"""
        now = datetime.utcnow()
        accounts = []

        async for doc in self.lockout_collection.find({"expires_at": {"$gt": now}}):
            accounts.append(
                {
                    "username": doc["username"],
                    "attempts": doc.get("attempts", 0),
                    "locked_at": doc.get("last_attempt"),
                    "expires_at": doc["expires_at"],
                    "last_ip": doc.get("last_ip"),
                }
            )

        return accounts

    # =========================================================================
    # SESSION MANAGEMENT
    # =========================================================================

    async def create_session(
        self,
        user_id: str,
        username: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        device_info: dict[str, Optional[Any]] = None,
    ) -> str:
        """Create a new session and enforce session limits"""
        now = datetime.utcnow()

        # Generate session ID
        session_id = hashlib.sha256(
            f"{user_id}{now.isoformat()}{ip_address}".encode()
        ).hexdigest()[:32]

        # Check concurrent session limit
        active_sessions = await self.session_collection.count_documents(
            {"user_id": user_id, "expires_at": {"$gt": now}}
        )

        if active_sessions >= self.max_concurrent_sessions:
            # Remove oldest session
            oldest = await self.session_collection.find_one(
                {"user_id": user_id, "expires_at": {"$gt": now}},
                sort=[("created_at", 1)],
            )
            if oldest:
                await self.session_collection.delete_one({"_id": oldest["_id"]})

        # Create new session
        await self.session_collection.insert_one(
            {
                "session_id": session_id,
                "user_id": user_id,
                "username": username,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "device_info": device_info,
                "created_at": now,
                "last_activity": now,
                "expires_at": now + self.session_timeout,
            }
        )

        return session_id

    async def validate_session(self, session_id: str) -> dict[str, Optional[Any]]:
        """Validate and refresh session"""
        now = datetime.utcnow()

        session = await self.session_collection.find_one_and_update(
            {"session_id": session_id, "expires_at": {"$gt": now}},
            {"$set": {"last_activity": now, "expires_at": now + self.session_timeout}},
            return_document=True,
        )

        if session:
            return {
                "user_id": session["user_id"],
                "username": session["username"],
                "created_at": session["created_at"],
                "ip_address": session["ip_address"],
            }

        return None

    async def terminate_session(self, session_id: str) -> bool:
        """Terminate a specific session"""
        result = await self.session_collection.delete_one({"session_id": session_id})
        return result.deleted_count > 0

    async def terminate_all_sessions(
        self, user_id: str, except_session: Optional[str] = None
    ) -> int:
        """Terminate all sessions for a user"""
        # Note: values in this query may be strings or nested dicts (e.g., {"$ne": ...})
        query: dict[str, Any] = {"user_id": user_id}
        if except_session:
            query["session_id"] = {"$ne": except_session}

        result = await self.session_collection.delete_many(query)
        return result.deleted_count

    async def get_user_sessions(self, user_id: str) -> list[dict[str, Any]]:
        """Get all active sessions for a user"""
        now = datetime.utcnow()
        sessions = []

        async for doc in self.session_collection.find(
            {"user_id": user_id, "expires_at": {"$gt": now}}
        ):
            sessions.append(
                {
                    "session_id": doc["session_id"],
                    "ip_address": doc["ip_address"],
                    "user_agent": doc.get("user_agent"),
                    "created_at": doc["created_at"],
                    "last_activity": doc["last_activity"],
                }
            )

        return sessions

    # =========================================================================
    # SECURITY EVENTS
    # =========================================================================

    async def _log_security_event(
        self,
        event_type: str,
        ip_address: str,
        username: Optional[str] = None,
        severity: str = "info",
        details: dict[str, Optional[Any]] = None,
    ):
        """Log a security event"""
        try:
            await self.events_collection.insert_one(
                {
                    "timestamp": datetime.utcnow(),
                    "event_type": event_type,
                    "ip_address": ip_address,
                    "username": username,
                    "severity": severity,
                    "details": details or {},
                }
            )
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")

    async def get_security_events(
        self,
        limit: int = 100,
        event_type: Optional[str] = None,
        severity: Optional[str] = None,
        start_date: Optional[datetime] = None,
    ) -> list[dict[str, Any]]:
        """Get recent security events"""
        query = {}
        if event_type:
            query["event_type"] = event_type
        if severity:
            query["severity"] = severity
        if start_date:
            query["timestamp"] = {"$gte": start_date}

        events = []
        async for doc in (
            self.events_collection.find(query).sort("timestamp", -1).limit(limit)
        ):
            doc["id"] = str(doc.pop("_id"))
            events.append(doc)

        return events

    async def get_security_summary(self) -> dict[str, Any]:
        """Get security status summary"""
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)

        return {
            "ip_filtering_enabled": self.enable_ip_filtering,
            "whitelisted_ips": len(self._whitelist_cache),
            "blacklisted_ips": len(self._blacklist_cache),
            "locked_accounts": await self.lockout_collection.count_documents(
                {"expires_at": {"$gt": now}}
            ),
            "active_sessions": await self.session_collection.count_documents(
                {"expires_at": {"$gt": now}}
            ),
            "security_events_24h": await self.events_collection.count_documents(
                {"timestamp": {"$gte": last_24h}}
            ),
            "settings": {
                "max_login_attempts": self.max_login_attempts,
                "lockout_duration_minutes": self.lockout_duration.total_seconds() / 60,
                "session_timeout_minutes": self.session_timeout.total_seconds() / 60,
                "max_concurrent_sessions": self.max_concurrent_sessions,
            },
        }
