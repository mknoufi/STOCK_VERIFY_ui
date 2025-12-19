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
            # Users collection indexes
            # Check for duplicate usernames first
            pipeline = [
                {"$group": {"_id": "$username", "count": {"$sum": 1}}},
                {"$match": {"count": {"$gt": 1}}},
            ]
            duplicates = await self.db.users.aggregate(pipeline).to_list(None)
            if duplicates:
                logger.warning(
                    f"Found {len(duplicates)} duplicate usernames, cleaning up..."
                )
                for dup in duplicates:
                    # Keep the first, remove the rest
                    users = await self.db.users.find({"username": dup["_id"]}).to_list(
                        None
                    )
                    if len(users) > 1:
                        # Keep the oldest one
                        to_keep = min(
                            users, key=lambda u: u.get("created_at", datetime.min)
                        )
                        to_remove = [u for u in users if u["_id"] != to_keep["_id"]]
                        for user in to_remove:
                            await self.db.users.delete_one({"_id": user["_id"]})
                        logger.info(
                            f"Removed {len(to_remove)} duplicate user(s) for username: {dup['_id']}"
                        )

            try:
                await self.db.users.create_index("username", unique=True)
            except Exception as e:
                if "IndexOptionsConflict" in str(e) or "already exists" in str(e):
                    logger.debug("Username index already exists, skipping")
                elif "E11000" in str(e) or "duplicate key" in str(e):
                    logger.warning(
                        f"Cannot create unique index on username, duplicates still exist: {str(e)}"
                    )
                else:
                    raise

            try:
                await self.db.users.create_index("role")
            except Exception as e:
                if "IndexOptionsConflict" in str(e) or "already exists" in str(e):
                    logger.debug("Role index already exists, skipping")
                else:
                    logger.warning(f"Error creating role index: {str(e)}")

            # Refresh tokens collection indexes
            try:
                await self.db.refresh_tokens.create_index("token", unique=True)
                await self.db.refresh_tokens.create_index("username")
                await self.db.refresh_tokens.create_index("expires_at")
                await self.db.refresh_tokens.create_index(
                    [("username", 1), ("revoked", 1)]
                )
                logger.info("✓ Refresh tokens indexes created")
            except Exception as e:
                if "IndexOptionsConflict" not in str(e) and "already exists" not in str(
                    e
                ):
                    logger.warning(f"Error creating refresh tokens indexes: {str(e)}")

            logger.info("✓ Users indexes created")

            # Sessions collection indexes
            try:
                await self.db.sessions.create_index("id", unique=True)
            except Exception as e:
                if "IndexOptionsConflict" not in str(e) and "already exists" not in str(
                    e
                ):
                    logger.warning(f"Error creating sessions id index: {str(e)}")
            await self.db.sessions.create_index("warehouse")
            await self.db.sessions.create_index("staff_user")
            await self.db.sessions.create_index("status")
            await self.db.sessions.create_index([("started_at", -1)])
            await self.db.sessions.create_index([("warehouse", 1), ("status", 1)])
            await self.db.sessions.create_index([("staff_user", 1), ("status", 1)])
            await self.db.sessions.create_index([("status", 1), ("started_at", -1)])

            # Additional performance indexes (recommended from CODEBASE_ANALYSIS.md)
            await self.db.sessions.create_index(
                [("created_at", -1)]
            )  # For date range queries
            await self.db.sessions.create_index(
                [("status", 1), ("created_at", -1)]
            )  # Compound for status + date
            logger.info("✓ Sessions indexes created")

            # Count lines collection indexes
            try:
                await self.db.count_lines.create_index("id", unique=True)
            except Exception as e:
                if "IndexOptionsConflict" not in str(e) and "already exists" not in str(
                    e
                ):
                    logger.warning(f"Error creating count_lines id index: {str(e)}")
            await self.db.count_lines.create_index("session_id")
            await self.db.count_lines.create_index("item_code")
            await self.db.count_lines.create_index(
                [("session_id", 1), ("item_code", 1)]
            )
            await self.db.count_lines.create_index(
                [("session_id", 1), ("counted_at", -1)]
            )
            await self.db.count_lines.create_index([("session_id", 1), ("status", 1)])
            await self.db.count_lines.create_index(
                [("item_code", 1), ("counted_at", -1)]
            )
            await self.db.count_lines.create_index("counted_by")
            await self.db.count_lines.create_index([("counted_at", -1)])
            await self.db.count_lines.create_index("status")

            # Additional performance indexes (recommended from CODEBASE_ANALYSIS.md)
            await self.db.count_lines.create_index(
                "verified"
            )  # For verification status filtering
            await self.db.count_lines.create_index(
                [("item_code", 1), ("verified", 1)]
            )  # Compound for item history
            await self.db.count_lines.create_index(
                [("verified", 1), ("counted_at", -1)]
            )  # For verified items query
            logger.info("✓ Count lines indexes created")

            # ERP items collection indexes (for caching)
            try:
                await self.db.erp_items.create_index("item_code", unique=True)
            except Exception as e:
                if "IndexOptionsConflict" not in str(e) and "already exists" not in str(
                    e
                ):
                    logger.warning(
                        f"Error creating erp_items item_code index: {str(e)}"
                    )
            await self.db.erp_items.create_index("barcode")
            await self.db.erp_items.create_index("warehouse")
            await self.db.erp_items.create_index("category")
            await self.db.erp_items.create_index("subcategory")
            await self.db.erp_items.create_index("floor")
            await self.db.erp_items.create_index("rack")
            await self.db.erp_items.create_index("uom_code")
            await self.db.erp_items.create_index("verified")
            await self.db.erp_items.create_index("verified_by")
            await self.db.erp_items.create_index([("verified_at", -1)])
            await self.db.erp_items.create_index([("last_scanned_at", -1)])
            await self.db.erp_items.create_index([("synced_at", -1)])
            await self.db.erp_items.create_index([("warehouse", 1), ("category", 1)])
            await self.db.erp_items.create_index([("barcode", 1), ("warehouse", 1)])
            await self.db.erp_items.create_index([("floor", 1), ("rack", 1)])
            await self.db.erp_items.create_index([("verified", 1), ("verified_at", -1)])
            await self.db.erp_items.create_index([("category", 1), ("subcategory", 1)])

            # Additional performance indexes (recommended from CODEBASE_ANALYSIS.md)
            await self.db.erp_items.create_index(
                "data_complete"
            )  # For incomplete items query
            await self.db.erp_items.create_index(
                [("last_synced", -1)]
            )  # For sync status queries
            await self.db.erp_items.create_index(
                [("warehouse", 1), ("data_complete", 1)]
            )  # Compound for filtering
            await self.db.erp_items.create_index(
                [("category", 1), ("data_complete", 1)]
            )  # Compound for filtering
            # Text index for full-text search (MongoDB requires special syntax)
            # Check if text index already exists before creating
            try:
                existing_indexes = await self.db.erp_items.list_indexes().to_list(
                    length=100
                )
                has_text_index = any(
                    idx.get("key", {}).get("_fts") is not None
                    for idx in existing_indexes
                )
                if not has_text_index:
                    # Create simple text index on item_name (MongoDB only allows one text index per collection)
                    await self.db.erp_items.create_index([("item_name", "text")])
                    logger.info("✓ Text index created on item_name")
                else:
                    logger.info("✓ Text index already exists, skipping")
            except Exception as e:
                logger.warning(f"Text index check/creation failed: {str(e)}")
            logger.info("✓ ERP items indexes created")

            # Item variances collection indexes
            try:
                await self.db.item_variances.create_index("item_code")
                await self.db.item_variances.create_index("verified_by")
                await self.db.item_variances.create_index([("verified_at", -1)])
                await self.db.item_variances.create_index(
                    [("category", 1), ("floor", 1)]
                )
                await self.db.item_variances.create_index(
                    [("warehouse", 1), ("verified_at", -1)]
                )
                logger.info("✓ Item variances indexes created")
            except Exception as e:
                logger.warning(f"Error creating item variances indexes: {str(e)}")

            # ERP config collection indexes
            # Note: _id is already unique by default in MongoDB, can't add unique again
            await self.db.erp_config.create_index([("_id", 1)])
            logger.info("✓ ERP config indexes created")

            # Sync metadata collection indexes
            # Note: _id is already unique by default in MongoDB, can't add unique again
            await self.db.erp_sync_metadata.create_index("_id")
            logger.info("✓ Sync metadata indexes created")

            # Activity logs collection indexes (recommended from CODEBASE_ANALYSIS.md)
            try:
                await self.db.activity_logs.create_index(
                    [("created_at", -1)]
                )  # For time-based queries
                await self.db.activity_logs.create_index(
                    "user_id"
                )  # For user activity queries
                await self.db.activity_logs.create_index(
                    [("user_id", 1), ("created_at", -1)]
                )  # Compound index
                await self.db.activity_logs.create_index(
                    "action"
                )  # For action filtering
                logger.info("✓ Activity logs indexes created")
            except Exception as e:
                logger.warning(f"Error creating activity logs indexes: {str(e)}")

            logger.info("All database indexes created successfully")

        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
            raise

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
