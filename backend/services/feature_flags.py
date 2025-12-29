"""
Enterprise Feature Flags Service
Dynamic feature toggling for gradual rollouts and A/B testing
"""

import logging
from datetime import datetime
from enum import Enum
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class FeatureState(str, Enum):
    """Feature flag states"""

    ENABLED = "enabled"
    DISABLED = "disabled"
    PERCENTAGE = "percentage"  # Rollout percentage
    USERS = "users"  # Specific users only
    ROLES = "roles"  # Specific roles only


class FeatureFlag(BaseModel):
    """Feature flag definition"""

    key: str
    name: str
    description: Optional[str] = None
    state: FeatureState = FeatureState.DISABLED
    enabled: bool = False

    # Targeting
    percentage: int = Field(default=0, ge=0, le=100)
    allowed_users: list[str] = Field(default_factory=list)
    allowed_roles: list[str] = Field(default_factory=list)

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

    # Environment-specific
    environments: list[str] = Field(
        default_factory=lambda: ["development", "staging", "production"]
    )


class FeatureFlagService:
    """
    Enterprise feature flag service for:
    - Gradual feature rollouts
    - A/B testing
    - User/role targeting
    - Environment-specific features
    """

    def __init__(
        self,
        mongo_db: AsyncIOMotorDatabase,
        environment: str = "development",
        cache_ttl_seconds: int = 60,
    ):
        self.db = mongo_db
        self.collection = mongo_db.feature_flags
        self.environment = environment
        self.cache_ttl = cache_ttl_seconds

        # In-memory cache
        self._cache: dict[str, FeatureFlag] = {}
        self._cache_time: Optional[datetime] = None

    async def initialize(self):
        """Initialize indexes"""
        await self.collection.create_index("key", unique=True)
        await self.collection.create_index("state")
        await self._load_cache()
        logger.info("Feature flag service initialized")

    async def _load_cache(self):
        """Load flags into cache"""
        self._cache.clear()
        async for doc in self.collection.find():
            doc.pop("_id", None)
            try:
                flag = FeatureFlag(**doc)
                self._cache[flag.key] = flag
            except Exception as e:
                logger.error(f"Failed to load feature flag: {e}")
        self._cache_time = datetime.utcnow()

    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid"""
        if not self._cache_time:
            return False
        elapsed = (datetime.utcnow() - self._cache_time).total_seconds()
        return elapsed < self.cache_ttl

    async def is_enabled(
        self,
        key: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        role: Optional[str] = None,
    ) -> bool:
        """
        Check if a feature is enabled for a user/context

        Args:
            key: Feature flag key
            user_id: User ID for percentage rollout
            username: Username for user targeting
            role: User role for role targeting

        Returns:
            True if feature is enabled for this context
        """
        # Refresh cache if needed
        if not self._is_cache_valid():
            await self._load_cache()

        flag = self._cache.get(key)
        if not flag:
            return False

        # Check environment
        if self.environment not in flag.environments:
            return False

        # Check state
        if flag.state == FeatureState.DISABLED:
            return False

        if flag.state == FeatureState.ENABLED:
            return True

        if flag.state == FeatureState.USERS:
            return username in flag.allowed_users if username else False

        if flag.state == FeatureState.ROLES:
            return role in flag.allowed_roles if role else False

        if flag.state == FeatureState.PERCENTAGE:
            if not user_id:
                return False
            # Consistent hashing for user
            hash_value = hash(f"{key}:{user_id}") % 100
            return hash_value < flag.percentage

        return False

    async def create_flag(
        self,
        key: str,
        name: str,
        description: Optional[str] = None,
        created_by: Optional[str] = None,
        **kwargs,
    ) -> FeatureFlag:
        """Create a new feature flag"""
        flag = FeatureFlag(
            key=key, name=name, description=description, created_by=created_by, **kwargs
        )

        await self.collection.insert_one(flag.model_dump())
        self._cache[key] = flag

        logger.info(f"Feature flag created: {key}")
        return flag

    async def update_flag(
        self, key: str, updated_by: Optional[str] = None, **updates
    ) -> Optional[FeatureFlag]:
        """Update a feature flag"""
        updates["updated_at"] = datetime.utcnow()
        updates["updated_by"] = updated_by

        result = await self.collection.find_one_and_update(
            {"key": key}, {"$set": updates}, return_document=True
        )

        if result:
            result.pop("_id", None)
            flag = FeatureFlag(**result)
            self._cache[key] = flag
            logger.info(f"Feature flag updated: {key}")
            return flag

        return None

    async def delete_flag(self, key: str) -> bool:
        """Delete a feature flag"""
        result = await self.collection.delete_one({"key": key})
        self._cache.pop(key, None)

        if result.deleted_count > 0:
            logger.info(f"Feature flag deleted: {key}")
            return True
        return False

    async def get_flag(self, key: str) -> Optional[FeatureFlag]:
        """Get a feature flag by key"""
        if not self._is_cache_valid():
            await self._load_cache()
        return self._cache.get(key)

    async def get_all_flags(self) -> list[FeatureFlag]:
        """Get all feature flags"""
        if not self._is_cache_valid():
            await self._load_cache()
        return list(self._cache.values())

    async def enable_flag(self, key: str, updated_by: Optional[str] = None) -> bool:
        """Enable a feature flag globally"""
        result = await self.update_flag(
            key, state=FeatureState.ENABLED.value, enabled=True, updated_by=updated_by
        )
        return result is not None

    async def disable_flag(self, key: str, updated_by: Optional[str] = None) -> bool:
        """Disable a feature flag globally"""
        result = await self.update_flag(
            key, state=FeatureState.DISABLED.value, enabled=False, updated_by=updated_by
        )
        return result is not None

    async def set_rollout_percentage(
        self, key: str, percentage: int, updated_by: Optional[str] = None
    ) -> bool:
        """Set rollout percentage for gradual release"""
        if not 0 <= percentage <= 100:
            raise ValueError("Percentage must be between 0 and 100")

        result = await self.update_flag(
            key,
            state=FeatureState.PERCENTAGE.value,
            percentage=percentage,
            updated_by=updated_by,
        )
        return result is not None

    async def get_enabled_flags_for_user(
        self,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        role: Optional[str] = None,
    ) -> list[str]:
        """Get all enabled feature flags for a user"""
        enabled = []
        for key in self._cache:
            if await self.is_enabled(key, user_id, username, role):
                enabled.append(key)
        return enabled


# Default feature flags for enterprise features
DEFAULT_ENTERPRISE_FLAGS = [
    {
        "key": "enterprise.audit_logging",
        "name": "Enterprise Audit Logging",
        "description": "Enable comprehensive audit logging for compliance",
        "state": FeatureState.ENABLED.value,
    },
    {
        "key": "enterprise.ip_filtering",
        "name": "IP Whitelist/Blacklist",
        "description": "Enable IP-based access control",
        "state": FeatureState.DISABLED.value,
    },
    {
        "key": "enterprise.circuit_breaker",
        "name": "Circuit Breaker Pattern",
        "description": "Enable circuit breaker for external services",
        "state": FeatureState.ENABLED.value,
    },
    {
        "key": "enterprise.advanced_rate_limiting",
        "name": "Advanced Rate Limiting",
        "description": "Role-based rate limiting tiers",
        "state": FeatureState.ENABLED.value,
    },
    {
        "key": "enterprise.data_encryption",
        "name": "Field-Level Encryption",
        "description": "Encrypt sensitive fields at rest",
        "state": FeatureState.DISABLED.value,
    },
    {
        "key": "enterprise.session_management",
        "name": "Advanced Session Management",
        "description": "Concurrent session limits and tracking",
        "state": FeatureState.ENABLED.value,
    },
]
