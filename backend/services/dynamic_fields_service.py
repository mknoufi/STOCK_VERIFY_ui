"""
Dynamic Fields Service
Allows supervisors to dynamically add custom fields to items with database mapping
"""

import logging
from datetime import datetime
from typing import Any, Optional

from bson import ObjectId

logger = logging.getLogger(__name__)


class DynamicFieldsService:
    """
    Service for managing dynamic custom fields for items
    Supports field definitions, database mapping, and value storage
    """

    def __init__(self, db):
        self.db = db
        self.field_definitions = db.dynamic_field_definitions
        self.field_values = db.dynamic_field_values

    async def create_field_definition(
        self,
        field_name: str,
        field_type: str,
        display_label: str,
        db_mapping: Optional[str] = None,
        options: Optional[list[str]] = None,
        validation_rules: dict[str, Optional[Any]] = None,
        default_value: Optional[Any] = None,
        required: bool = False,
        visible: bool = True,
        searchable: bool = False,
        in_reports: bool = True,
        order: int = 0,
        created_by: str = None,
    ) -> dict[str, Any]:
        """
        Create a new dynamic field definition

        Args:
            field_name: Internal field name (e.g., "warranty_period")
            field_type: Type of field (text, number, date, select, multiselect, boolean, json)
            display_label: Human-readable label (e.g., "Warranty Period")
            db_mapping: Optional mapping to existing database field
            options: List of options for select/multiselect types
            validation_rules: Rules for validation (min, max, regex, etc.)
            default_value: Default value for the field
            required: Whether field is required
            visible: Whether field is visible in UI
            searchable: Whether field can be searched
            in_reports: Whether field appears in reports
            order: Display order
            created_by: Username of creator

        Returns:
            Created field definition
        """
        try:
            # Validate field type
            valid_types = [
                "text",
                "number",
                "date",
                "datetime",
                "select",
                "multiselect",
                "boolean",
                "json",
                "url",
                "email",
                "phone",
            ]
            if field_type not in valid_types:
                raise ValueError(f"Invalid field type. Must be one of: {', '.join(valid_types)}")

            # Check if field name already exists
            existing = await self.field_definitions.find_one({"field_name": field_name})
            if existing:
                raise ValueError(f"Field with name '{field_name}' already exists")

            # Validate options for select types
            if field_type in ["select", "multiselect"] and not options:
                raise ValueError(f"Options are required for {field_type} field type")

            # Create field definition
            field_def = {
                "field_name": field_name,
                "field_type": field_type,
                "display_label": display_label,
                "db_mapping": db_mapping,
                "options": options or [],
                "validation_rules": validation_rules or {},
                "default_value": default_value,
                "required": required,
                "visible": visible,
                "searchable": searchable,
                "in_reports": in_reports,
                "order": order,
                "created_by": created_by,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "enabled": True,
            }

            result = await self.field_definitions.insert_one(field_def)
            field_def["_id"] = result.inserted_id

            logger.info(f"Created dynamic field: {field_name} ({field_type})")
            return field_def

        except Exception as e:
            logger.error(f"Error creating field definition: {str(e)}")
            raise

    async def get_field_definitions(
        self, enabled_only: bool = True, visible_only: bool = False
    ) -> list[dict[str, Any]]:
        """Get all field definitions"""
        try:
            query = {}
            if enabled_only:
                query["enabled"] = True
            if visible_only:
                query["visible"] = True

            cursor = self.field_definitions.find(query).sort("order", 1)
            fields = await cursor.to_list(length=None)

            return fields

        except Exception as e:
            logger.error(f"Error getting field definitions: {str(e)}")
            raise

    async def update_field_definition(
        self, field_id: str, updates: dict[str, Any], updated_by: str = None
    ) -> dict[str, Any]:
        """Update a field definition"""
        try:
            updates["updated_at"] = datetime.utcnow()
            if updated_by:
                updates["updated_by"] = updated_by

            result = await self.field_definitions.find_one_and_update(
                {"_id": ObjectId(field_id)}, {"$set": updates}, return_document=True
            )

            if not result:
                raise ValueError(f"Field definition not found: {field_id}")

            logger.info(f"Updated field definition: {field_id}")
            return result

        except Exception as e:
            logger.error(f"Error updating field definition: {str(e)}")
            raise

    async def delete_field_definition(self, field_id: str) -> bool:
        """Delete a field definition (soft delete)"""
        try:
            result = await self.field_definitions.update_one(
                {"_id": ObjectId(field_id)},
                {"$set": {"enabled": False, "deleted_at": datetime.utcnow()}},
            )

            return result.modified_count > 0

        except Exception as e:
            logger.error(f"Error deleting field definition: {str(e)}")
            raise

    async def set_field_value(
        self, item_code: str, field_name: str, value: Any, set_by: str = None
    ) -> dict[str, Any]:
        """
        Set value for a dynamic field on an item

        Args:
            item_code: Item code
            field_name: Field name
            value: Field value
            set_by: Username of person setting value

        Returns:
            Field value record
        """
        try:
            # Get field definition
            field_def = await self.field_definitions.find_one({"field_name": field_name})
            if not field_def:
                raise ValueError(f"Field definition not found: {field_name}")

            # Validate value
            validated_value = self._validate_field_value(value, field_def)

            # Check if value already exists
            existing = await self.field_values.find_one(
                {"item_code": item_code, "field_name": field_name}
            )

            if existing:
                # Update existing value
                result = await self.field_values.find_one_and_update(
                    {"_id": existing["_id"]},
                    {
                        "$set": {
                            "value": validated_value,
                            "updated_by": set_by,
                            "updated_at": datetime.utcnow(),
                        },
                        "$push": {
                            "history": {
                                "value": existing.get("value"),
                                "updated_by": set_by,
                                "updated_at": datetime.utcnow(),
                            }
                        },
                    },
                    return_document=True,
                )
                return result
            else:
                # Create new value
                field_value = {
                    "item_code": item_code,
                    "field_name": field_name,
                    "field_type": field_def["field_type"],
                    "value": validated_value,
                    "set_by": set_by,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "history": [],
                }

                result = await self.field_values.insert_one(field_value)
                field_value["_id"] = result.inserted_id

                # If DB mapping exists, update the main items collection
                if field_def.get("db_mapping"):
                    await self._update_db_mapping(
                        item_code, field_def["db_mapping"], validated_value
                    )

                return field_value

        except Exception as e:
            logger.error(f"Error setting field value: {str(e)}")
            raise

    async def get_item_field_values(self, item_code: str) -> dict[str, Any]:
        """Get all dynamic field values for an item"""
        try:
            cursor = self.field_values.find({"item_code": item_code})
            values = await cursor.to_list(length=None)

            # Convert to dict with field_name as key
            result = {}
            for val in values:
                result[val["field_name"]] = {
                    "value": val["value"],
                    "set_by": val.get("set_by"),
                    "updated_at": val.get("updated_at"),
                    "field_type": val.get("field_type"),
                }

            return result

        except Exception as e:
            logger.error(f"Error getting item field values: {str(e)}")
            raise

    async def get_items_with_fields(
        self,
        field_filters: dict[str, Optional[Any]] = None,
        limit: int = 100,
        skip: int = 0,
    ) -> list[dict[str, Any]]:
        """
        Get items with their dynamic field values

        Args:
            field_filters: Filter by field values (e.g., {"warranty_period": "2 years"})
            limit: Maximum number of results
            skip: Number of results to skip

        Returns:
            List of items with field values
        """
        try:
            # Build aggregation pipeline
            pipeline = []

            # Match field filters if provided
            if field_filters:
                match_conditions = []
                for field_name, value in field_filters.items():
                    match_conditions.append({"field_name": field_name, "value": value})

                if match_conditions:
                    pipeline.append({"$match": {"$or": match_conditions}})

            # Group by item_code
            group_stage: dict[str, Any] = {
                "$group": {
                    "_id": "$item_code",
                    "fields": {
                        "$push": {
                            "field_name": "$field_name",
                            "value": "$value",
                            "field_type": "$field_type",
                        }
                    },
                }
            }
            # Explicit type for pipeline stages
            skip_stage: dict[str, Any] = {"$skip": skip}
            limit_stage: dict[str, Any] = {"$limit": limit}
            pipeline.extend([group_stage, skip_stage, limit_stage])

            cursor = self.field_values.aggregate(pipeline)
            results = await cursor.to_list(length=None)

            # Get item details from main items collection
            items = []
            for result in results:
                item_code = result["_id"]
                item = await self.db.items.find_one({"item_code": item_code})

                if item:
                    item["dynamic_fields"] = {
                        field["field_name"]: field["value"] for field in result["fields"]
                    }
                    items.append(item)

            return items

        except Exception as e:
            logger.error(f"Error getting items with fields: {str(e)}")
            raise

    def _validate_number(self, value: Any, validation_rules: dict) -> float:
        try:
            val = float(value)
            if "min" in validation_rules and val < validation_rules["min"]:
                raise ValueError(f"Value must be >= {validation_rules['min']}")
            if "max" in validation_rules and val > validation_rules["max"]:
                raise ValueError(f"Value must be <= {validation_rules['max']}")
            return val
        except (ValueError, TypeError):
            raise ValueError("Value must be a number")

    def _validate_select(self, value: Any, field_type: str, options: list[str]) -> Any:
        if field_type == "select":
            if value not in options:
                raise ValueError(f"Value must be one of: {', '.join(options)}")
        else:
            if not isinstance(value, list):
                raise ValueError("Value must be a list")
            for v in value:
                if v not in options:
                    raise ValueError(f"All values must be from: {', '.join(options)}")
        return value

    def _validate_date(self, value: Any) -> Any:
        if isinstance(value, str):
            try:
                datetime.fromisoformat(value)
            except ValueError:
                raise ValueError("Invalid date format. Use ISO format (YYYY-MM-DD)")
        return value

    def _validate_field_value(self, value: Any, field_def: dict[str, Any]) -> Any:
        """Validate field value against field definition"""
        field_type = field_def["field_type"]
        validation_rules = field_def.get("validation_rules", {})
        options = field_def.get("options", [])

        if field_type == "number":
            return self._validate_number(value, validation_rules)

        elif field_type == "boolean":
            if not isinstance(value, bool):
                raise ValueError("Value must be boolean")
            return value

        elif field_type in ["select", "multiselect"]:
            return self._validate_select(value, field_type, options)

        elif field_type in ["date", "datetime"]:
            return self._validate_date(value)

        return value

    async def _update_db_mapping(self, item_code: str, db_field: str, value: Any):
        """Update mapped database field in items collection"""
        try:
            await self.db.items.update_one({"item_code": item_code}, {"$set": {db_field: value}})
            logger.info(f"Updated DB mapping {db_field} for item {item_code}")
        except Exception as e:
            logger.warning(f"Failed to update DB mapping: {str(e)}")

    async def get_field_statistics(self, field_name: str) -> dict[str, Any]:
        """Get statistics for a specific field"""
        try:
            field_def = await self.field_definitions.find_one({"field_name": field_name})
            if not field_def:
                raise ValueError(f"Field not found: {field_name}")

            total_count = await self.field_values.count_documents({"field_name": field_name})

            stats = {
                "field_name": field_name,
                "field_type": field_def["field_type"],
                "total_items_with_value": total_count,
                "statistics": {},
            }

            # Type-specific statistics
            if field_def["field_type"] == "number":
                pipeline = [
                    {"$match": {"field_name": field_name}},
                    {
                        "$group": {
                            "_id": None,
                            "min": {"$min": "$value"},
                            "max": {"$max": "$value"},
                            "avg": {"$avg": "$value"},
                            "sum": {"$sum": "$value"},
                        }
                    },
                ]
                cursor = self.field_values.aggregate(pipeline)
                result = await cursor.to_list(length=1)
                if result:
                    stats["statistics"] = result[0]

            elif field_def["field_type"] in ["select", "multiselect"]:
                pipeline = [
                    {"$match": {"field_name": field_name}},
                    {"$group": {"_id": "$value", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}},
                ]
                cursor = self.field_values.aggregate(pipeline)
                distribution = await cursor.to_list(length=None)
                stats["statistics"]["distribution"] = distribution

            return stats

        except Exception as e:
            logger.error(f"Error getting field statistics: {str(e)}")
            raise
