"""
Compare Engine - Compare two snapshots
Identifies differences, trends, and changes
"""

import logging
import time
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class CompareEngine:
    """
    Compare two snapshots and generate diff report
    """

    def __init__(self, db):
        self.db = db

    async def compare_snapshots(
        self,
        snapshot_a_id: str,
        snapshot_b_id: str,
        created_by: str,
        comparison_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Compare two snapshots

        Args:
            snapshot_a_id: First snapshot ID (baseline)
            snapshot_b_id: Second snapshot ID (comparison)
            created_by: User performing comparison
            comparison_name: Optional name for comparison

        Returns:
            Comparison report
        """
        # Get snapshots
        snapshot_a = await self.db.report_snapshots.find_one({"snapshot_id": snapshot_a_id})
        snapshot_b = await self.db.report_snapshots.find_one({"snapshot_id": snapshot_b_id})

        if not snapshot_a:
            raise ValueError(f"Snapshot {snapshot_a_id} not found")
        if not snapshot_b:
            raise ValueError(f"Snapshot {snapshot_b_id} not found")

        # Verify compatible snapshots (same collection and group_by)
        if snapshot_a["collection"] != snapshot_b["collection"]:
            raise ValueError("Snapshots must be from the same collection")

        # Perform comparison
        start_time = time.time()

        comparison = {
            "summary_diff": self._compare_summaries(snapshot_a["summary"], snapshot_b["summary"]),
            "row_diff": self._compare_rows(
                snapshot_a.get("row_data", []),
                snapshot_b.get("row_data", []),
                snapshot_a.get("query_spec", {}).get("group_by", []),
            ),
            "metadata": {
                "snapshot_a": {
                    "id": snapshot_a_id,
                    "name": snapshot_a["name"],
                    "created_at": snapshot_a["created_at"],
                },
                "snapshot_b": {
                    "id": snapshot_b_id,
                    "name": snapshot_b["name"],
                    "created_at": snapshot_b["created_at"],
                },
            },
        }

        execution_time = (time.time() - start_time) * 1000

        # Create comparison job document
        job_id = f"compare_{int(time.time())}_{created_by}"

        comparison_job = {
            "job_id": job_id,
            "name": comparison_name or f"Compare {snapshot_a_id} vs {snapshot_b_id}",
            "snapshot_a_id": snapshot_a_id,
            "snapshot_b_id": snapshot_b_id,
            "comparison_result": comparison,
            "execution_time_ms": execution_time,
            "created_by": created_by,
            "created_at": time.time(),
            "status": "completed",
        }

        # Save comparison job
        await self.db.report_compare_jobs.insert_one(comparison_job)

        logger.info(f"✓ Comparison created: {job_id} ({execution_time:.2f}ms)")

        return comparison_job

    def _compare_summaries(
        self, summary_a: Dict[str, Any], summary_b: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compare summary statistics
        """
        diff = {}

        # Get all keys
        all_keys = set(summary_a.keys()) | set(summary_b.keys())

        for key in all_keys:
            value_a = summary_a.get(key, 0)
            value_b = summary_b.get(key, 0)

            # Calculate difference
            if isinstance(value_a, (int, float)) and isinstance(value_b, (int, float)):
                absolute_diff = value_b - value_a
                # Safe percentage calculation with zero-division protection
                if value_a == 0:
                    percent_diff = 0.0 if value_b == 0 else 100.0
                else:
                    percent_diff = ((value_b - value_a) / abs(value_a)) * 100

                diff[key] = {
                    "baseline": value_a,
                    "comparison": value_b,
                    "absolute_diff": absolute_diff,
                    "percent_diff": round(percent_diff, 2),
                    "trend": (
                        "up" if absolute_diff > 0 else "down" if absolute_diff < 0 else "stable"
                    ),
                }
            else:
                diff[key] = {
                    "baseline": value_a,
                    "comparison": value_b,
                    "changed": value_a != value_b,
                }

        return diff

    def _compare_rows(
        self, rows_a: List[Dict], rows_b: List[Dict], group_by: List[str]
    ) -> Dict[str, Any]:
        """
        Compare row-level data
        """
        # Create lookup dictionaries
        lookup_a = self._create_row_lookup(rows_a, group_by)
        lookup_b = self._create_row_lookup(rows_b, group_by)

        # Find differences
        added = []
        removed = []
        changed = []

        # Check for added and changed
        for key, row_b in lookup_b.items():
            if key not in lookup_a:
                added.append(row_b)
            else:
                row_a = lookup_a[key]
                if row_a != row_b:
                    changed.append(
                        {
                            "key": key,
                            "baseline": row_a,
                            "comparison": row_b,
                            "diff": self._calculate_row_diff(row_a, row_b),
                        }
                    )

        # Check for removed
        for key, row_a in lookup_a.items():
            if key not in lookup_b:
                removed.append(row_a)

        return {
            "added_count": len(added),
            "removed_count": len(removed),
            "changed_count": len(changed),
            "unchanged_count": len(lookup_a) - len(removed) - len(changed),
            "added": added[:100],  # Limit to first 100
            "removed": removed[:100],
            "changed": changed[:100],
        }

    def _create_row_lookup(self, rows: List[Dict], group_by: List[str]) -> Dict[str, Dict]:
        """
        Create lookup dictionary keyed by group_by fields
        """
        lookup = {}

        for row in rows:
            # Create key from group_by fields
            if group_by:
                if "_id" in row and isinstance(row["_id"], dict):
                    # Grouped data
                    key_parts = [str(row["_id"].get(field, "")) for field in group_by]
                else:
                    # Ungrouped data
                    key_parts = [str(row.get(field, "")) for field in group_by]

                key = "|".join(key_parts)
            else:
                # No grouping, use entire row as key
                key = str(row)

            lookup[key] = row

        return lookup

    def _calculate_row_diff(self, row_a: Dict, row_b: Dict) -> Dict[str, Any]:
        """
        Calculate differences between two rows
        """
        diff = {}

        all_keys = set(row_a.keys()) | set(row_b.keys())

        for key in all_keys:
            value_a = row_a.get(key)
            value_b = row_b.get(key)

            if value_a != value_b:
                if isinstance(value_a, (int, float)) and isinstance(value_b, (int, float)):
                    diff[key] = {
                        "from": value_a,
                        "to": value_b,
                        "change": value_b - value_a,
                    }
                else:
                    diff[key] = {"from": value_a, "to": value_b}

        return diff

    async def get_comparison(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get comparison job by ID"""
        job = await self.db.report_compare_jobs.find_one({"job_id": job_id})
        return job

    async def list_comparisons(
        self, created_by: Optional[str] = None, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List comparison jobs"""
        query = {}
        if created_by:
            query["created_by"] = created_by

        cursor = self.db.report_compare_jobs.find(query).sort("created_at", -1).limit(limit)

        jobs = await cursor.to_list(length=limit)
        return jobs
