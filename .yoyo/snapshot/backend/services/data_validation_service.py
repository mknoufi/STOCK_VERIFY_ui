"""
Data Validation Service - Ensures data integrity across all database operations
"""

import logging
from datetime import datetime
from typing import Dict, Any, List, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
import re

logger = logging.getLogger(__name__)


class DataValidationService:
    """
    Comprehensive data validation for database operations
    """

    def __init__(self, mongo_db: AsyncIOMotorDatabase):
        self.mongo_db = mongo_db
        self.validation_rules = self._define_validation_rules()
        self.validation_stats = {
            "total_validations": 0,
            "passed_validations": 0,
            "failed_validations": 0,
            "last_validation": None,
        }

    def _define_validation_rules(self) -> Dict[str, Dict]:
        """Define validation rules for different data types"""
        return {
            "erp_item": {
                "required_fields": ["item_code", "item_name", "barcode"],
                "field_types": {
                    "item_code": str,
                    "item_name": str,
                    "barcode": str,
                    "stock_qty": float,
                    "mrp": float,
                },
                "field_constraints": {
                    "item_code": {"min_length": 1, "max_length": 50},
                    "item_name": {"min_length": 1, "max_length": 200},
                    "barcode": {"pattern": r"^\d{4,13}$"},  # 4-13 digit barcode
                    "stock_qty": {"min": 0, "max": 999999},
                    "mrp": {"min": 0, "max": 999999},
                },
            },
            "session": {
                "required_fields": ["warehouse", "created_by", "status"],
                "field_types": {"warehouse": str, "created_by": str, "status": str},
                "field_constraints": {
                    "status": {"allowed_values": ["active", "completed", "cancelled"]},
                    "warehouse": {"min_length": 1, "max_length": 50},
                },
            },
            "count_line": {
                "required_fields": ["session_id", "item_code", "counted_qty"],
                "field_types": {
                    "session_id": str,
                    "item_code": str,
                    "counted_qty": float,
                    "system_qty": float,
                },
                "field_constraints": {
                    "counted_qty": {"min": 0, "max": 999999},
                    "system_qty": {"min": 0, "max": 999999},
                },
            },
            "user": {
                "required_fields": ["username", "full_name", "role"],
                "field_types": {"username": str, "full_name": str, "role": str},
                "field_constraints": {
                    "username": {
                        "min_length": 3,
                        "max_length": 50,
                        "pattern": r"^[a-zA-Z0-9_]+$",
                    },
                    "role": {"allowed_values": ["staff", "supervisor", "admin"]},
                    "full_name": {"min_length": 1, "max_length": 100},
                },
            },
        }

    async def validate_data(self, data: Dict[str, Any], data_type: str) -> Tuple[bool, List[str]]:
        """
        Validate data against defined rules
        Returns (is_valid, error_messages)
        """
        self.validation_stats["total_validations"] += 1
        errors = []

        if data_type not in self.validation_rules:
            errors.append(f"Unknown data type: {data_type}")
            self.validation_stats["failed_validations"] += 1
            return False, errors

        rules = self.validation_rules[data_type]

        # Check required fields
        for field in rules["required_fields"]:
            if field not in data or data[field] is None or data[field] == "":
                errors.append(f"Required field missing or empty: {field}")

        # Check field types
        for field, expected_type in rules["field_types"].items():
            if field in data and data[field] is not None:
                if not isinstance(data[field], expected_type):
                    try:
                        # Try type conversion
                        if expected_type == float:
                            data[field] = float(data[field])
                        elif expected_type == int:
                            data[field] = int(data[field])
                        elif expected_type == str:
                            data[field] = str(data[field])
                    except (ValueError, TypeError):
                        errors.append(
                            f"Invalid type for {field}: expected {expected_type.__name__}"
                        )

        # Check field constraints
        if "field_constraints" in rules:
            for field, constraints in rules["field_constraints"].items():
                if field in data and data[field] is not None:
                    value = data[field]

                    # Length constraints
                    if "min_length" in constraints and isinstance(value, str):
                        if len(value) < constraints["min_length"]:
                            errors.append(f"{field} too short (min: {constraints['min_length']})")

                    if "max_length" in constraints and isinstance(value, str):
                        if len(value) > constraints["max_length"]:
                            errors.append(f"{field} too long (max: {constraints['max_length']})")

                    # Numeric constraints
                    if "min" in constraints and isinstance(value, (int, float)):
                        if value < constraints["min"]:
                            errors.append(f"{field} below minimum ({constraints['min']})")

                    if "max" in constraints and isinstance(value, (int, float)):
                        if value > constraints["max"]:
                            errors.append(f"{field} above maximum ({constraints['max']})")

                    # Pattern validation
                    if "pattern" in constraints and isinstance(value, str):
                        if not re.match(constraints["pattern"], value):
                            errors.append(f"{field} does not match required pattern")

                    # Allowed values
                    if "allowed_values" in constraints:
                        if value not in constraints["allowed_values"]:
                            errors.append(
                                f"{field} must be one of: {constraints['allowed_values']}"
                            )

        # Update stats
        is_valid = len(errors) == 0
        if is_valid:
            self.validation_stats["passed_validations"] += 1
        else:
            self.validation_stats["failed_validations"] += 1

        self.validation_stats["last_validation"] = datetime.utcnow()

        return is_valid, errors

    async def validate_and_clean_database(self) -> Dict[str, Any]:
        """
        Validate existing database data and clean up issues
        """
        validation_report = {
            "timestamp": datetime.utcnow().isoformat(),
            "collections_checked": 0,
            "total_documents": 0,
            "validation_errors": [],
            "cleanup_actions": [],
            "performance_improvements": [],
        }

        try:
            # Validate erp_items collection
            erp_items_report = await self._validate_collection("erp_items", "erp_item")
            validation_report.update(erp_items_report)

            # Validate sessions collection
            sessions_report = await self._validate_collection("sessions", "session")
            validation_report["validation_errors"].extend(
                sessions_report.get("validation_errors", [])
            )

            # Validate count_lines collection
            count_lines_report = await self._validate_collection("count_lines", "count_line")
            validation_report["validation_errors"].extend(
                count_lines_report.get("validation_errors", [])
            )

            # Check for orphaned data
            orphan_report = await self._check_orphaned_data()
            validation_report["cleanup_actions"].extend(orphan_report.get("cleanup_actions", []))

            # Performance recommendations
            performance_report = await self._analyze_performance_opportunities()
            validation_report["performance_improvements"].extend(
                performance_report.get("improvements", [])
            )

        except Exception as e:
            logger.error(f"Database validation failed: {str(e)}")
            validation_report["error"] = str(e)

        return validation_report

    async def _validate_collection(self, collection_name: str, data_type: str) -> Dict[str, Any]:
        """Validate a specific collection"""
        report = {
            "collection": collection_name,
            "documents_checked": 0,
            "validation_errors": [],
            "invalid_documents": [],
        }

        try:
            # Sample validation (check first 1000 documents)
            async for document in self.mongo_db[collection_name].find().limit(1000):
                report["documents_checked"] += 1

                # Remove MongoDB internal fields for validation
                clean_doc = {k: v for k, v in document.items() if not k.startswith("_")}

                is_valid, errors = await self.validate_data(clean_doc, data_type)

                if not is_valid:
                    report["validation_errors"].extend(
                        [
                            f"{collection_name} document {document.get('_id')}: {error}"
                            for error in errors
                        ]
                    )
                    report["invalid_documents"].append(
                        {"_id": str(document["_id"]), "errors": errors}
                    )

        except Exception as e:
            report["error"] = str(e)

        return report

    async def _check_orphaned_data(self) -> Dict[str, Any]:
        """Check for orphaned references and inconsistent data"""
        cleanup_report = {"cleanup_actions": []}

        try:
            # Check for count_lines without valid sessions
            orphaned_count_lines = await self.mongo_db.count_lines.aggregate(
                [
                    {
                        "$lookup": {
                            "from": "sessions",
                            "localField": "session_id",
                            "foreignField": "session_id",
                            "as": "session_ref",
                        }
                    },
                    {"$match": {"session_ref": {"$size": 0}}},
                    {"$count": "orphaned_count"},
                ]
            ).to_list(1)

            if orphaned_count_lines:
                orphaned_count = orphaned_count_lines[0]["orphaned_count"]
                if orphaned_count > 0:
                    cleanup_report["cleanup_actions"].append(
                        f"Found {orphaned_count} count lines with invalid session references"
                    )

            # Check for sessions without count lines (empty sessions)
            empty_sessions = await self.mongo_db.sessions.aggregate(
                [
                    {
                        "$lookup": {
                            "from": "count_lines",
                            "localField": "session_id",
                            "foreignField": "session_id",
                            "as": "count_lines_ref",
                        }
                    },
                    {
                        "$match": {
                            "count_lines_ref": {"$size": 0},
                            "status": "completed",
                        }
                    },
                    {"$count": "empty_sessions"},
                ]
            ).to_list(1)

            if empty_sessions:
                empty_count = empty_sessions[0]["empty_sessions"]
                if empty_count > 0:
                    cleanup_report["cleanup_actions"].append(
                        f"Found {empty_count} completed sessions with no count lines"
                    )

        except Exception as e:
            logger.error(f"Orphaned data check failed: {str(e)}")
            cleanup_report["error"] = str(e)

        return cleanup_report

    async def _analyze_performance_opportunities(self) -> Dict[str, Any]:
        """Analyze database for performance optimization opportunities"""
        improvements = {"improvements": []}

        try:
            # Check index usage
            index_stats = await self.mongo_db.erp_items.aggregate([{"$indexStats": {}}]).to_list(
                None
            )

            for stat in index_stats:
                if stat["accesses"]["ops"] == 0:
                    improvements["improvements"].append(
                        {
                            "type": "unused_index",
                            "message": f"Index '{stat['name']}' on erp_items is unused and could be dropped",
                            "priority": "low",
                        }
                    )

            # Check for missing indexes based on common queries
            common_query_patterns = [
                {"field": "warehouse", "usage": "filtering"},
                {"field": "category", "usage": "grouping"},
                {"field": "stock_qty", "usage": "sorting"},
            ]

            existing_indexes = await self.mongo_db.erp_items.list_indexes().to_list(None)
            existing_index_fields = set()

            for idx in existing_indexes:
                for key, direction in idx.get("key", {}).items():
                    existing_index_fields.add(key)

            for pattern in common_query_patterns:
                if pattern["field"] not in existing_index_fields:
                    improvements["improvements"].append(
                        {
                            "type": "missing_index",
                            "message": f"Consider adding index on '{pattern['field']}' for {pattern['usage']}",
                            "priority": "medium",
                        }
                    )

        except Exception as e:
            logger.error(f"Performance analysis failed: {str(e)}")
            improvements["error"] = str(e)

        return improvements

    def get_validation_stats(self) -> Dict[str, Any]:
        """Get validation statistics"""
        success_rate = 0
        if self.validation_stats["total_validations"] > 0:
            success_rate = (
                self.validation_stats["passed_validations"]
                / self.validation_stats["total_validations"]
            ) * 100

        return {**self.validation_stats, "success_rate": success_rate}
