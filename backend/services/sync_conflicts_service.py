"""
Sync Conflicts Service
Detect and resolve synchronization conflicts between local and server data
"""

import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)


class ConflictStatus(str, Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    IGNORED = "ignored"


class ConflictResolution(str, Enum):
    ACCEPT_SERVER = "accept_server"
    ACCEPT_LOCAL = "accept_local"
    MERGE = "merge"
    IGNORE = "ignore"


class SyncConflictsService:
    """Service for managing synchronization conflicts"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def detect_conflict(
        self,
        entity_type: str,  # "session", "count_line", "item"
        entity_id: str,
        local_data: Dict[str, Any],
        server_data: Dict[str, Any],
        user: str,
        session_id: Optional[str] = None,
    ) -> Optional[str]:
        """
        Detect conflict between local and server data
        Returns conflict_id if conflict detected, None otherwise
        """
        # Check for conflicting changes
        conflicts = [
            {
                "field": key,
                "local_value": local_data[key],
                "server_value": server_data[key],
            }
            for key in local_data
            if key in server_data and local_data[key] != server_data[key]
        ]

        # If no conflicts, return None
        if not conflicts:
            return None

        # Create conflict record
        conflict_doc = {
            "entity_type": entity_type,
            "entity_id": entity_id,
            "session_id": session_id,
            "user": user,
            "conflicts": conflicts,
            "local_data": local_data,
            "server_data": server_data,
            "status": ConflictStatus.PENDING.value,
            "resolution": None,
            "resolved_by": None,
            "resolved_at": None,
            "created_at": datetime.now(timezone.utc),
            "local_timestamp": local_data.get("updated_at") or local_data.get("created_at"),
            "server_timestamp": server_data.get("updated_at") or server_data.get("created_at"),
        }

        result = await self.db.sync_conflicts.insert_one(conflict_doc)
        conflict_id = str(result.inserted_id)

        logger.warning(
            f"Sync conflict detected for {entity_type} {entity_id}: "
            f"{len(conflicts)} field(s) differ"
        )

        return conflict_id

    async def get_conflicts(
        self,
        status: Optional[ConflictStatus] = None,
        session_id: Optional[str] = None,
        user: Optional[str] = None,
        entity_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get conflicts with optional filters"""
        query = {}

        if status:
            query["status"] = status.value
        if session_id:
            query["session_id"] = session_id
        if user:
            query["user"] = user
        if entity_type:
            query["entity_type"] = entity_type

        cursor = self.db.sync_conflicts.find(query).sort("created_at", -1).limit(limit)
        conflicts = await cursor.to_list(length=limit)

        # Convert ObjectId to string
        for conflict in conflicts:
            conflict["id"] = str(conflict.pop("_id"))

        return conflicts

    async def get_conflict_by_id(self, conflict_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific conflict by ID"""
        conflict = await self.db.sync_conflicts.find_one({"_id": ObjectId(conflict_id)})

        if conflict:
            conflict["id"] = str(conflict.pop("_id"))

        return conflict

    async def resolve_conflict(
        self,
        conflict_id: str,
        resolution: ConflictResolution,
        resolved_by: str,
        merged_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Resolve a sync conflict
        Returns the resolved data to be applied
        """
        conflict = await self.get_conflict_by_id(conflict_id)

        if not conflict:
            raise ValueError(f"Conflict {conflict_id} not found")

        if conflict["status"] != ConflictStatus.PENDING.value:
            raise ValueError(f"Conflict {conflict_id} already resolved")

        # Determine resolved data based on resolution strategy
        if resolution == ConflictResolution.ACCEPT_SERVER:
            resolved_data = conflict["server_data"]
        elif resolution == ConflictResolution.ACCEPT_LOCAL:
            resolved_data = conflict["local_data"]
        elif resolution == ConflictResolution.MERGE:
            if not merged_data:
                raise ValueError("Merged data required for MERGE resolution")
            resolved_data = merged_data
        elif resolution == ConflictResolution.IGNORE:
            resolved_data = None
        else:
            raise ValueError(f"Unknown resolution: {resolution}")

        # Update conflict record
        await self.db.sync_conflicts.update_one(
            {"_id": ObjectId(conflict_id)},
            {
                "$set": {
                    "status": (
                        ConflictStatus.RESOLVED.value
                        if resolution != ConflictResolution.IGNORE
                        else ConflictStatus.IGNORED.value
                    ),
                    "resolution": resolution.value,
                    "resolved_by": resolved_by,
                    "resolved_at": datetime.now(timezone.utc),
                    "resolved_data": resolved_data,
                }
            },
        )

        # Apply resolved data to entity if not ignored
        if resolution != ConflictResolution.IGNORE and resolved_data:
            await self._apply_resolved_data(
                conflict["entity_type"], conflict["entity_id"], resolved_data
            )

        logger.info(f"Conflict {conflict_id} resolved with {resolution.value} by {resolved_by}")

        return {
            "conflict_id": conflict_id,
            "resolution": resolution.value,
            "resolved_data": resolved_data,
        }

    async def _apply_resolved_data(self, entity_type: str, entity_id: str, data: Dict[str, Any]):
        """Apply resolved data to the entity"""
        # Determine collection based on entity type
        if entity_type == "session":
            collection = self.db.sessions
        elif entity_type == "count_line":
            collection = self.db.count_lines
        elif entity_type == "item":
            collection = self.db.erp_items
        else:
            logger.error(f"Unknown entity type for conflict resolution: {entity_type}")
            return

        # Update entity with resolved data
        data["updated_at"] = datetime.now(timezone.utc)
        data["conflict_resolved"] = True

        try:
            await collection.update_one({"_id": ObjectId(entity_id)}, {"$set": data})
            logger.info(f"Applied resolved data to {entity_type} {entity_id}")
        except PyMongoError as e:
            logger.error(f"Failed to apply resolved data: {str(e)}")
            raise

    async def auto_resolve_simple_conflicts(
        self,
        strategy: str = "server_wins",  # "server_wins", "local_wins", "newest_wins"
    ) -> int:
        """
        Auto-resolve simple conflicts based on strategy
        Returns number of conflicts resolved
        """
        # Get pending conflicts
        conflicts = await self.get_conflicts(status=ConflictStatus.PENDING)

        resolved_count = 0

        for conflict in conflicts:
            try:
                if await self._resolve_single_conflict(conflict, strategy):
                    resolved_count += 1
            except (PyMongoError, ValueError) as e:
                logger.error(f"Failed to auto-resolve conflict {conflict['id']}: {str(e)}")
                continue

        logger.info(f"Auto-resolved {resolved_count} conflicts using '{strategy}' strategy")

        return resolved_count

    async def _resolve_single_conflict(self, conflict: Dict[str, Any], strategy: str) -> bool:
        """Helper to resolve a single conflict based on strategy"""
        # Determine resolution based on strategy
        if strategy == "server_wins":
            resolution = ConflictResolution.ACCEPT_SERVER
        elif strategy == "local_wins":
            resolution = ConflictResolution.ACCEPT_LOCAL
        elif strategy == "newest_wins":
            resolution = self._determine_newest_wins_resolution(conflict)
        else:
            return False

        # Resolve conflict
        await self.resolve_conflict(conflict["id"], resolution, "system_auto_resolve")
        return True

    def _determine_newest_wins_resolution(self, conflict: Dict[str, Any]) -> ConflictResolution:
        """Determine resolution based on timestamps"""
        local_ts = conflict.get("local_timestamp")
        server_ts = conflict.get("server_timestamp")

        if local_ts and server_ts:
            if isinstance(local_ts, str):
                local_ts = datetime.fromisoformat(local_ts.replace("Z", "+00:00"))
            if isinstance(server_ts, str):
                server_ts = datetime.fromisoformat(server_ts.replace("Z", "+00:00"))

            return (
                ConflictResolution.ACCEPT_LOCAL
                if local_ts > server_ts
                else ConflictResolution.ACCEPT_SERVER
            )
        
        return ConflictResolution.ACCEPT_SERVER

    async def get_conflict_stats(self) -> Dict[str, Any]:
        """Get statistics about sync conflicts"""
        total = await self.db.sync_conflicts.count_documents({})
        pending = await self.db.sync_conflicts.count_documents(
            {"status": ConflictStatus.PENDING.value}
        )
        resolved = await self.db.sync_conflicts.count_documents(
            {"status": ConflictStatus.RESOLVED.value}
        )
        ignored = await self.db.sync_conflicts.count_documents(
            {"status": ConflictStatus.IGNORED.value}
        )

        # Get conflicts by entity type
        pipeline = [{"$group": {"_id": "$entity_type", "count": {"$sum": 1}}}]

        by_entity_type = {}
        async for result in self.db.sync_conflicts.aggregate(pipeline):
            by_entity_type[result["_id"]] = result["count"]

        return {
            "total": total,
            "pending": pending,
            "resolved": resolved,
            "ignored": ignored,
            "by_entity_type": by_entity_type,
        }
