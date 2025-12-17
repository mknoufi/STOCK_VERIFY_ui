"""
Snapshot Engine - Save and manage report snapshots
Enables point-in-time reporting and comparisons
"""

import logging
import time
from typing import Any, Dict, List, Optional

from backend.services.reporting.query_builder import QueryBuilder

logger = logging.getLogger(__name__)


class SnapshotEngine:
    """
    Create and manage report snapshots
    """

    def __init__(self, db):
        self.db = db
        self.query_builder = QueryBuilder()

    async def create_snapshot(
        self,
        name: str,
        description: str,
        query_spec: Dict[str, Any],
        created_by: str,
        snapshot_type: str = "custom",
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Create a new snapshot from query

        Args:
            name: Snapshot name
            description: Snapshot description
            query_spec: Query specification
            created_by: User who created snapshot
            snapshot_type: Type (custom, scheduled, comparison)
            tags: Optional tags for categorization

        Returns:
            Snapshot document
        """
        # Build pipeline
        collection = query_spec.get("collection")
        filters = query_spec.get("filters")
        group_by = query_spec.get("group_by")
        aggregations = query_spec.get("aggregations")
        sort = query_spec.get("sort")
        limit = query_spec.get("limit")

        pipeline = self.query_builder.build_pipeline(
            collection=collection,
            filters=filters,
            group_by=group_by,
            aggregations=aggregations,
            sort=sort,
            limit=limit,
        )

        # Execute query
        start_time = time.time()
        cursor = self.db[collection].aggregate(pipeline)
        results = await cursor.to_list(length=10000)
        execution_time = (time.time() - start_time) * 1000

        # Calculate summary statistics
        summary = self._calculate_summary(results, aggregations)

        # Generate snapshot ID and hash
        snapshot_id = f"snapshot_{int(time.time())}_{created_by}"
        query_hash = self.query_builder.generate_query_hash(query_spec)

        # Create snapshot document
        snapshot = {
            "snapshot_id": snapshot_id,
            "name": name,
            "description": description,
            "snapshot_type": snapshot_type,
            "query_spec": query_spec,
            "query_hash": query_hash,
            "collection": collection,
            "summary": summary,
            "row_count": len(results),
            "row_data": results,
            "execution_time_ms": execution_time,
            "created_by": created_by,
            "created_at": time.time(),
            "tags": tags or [],
        }

        # Save to database
        await self.db.report_snapshots.insert_one(snapshot)

        logger.info(
            f"✓ Snapshot created: {snapshot_id} ({len(results)} rows, {execution_time:.2f}ms)"
        )

        # Return without row_data for response (too large)
        snapshot_response = {**snapshot}
        snapshot_response["row_data"] = f"[{len(results)} rows]"

        return snapshot_response

    async def get_snapshot(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        """Get snapshot by ID"""
        snapshot = await self.db.report_snapshots.find_one({"snapshot_id": snapshot_id})
        return snapshot

    async def list_snapshots(
        self,
        created_by: Optional[str] = None,
        snapshot_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        List snapshots with filters

        Args:
            created_by: Filter by creator
            snapshot_type: Filter by type
            tags: Filter by tags
            limit: Max results
        """
        query = {}

        if created_by:
            query["created_by"] = created_by

        if snapshot_type:
            query["snapshot_type"] = snapshot_type

        if tags:
            query["tags"] = {"$in": tags}

        # Get snapshots (without row_data for performance)
        cursor = (
            self.db.report_snapshots.find(
                query,
                {"row_data": 0},  # Exclude large row data
            )
            .sort("created_at", -1)
            .limit(limit)
        )

        snapshots = await cursor.to_list(length=limit)
        return snapshots

    async def delete_snapshot(self, snapshot_id: str, user_id: str) -> bool:
        """
        Delete snapshot (only creator or admin can delete)
        """
        snapshot = await self.get_snapshot(snapshot_id)

        if not snapshot:
            return False

        # Check permissions (simplified - extend with role check)
        if snapshot["created_by"] != user_id:
            raise PermissionError("Only snapshot creator can delete")

        result = await self.db.report_snapshots.delete_one({"snapshot_id": snapshot_id})

        if result.deleted_count > 0:
            logger.info(f"✓ Snapshot deleted: {snapshot_id}")
            return True

        return False

    async def get_snapshot_data(
        self, snapshot_id: str, skip: int = 0, limit: int = 100
    ) -> Dict[str, Any]:
        """
        Get snapshot data with pagination
        """
        snapshot = await self.db.report_snapshots.find_one({"snapshot_id": snapshot_id})

        if not snapshot:
            return None

        # Paginate row_data
        row_data = snapshot.get("row_data", [])
        paginated_data = row_data[skip : skip + limit]

        return {
            "snapshot_id": snapshot_id,
            "name": snapshot["name"],
            "summary": snapshot["summary"],
            "row_count": len(row_data),
            "rows": paginated_data,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": len(row_data),
                "has_more": (skip + limit) < len(row_data),
            },
        }

    def _calculate_summary(
        self, results: List[Dict], aggregations: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Calculate summary statistics from results
        """
        if not results:
            return {"total_rows": 0}

        summary = {"total_rows": len(results)}

        # If aggregations were used, extract totals
        if aggregations:
            for field, func in aggregations.items():
                agg_field = f"{field}_{func}"

                if func == "sum":
                    total = sum(r.get(agg_field, 0) for r in results)
                    summary[f"total_{field}"] = total
                elif func == "avg":
                    values = [r.get(agg_field, 0) for r in results if agg_field in r]
                    summary[f"avg_{field}"] = sum(values) / len(values) if values else 0
                elif func == "count":
                    total = sum(r.get(agg_field, 0) for r in results)
                    summary[f"total_{field}"] = total

        return summary

    async def refresh_snapshot(self, snapshot_id: str) -> Dict[str, Any]:
        """
        Refresh snapshot with latest data using same query
        """
        snapshot = await self.get_snapshot(snapshot_id)

        if not snapshot:
            raise ValueError(f"Snapshot {snapshot_id} not found")

        # Re-run query
        query_spec = snapshot["query_spec"]

        # Create new snapshot with same spec
        new_snapshot = await self.create_snapshot(
            name=f"{snapshot['name']} (Refreshed)",
            description=f"Refreshed from {snapshot_id}",
            query_spec=query_spec,
            created_by=snapshot["created_by"],
            snapshot_type="refreshed",
            tags=snapshot.get("tags", []),
        )

        return new_snapshot
