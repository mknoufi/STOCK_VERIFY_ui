"""
Query Builder Service - Dynamic MongoDB aggregation pipeline builder
Supports complex queries with filters, grouping, and sorting
"""

import hashlib
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class QueryBuilder:
    """
    Build MongoDB aggregation pipelines from query specifications
    """

    # Available collections for querying
    COLLECTIONS = {
        "verification_records": "verification_records",
        "sessions": "verification_sessions",
        "items": "erp_items",
        "count_lines": "count_lines",
    }

    # Available fields per collection
    FIELDS = {
        "verification_records": [
            "item_code",
            "verified_qty",
            "damage_qty",
            "rack_id",
            "floor",
            "session_id",
            "status",
            "created_at",
            "updated_at",
        ],
        "verification_sessions": [
            "session_id",
            "user_id",
            "rack_id",
            "floor",
            "status",
            "started_at",
            "completed_at",
        ],
        "erp_items": [
            "item_code",
            "item_name",
            "category",
            "subcategory",
            "stock_qty",
            "warehouse",
            "floor",
            "rack",
        ],
        "count_lines": [
            "item_code",
            "session_id",
            "counted_qty",
            "verified",
            "rack_id",
        ],
    }

    # Aggregation functions
    AGGREGATIONS = ["sum", "avg", "min", "max", "count"]

    def __init__(self):
        pass

    def build_pipeline(
        self,
        collection: str,
        filters: Optional[Dict[str, Any]] = None,
        group_by: Optional[List[str]] = None,
        aggregations: Optional[Dict[str, str]] = None,
        sort: Optional[Dict[str, int]] = None,
        limit: Optional[int] = None,
        skip: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Build MongoDB aggregation pipeline

        Args:
            collection: Collection name
            filters: Filter conditions
            group_by: Fields to group by
            aggregations: Field aggregations {field: function}
            sort: Sort specification {field: 1/-1}
            limit: Limit results
            skip: Skip results

        Returns:
            MongoDB aggregation pipeline
        """
        pipeline = []

        # Validate collection
        if collection not in self.COLLECTIONS:
            raise ValueError(f"Invalid collection: {collection}")

        # Match stage (filters)
        if filters:
            match_stage = self._build_match_stage(filters)
            if match_stage:
                pipeline.append(match_stage)

        # Group stage
        if group_by or aggregations:
            group_stage = self._build_group_stage(group_by, aggregations)
            pipeline.append(group_stage)

        # Sort stage
        if sort:
            pipeline.append({"$sort": sort})

        # Skip stage
        if skip:
            pipeline.append({"$skip": skip})

        # Limit stage
        if limit:
            pipeline.append({"$limit": limit})

        return pipeline

    # Allowed filter keys to prevent injection
    ALLOWED_FILTER_KEYS = {
        "warehouse",
        "status",
        "date_from",
        "date_to",
        "user_id",
        "session_id",
        "item_code",
        "barcode",
        "category",
        "subcategory",
        "floor",
        "rack",
        "rack_id",
        "started_at",
        "completed_at",
        "created_at",
        "updated_at",
        "verified",
        "verified_qty",
        "damage_qty",
        "counted_qty",
    }

    def _build_match_stage(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build match stage from filters with input validation

        Supported operators:
        - eq: Equal
        - ne: Not equal
        - gt: Greater than
        - gte: Greater than or equal
        - lt: Less than
        - lte: Less than or equal
        - in: In array
        - nin: Not in array
        - regex: Regular expression
        - exists: Field exists
        """
        match_conditions = {}

        for field, condition in filters.items():
            # Validate filter key against allowlist
            if field not in self.ALLOWED_FILTER_KEYS:
                logger.warning(f"Rejected invalid filter key: {field}")
                continue
            if isinstance(condition, dict):
                # Operator-based condition
                mongo_condition = {}

                for op, value in condition.items():
                    if op == "eq":
                        match_conditions[field] = value
                    elif op == "ne":
                        mongo_condition["$ne"] = value
                    elif op == "gt":
                        mongo_condition["$gt"] = value
                    elif op == "gte":
                        mongo_condition["$gte"] = value
                    elif op == "lt":
                        mongo_condition["$lt"] = value
                    elif op == "lte":
                        mongo_condition["$lte"] = value
                    elif op == "in":
                        mongo_condition["$in"] = value
                    elif op == "nin":
                        mongo_condition["$nin"] = value
                    elif op == "regex":
                        mongo_condition["$regex"] = value
                        mongo_condition["$options"] = "i"  # Case insensitive
                    elif op == "exists":
                        mongo_condition["$exists"] = value

                if mongo_condition:
                    match_conditions[field] = mongo_condition
            else:
                # Simple equality
                match_conditions[field] = condition

        return {"$match": match_conditions} if match_conditions else {}

    def _build_group_stage(
        self,
        group_by: Optional[List[str]] = None,
        aggregations: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Build group stage

        Args:
            group_by: Fields to group by
            aggregations: {field: function} - e.g., {"verified_qty": "sum"}
        """
        group_stage = {"$group": {"_id": {}}}

        # Group by fields
        if group_by:
            if len(group_by) == 1:
                group_stage["$group"]["_id"] = f"${group_by[0]}"
            else:
                for field in group_by:
                    group_stage["$group"]["_id"][field] = f"${field}"

        # Aggregations
        if aggregations:
            for field, func in aggregations.items():
                if func not in self.AGGREGATIONS:
                    raise ValueError(f"Invalid aggregation function: {func}")

                if func == "sum":
                    group_stage["$group"][f"{field}_{func}"] = {"$sum": f"${field}"}
                elif func == "avg":
                    group_stage["$group"][f"{field}_{func}"] = {"$avg": f"${field}"}
                elif func == "min":
                    group_stage["$group"][f"{field}_{func}"] = {"$min": f"${field}"}
                elif func == "max":
                    group_stage["$group"][f"{field}_{func}"] = {"$max": f"${field}"}
                elif func == "count":
                    group_stage["$group"][f"{field}_{func}"] = {"$sum": 1}

        return group_stage

    def generate_query_hash(self, query_spec: Dict[str, Any]) -> str:
        """
        Generate unique hash for query specification
        Used for deduplication and caching
        """
        query_json = json.dumps(query_spec, sort_keys=True)
        return hashlib.sha256(query_json.encode()).hexdigest()[:16]

    def validate_query(
        self, collection: str, fields: List[str], aggregations: Optional[Dict] = None
    ) -> bool:
        """
        Validate query fields and aggregations
        """
        # Check collection
        if collection not in self.COLLECTIONS:
            raise ValueError(f"Invalid collection: {collection}")

        # Check fields
        available_fields = self.FIELDS.get(collection, [])
        for field in fields:
            if field not in available_fields:
                raise ValueError(f"Invalid field '{field}' for collection '{collection}'")

        # Check aggregations
        if aggregations:
            for field, func in aggregations.items():
                if field not in available_fields:
                    raise ValueError(
                        f"Invalid aggregation field '{field}' for collection '{collection}'"
                    )
                if func not in self.AGGREGATIONS:
                    raise ValueError(f"Invalid aggregation function: {func}")

        return True


# Example query specifications
EXAMPLE_QUERIES = {
    "items_by_floor": {
        "collection": "verification_records",
        "group_by": ["floor"],
        "aggregations": {"verified_qty": "sum", "damage_qty": "sum"},
        "sort": {"verified_qty_sum": -1},
    },
    "session_performance": {
        "collection": "verification_sessions",
        "filters": {"status": "completed"},
        "group_by": ["user_id"],
        "aggregations": {"session_id": "count"},
        "sort": {"session_id_count": -1},
    },
    "rack_summary": {
        "collection": "verification_records",
        "group_by": ["rack_id", "floor"],
        "aggregations": {
            "verified_qty": "sum",
            "damage_qty": "sum",
            "item_code": "count",
        },
    },
    "daily_verification": {
        "collection": "verification_records",
        "filters": {
            "created_at": {"gte": datetime.now().replace(hour=0, minute=0, second=0).timestamp()}
        },
        "group_by": ["floor"],
        "aggregations": {"verified_qty": "sum"},
    },
}
