"""
Database Migrations - MongoDB schema migrations
Handles database schema updates and indexing
"""

import logging
from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class MigrationManager:
    """Manages database schema migrations"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.migrations_collection = "migrations"

    async def ensure_indexes(self):
        """Create database indexes for performance"""
        logger.info("Creating database indexes...")

        try:
            await self._ensure_users_indexes()
            await self._ensure_refresh_tokens_indexes()
            await self._ensure_sessions_indexes()
            await self._ensure_count_lines_indexes()
            await self._ensure_erp_items_indexes()
            await self._ensure_misc_indexes()
            logger.info("All database indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
            raise

    async def _ensure_users_indexes(self) -> None:
        """Create indexes for users collection."""
        # Check for duplicate usernames first
        pipeline: list[dict[str, Any]] = [
            {"$group": {"_id": "$username", "count": {"$sum": 1}}},
            {"$match": {"count": {"$gt": 1}}},
        ]
        duplicates = await self.db.users.aggregate(pipeline).to_list(None)
        if duplicates:
            logger.warning(
                f"Found {len(duplicates)} duplicate usernames, cleaning up..."
            )
            for dup in duplicates:
                await self._cleanup_duplicate_users(dup["_id"])

        await self._create_index_safe(
            self.db.users, "username", unique=True, name="users.username"
        )
        await self._create_index_safe(self.db.users, "role", name="users.role")
        logger.info("✓ Users indexes created")

    async def _cleanup_duplicate_users(self, username: str) -> None:
        """Remove duplicate users, keeping the oldest one."""
        users = await self.db.users.find({"username": username}).to_list(None)
        if len(users) > 1:
            to_keep = min(users, key=lambda u: u.get("created_at", datetime.min))
            to_remove = [u for u in users if u["_id"] != to_keep["_id"]]
            for user in to_remove:
                await self.db.users.delete_one({"_id": user["_id"]})
            logger.info(
                f"Removed {len(to_remove)} duplicate user(s) for username: {username}"
            )

    async def _ensure_refresh_tokens_indexes(self) -> None:
        """Create indexes for refresh_tokens collection."""
        try:
            await self.db.refresh_tokens.create_index("token", unique=True)
            await self.db.refresh_tokens.create_index("username")
            await self.db.refresh_tokens.create_index("expires_at")
            await self.db.refresh_tokens.create_index([("username", 1), ("revoked", 1)])
            logger.info("✓ Refresh tokens indexes created")
        except Exception as e:
            if "IndexOptionsConflict" not in str(e) and "already exists" not in str(e):
                logger.warning(f"Error creating refresh tokens indexes: {str(e)}")

    async def _ensure_sessions_indexes(self) -> None:
        """Create indexes for sessions collection."""
        await self._create_index_safe(
            self.db.sessions, "id", unique=True, name="sessions.id"
        )
        simple_indexes = ["warehouse", "staff_user", "status"]
        for field in simple_indexes:
            await self.db.sessions.create_index(field)

        compound_indexes = [
            [("started_at", -1)],
            [("warehouse", 1), ("status", 1)],
            [("staff_user", 1), ("status", 1)],
            [("status", 1), ("started_at", -1)],
            [("created_at", -1)],
            [("status", 1), ("created_at", -1)],
        ]
        for idx in compound_indexes:
            await self.db.sessions.create_index(idx)
        logger.info("✓ Sessions indexes created")

    async def _ensure_count_lines_indexes(self) -> None:
        """Create indexes for count_lines collection."""
        await self._create_index_safe(
            self.db.count_lines, "id", unique=True, name="count_lines.id"
        )
        simple_indexes = ["session_id", "item_code", "counted_by", "status", "verified"]
        for field in simple_indexes:
            await self.db.count_lines.create_index(field)

        compound_indexes = [
            [("session_id", 1), ("item_code", 1)],
            [("session_id", 1), ("counted_at", -1)],
            [("session_id", 1), ("status", 1)],
            [("item_code", 1), ("counted_at", -1)],
            [("counted_at", -1)],
            [("item_code", 1), ("verified", 1)],
            [("verified", 1), ("counted_at", -1)],
        ]
        for idx in compound_indexes:
            await self.db.count_lines.create_index(idx)
        logger.info("✓ Count lines indexes created")

    async def _ensure_erp_items_indexes(self) -> None:
        """Create indexes for erp_items collection."""
        await self._create_index_safe(
            self.db.erp_items, "item_code", unique=True, name="erp_items.item_code"
        )

        simple_indexes = [
            "barcode",
            "warehouse",
            "category",
            "subcategory",
            "floor",
            "rack",
            "uom_code",
            "verified",
            "verified_by",
            "data_complete",
        ]
        for field in simple_indexes:
            await self.db.erp_items.create_index(field)

        compound_indexes = [
            [("verified_at", -1)],
            [("last_scanned_at", -1)],
            [("synced_at", -1)],
            [("last_synced", -1)],
            [("warehouse", 1), ("category", 1)],
            [("barcode", 1), ("warehouse", 1)],
            [("floor", 1), ("rack", 1)],
            [("verified", 1), ("verified_at", -1)],
            [("category", 1), ("subcategory", 1)],
            [("warehouse", 1), ("data_complete", 1)],
            [("category", 1), ("data_complete", 1)],
        ]
        for idx in compound_indexes:
            await self.db.erp_items.create_index(idx)

        await self._ensure_text_index()
        logger.info("✓ ERP items indexes created")

    async def _ensure_text_index(self) -> None:
        """Create text index on item_name if not exists."""
        try:
            existing_indexes = await self.db.erp_items.list_indexes().to_list(
                length=100
            )
            has_text_index = any(
                idx.get("key", {}).get("_fts") is not None for idx in existing_indexes
            )
            if not has_text_index:
                await self.db.erp_items.create_index([("item_name", "text")])
                logger.info("✓ Text index created on item_name")
            else:
                logger.info("✓ Text index already exists, skipping")
        except Exception as e:
            logger.warning(f"Text index check/creation failed: {str(e)}")

    async def _ensure_misc_indexes(self) -> None:
        """Create indexes for miscellaneous collections."""
        # Item variances
        try:
            await self.db.item_variances.create_index("item_code")
            await self.db.item_variances.create_index("verified_by")
            await self.db.item_variances.create_index([("verified_at", -1)])
            await self.db.item_variances.create_index([("category", 1), ("floor", 1)])
            await self.db.item_variances.create_index(
                [("warehouse", 1), ("verified_at", -1)]
            )
            logger.info("✓ Item variances indexes created")
        except Exception as e:
            logger.warning(f"Error creating item variances indexes: {str(e)}")

        # ERP config and sync metadata
        await self.db.erp_config.create_index([("_id", 1)])
        logger.info("✓ ERP config indexes created")

        await self.db.erp_sync_metadata.create_index("_id")
        logger.info("✓ Sync metadata indexes created")

        # Activity logs
        try:
            await self.db.activity_logs.create_index([("created_at", -1)])
            await self.db.activity_logs.create_index("user_id")
            await self.db.activity_logs.create_index(
                [("user_id", 1), ("created_at", -1)]
            )
            await self.db.activity_logs.create_index("action")
            logger.info("✓ Activity logs indexes created")
        except Exception as e:
            logger.warning(f"Error creating activity logs indexes: {str(e)}")

    async def _create_index_safe(
        self,
        collection: Any,
        key: str,
        unique: bool = False,
        name: str = "",
    ) -> None:
        """Create an index with safe error handling for duplicates."""
        try:
            await collection.create_index(key, unique=unique)
        except Exception as e:
            err_str = str(e)
            if "IndexOptionsConflict" in err_str or "already exists" in err_str:
                logger.debug(f"{name or key} index already exists, skipping")
            elif "E11000" in err_str or "duplicate key" in err_str:
                logger.warning(
                    f"Cannot create unique index on {name or key}, duplicates exist: {err_str}"
                )
            else:
                logger.warning(f"Error creating {name or key} index: {err_str}")

    async def run_migrations(self):
        """Run all pending migrations"""
        logger.info("Checking for pending migrations...")

        # Get all migrations
        pending = await self._get_pending_migrations()

        if not pending:
            logger.info("No pending migrations")
            return

        logger.info(f"Running {len(pending)} migration(s)...")

        for migration in pending:
            try:
                await self._run_migration(migration)
                await self._mark_migration_complete(migration["name"])
                logger.info(f"✓ Migration {migration['name']} completed")
            except Exception as e:
                logger.error(f"✗ Migration {migration['name']} failed: {str(e)}")
                raise

    async def _get_pending_migrations(self) -> list[dict[str, Any]]:
        """Get list of pending migrations"""
        all_migrations = [
            {
                "name": "create_indexes_v1",
                "version": 1,
                "description": "Create initial database indexes",
                "func": self.ensure_indexes,
            },
            # Add more migrations here as needed
        ]

        # Get completed migrations
        completed = await self.db[self.migrations_collection].find({}).to_list(1000)
        completed_names = {m["name"] for m in completed}

        # Filter pending
        pending = [m for m in all_migrations if m["name"] not in completed_names]

        return sorted(pending, key=lambda x: x["version"])

    async def _run_migration(self, migration: dict[str, Any]):
        """Run a single migration"""
        logger.info(f"Running migration: {migration['name']}")
        await migration["func"]()

    async def _mark_migration_complete(self, migration_name: str):
        """Mark migration as completed"""
        await self.db[self.migrations_collection].insert_one(
            {
                "name": migration_name,
                "completed_at": datetime.utcnow(),
            }
        )
