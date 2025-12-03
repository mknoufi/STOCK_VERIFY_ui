"""
Data Enrichment Service - Handle item data correction and enrichment
Manages serial numbers, MRP, HSN codes, and other missing data additions
"""

import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class EnrichmentService:
    """
    Service for managing item data enrichment and corrections
    Handles serial numbers, MRP, HSN codes, barcodes, locations, conditions
    """

    def __init__(self, mongo_db: AsyncIOMotorDatabase):
        """
        Initialize enrichment service

        Args:
            mongo_db: MongoDB database instance
        """
        self.db = mongo_db
        self.required_fields = ["serial_number", "mrp", "hsn_code", "barcode"]

    async def record_enrichment(
        self, item_code: str, enrichment_data: Dict[str, Any], user_id: str, username: str
    ) -> Dict[str, Any]:
        """
        Record data enrichment for an item

        Args:
            item_code: Item code to enrich
            enrichment_data: Dictionary with enrichment fields
            user_id: User ID performing enrichment
            username: Username for audit trail

        Returns:
            Dictionary with enrichment result and statistics
        """
        try:
            # Get existing item
            existing_item = await self.db.erp_items.find_one({"item_code": item_code})
            if not existing_item:
                raise ValueError(f"Item {item_code} not found")

            # Validate enrichment data
            validation_result = self.validate_enrichment_data(enrichment_data)
            if not validation_result["is_valid"]:
                return {
                    "success": False,
                    "error": "Validation failed",
                    "errors": validation_result["errors"],
                }

            # Build update document
            update_fields = {}
            corrections = {}

            # Process each enrichment field
            for field, new_value in enrichment_data.items():
                if field in [
                    "serial_number",
                    "mrp",
                    "hsn_code",
                    "barcode",
                    "location",
                    "condition",
                    "notes",
                ]:
                    old_value = existing_item.get(field)

                    if new_value is not None and str(new_value).strip():
                        update_fields[field] = new_value

                        # Track correction type
                        if old_value is None or old_value == "":
                            corrections[field] = {
                                "old_value": old_value,
                                "new_value": new_value,
                                "action": "added",
                            }
                        elif old_value != new_value:
                            corrections[field] = {
                                "old_value": old_value,
                                "new_value": new_value,
                                "action": "corrected",
                            }

            # Add enrichment metadata
            update_fields["last_enriched_at"] = datetime.utcnow()
            update_fields["enriched_by"] = user_id

            # Calculate data completeness
            completeness = await self.calculate_completeness(item_code, update_fields)
            update_fields["data_complete"] = completeness["is_complete"]
            update_fields["completion_percentage"] = completeness["percentage"]

            # Build enrichment history entry
            history_entry = {
                "updated_at": datetime.utcnow(),
                "updated_by": user_id,
                "username": username,
                "fields_updated": list(corrections.keys()),
                "corrections": corrections,
            }

            # Update item in MongoDB
            await self.db.erp_items.update_one(
                {"item_code": item_code},
                {"$set": update_fields, "$push": {"enrichment_history": history_entry}},
            )

            # Create enrichment record for tracking
            enrichment_record = {
                "item_code": item_code,
                "corrections": corrections,
                "enriched_by": user_id,
                "username": username,
                "enriched_at": datetime.utcnow(),
                "fields_count": len(corrections),
                "data_complete": completeness["is_complete"],
            }

            await self.db.enrichments.insert_one(enrichment_record)

            logger.info(
                f"Item {item_code} enriched by {username}: {len(corrections)} fields updated"
            )

            return {
                "success": True,
                "item_code": item_code,
                "fields_updated": list(corrections.keys()),
                "corrections_count": len(corrections),
                "data_complete": completeness["is_complete"],
                "completion_percentage": completeness["percentage"],
            }

        except ValueError as e:
            logger.error(f"Enrichment validation error for {item_code}: {str(e)}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Enrichment failed for {item_code}: {str(e)}")
            raise

    def validate_enrichment_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate enrichment data before saving

        Args:
            data: Dictionary with enrichment fields

        Returns:
            Dictionary with validation result and errors
        """
        errors = []

        # Serial number validation
        if "serial_number" in data and data["serial_number"]:
            serial = str(data["serial_number"]).strip()
            if serial and not re.match(r"^[A-Z0-9\-]+$", serial, re.IGNORECASE):
                errors.append("Serial number must contain only letters, numbers, and hyphens")

        # MRP validation
        if "mrp" in data and data["mrp"] is not None:
            try:
                mrp = float(data["mrp"])
                if mrp < 0:
                    errors.append("MRP must be greater than or equal to 0")
            except (ValueError, TypeError):
                errors.append("MRP must be a valid number")

        # HSN code validation (4 or 8 digits)
        if "hsn_code" in data and data["hsn_code"]:
            hsn = str(data["hsn_code"]).strip()
            if hsn and not re.match(r"^\d{4}(\d{4})?$", hsn):
                errors.append("HSN code must be 4 or 8 digits")

        # Barcode validation (EAN-13: 13 digits)
        if "barcode" in data and data["barcode"]:
            barcode = str(data["barcode"]).strip()
            if barcode and not re.match(r"^\d{8,13}$", barcode):
                errors.append("Barcode must be 8-13 digits")

        # Condition validation
        if "condition" in data and data["condition"]:
            valid_conditions = ["good", "damaged", "obsolete", "new"]
            if data["condition"].lower() not in valid_conditions:
                errors.append(f"Condition must be one of: {', '.join(valid_conditions)}")

        return {"is_valid": len(errors) == 0, "errors": errors}

    async def calculate_completeness(
        self, item_code: str, additional_fields: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calculate data completeness for an item

        Args:
            item_code: Item code to check
            additional_fields: Additional fields to consider (for preview)

        Returns:
            Dictionary with completeness information
        """
        # Get current item
        item = await self.db.erp_items.find_one({"item_code": item_code})
        if not item:
            return {"is_complete": False, "percentage": 0, "missing_fields": self.required_fields}

        # Merge with additional fields if provided
        if additional_fields:
            item = {**item, **additional_fields}

        # Check required fields
        missing = []
        for field in self.required_fields:
            value = item.get(field)
            if value is None or value == "" or value == 0:
                missing.append(field)

        filled_count = len(self.required_fields) - len(missing)
        percentage = (filled_count / len(self.required_fields)) * 100

        return {
            "is_complete": len(missing) == 0,
            "percentage": round(percentage, 1),
            "missing_fields": missing,
            "filled_fields": filled_count,
            "total_fields": len(self.required_fields),
        }

    async def get_missing_fields(self, item_code: str) -> List[str]:
        """
        Get list of missing required fields for an item

        Args:
            item_code: Item code to check

        Returns:
            List of missing field names
        """
        completeness = await self.calculate_completeness(item_code)
        return completeness["missing_fields"]

    async def get_enrichment_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get enrichment statistics for a date range or user

        Args:
            start_date: Start date for stats
            end_date: End date for stats
            user_id: Filter by specific user

        Returns:
            Dictionary with enrichment statistics
        """
        query: Dict[str, Any] = {}

        if start_date or end_date:
            query["enriched_at"] = {}
            if start_date:
                query["enriched_at"]["$gte"] = start_date
            if end_date:
                query["enriched_at"]["$lte"] = end_date

        if user_id:
            query["enriched_by"] = user_id

        # Get enrichment records
        enrichments = await self.db.enrichments.find(query).to_list(length=None)

        # Calculate statistics
        total_enrichments = len(enrichments)
        total_fields_updated = sum(e.get("fields_count", 0) for e in enrichments)

        # Count by field type
        field_counts = {
            "serial_number": 0,
            "mrp": 0,
            "hsn_code": 0,
            "barcode": 0,
            "location": 0,
            "condition": 0,
        }

        for enrichment in enrichments:
            corrections = enrichment.get("corrections", {})
            for field in corrections:
                if field in field_counts:
                    field_counts[field] += 1

        # Get overall data completeness
        total_items = await self.db.erp_items.count_documents({})
        complete_items = await self.db.erp_items.count_documents({"data_complete": True})

        return {
            "total_enrichments": total_enrichments,
            "total_fields_updated": total_fields_updated,
            "field_counts": field_counts,
            "total_items": total_items,
            "complete_items": complete_items,
            "completion_rate": round(
                (complete_items / total_items * 100) if total_items > 0 else 0, 1
            ),
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
        }

    async def get_items_by_completeness(
        self, complete: bool = False, limit: int = 100, skip: int = 0
    ) -> Dict[str, Any]:
        """
        Get items filtered by data completeness

        Args:
            complete: True for complete items, False for incomplete
            limit: Maximum number of items to return
            skip: Number of items to skip (pagination)

        Returns:
            Dictionary with items and pagination info
        """
        query = {"data_complete": complete}

        total = await self.db.erp_items.count_documents(query)
        items = await self.db.erp_items.find(query).skip(skip).limit(limit).to_list(length=limit)

        # Add missing fields info for incomplete items
        if not complete:
            for item in items:
                completeness = await self.calculate_completeness(item["item_code"], item)
                item["missing_fields"] = completeness["missing_fields"]
                item["completion_percentage"] = completeness["percentage"]

        return {
            "items": items,
            "total": total,
            "limit": limit,
            "skip": skip,
            "has_more": (skip + len(items)) < total,
        }

    async def bulk_import_enrichments(
        self, enrichments: List[Dict[str, Any]], user_id: str, username: str
    ) -> Dict[str, Any]:
        """
        Bulk import enrichment data (e.g., from Excel)

        Args:
            enrichments: List of enrichment dictionaries
            user_id: User performing import
            username: Username for audit

        Returns:
            Dictionary with import results
        """
        results = {"success": 0, "failed": 0, "errors": []}

        for enrichment in enrichments:
            try:
                item_code = enrichment.get("item_code")
                if not item_code:
                    results["failed"] += 1
                    results["errors"].append({"item_code": None, "error": "Missing item_code"})
                    continue

                # Record enrichment
                result = await self.record_enrichment(
                    item_code=item_code,
                    enrichment_data=enrichment,
                    user_id=user_id,
                    username=username,
                )

                if result["success"]:
                    results["success"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append(
                        {"item_code": item_code, "error": result.get("error", "Unknown error")}
                    )

            except Exception as e:
                results["failed"] += 1
                results["errors"].append(
                    {"item_code": enrichment.get("item_code"), "error": str(e)}
                )

        logger.info(
            f"Bulk enrichment by {username}: "
            f"{results['success']} succeeded, {results['failed']} failed"
        )

        return results

    async def get_enrichment_leaderboard(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get enrichment leaderboard - users ranked by enrichment activity

        Args:
            start_date: Start date for leaderboard
            end_date: End date for leaderboard
            limit: Maximum number of users to return

        Returns:
            List of users with enrichment counts
        """
        match_query: Dict[str, Any] = {}

        if start_date or end_date:
            match_query["enriched_at"] = {}
            if start_date:
                match_query["enriched_at"]["$gte"] = start_date
            if end_date:
                match_query["enriched_at"]["$lte"] = end_date

        pipeline = [
            {"$match": match_query},
            {
                "$group": {
                    "_id": "$enriched_by",
                    "username": {"$first": "$username"},
                    "total_enrichments": {"$sum": 1},
                    "total_fields": {"$sum": "$fields_count"},
                    "items_completed": {"$sum": {"$cond": ["$data_complete", 1, 0]}},
                }
            },
            {"$sort": {"total_fields": -1}},
            {"$limit": limit},
        ]

        leaderboard = await self.db.enrichments.aggregate(pipeline).to_list(length=limit)

        return [
            {
                "rank": idx + 1,
                "user_id": entry["_id"],
                "username": entry["username"],
                "total_enrichments": entry["total_enrichments"],
                "total_fields": entry["total_fields"],
                "items_completed": entry["items_completed"],
            }
            for idx, entry in enumerate(leaderboard)
        ]

    async def get_items_needing_enrichment(
        self, category: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get items that need data enrichment (incomplete data)

        Args:
            category: Filter by item category
            limit: Maximum items to return

        Returns:
            List of items with missing fields highlighted
        """
        query = {"$or": [{"data_complete": {"$ne": True}}, {"data_complete": {"$exists": False}}]}

        if category:
            query["category"] = category

        items = await self.db.erp_items.find(query).limit(limit).to_list(length=limit)

        # Add missing fields info
        result = []
        for item in items:
            completeness = await self.calculate_completeness(item["item_code"], item)
            result.append(
                {
                    "item_code": item["item_code"],
                    "item_name": item.get("item_name", ""),
                    "category": item.get("category", ""),
                    "missing_fields": completeness["missing_fields"],
                    "completion_percentage": completeness["percentage"],
                    "priority": (
                        "high"
                        if completeness["percentage"] < 25
                        else "medium"
                        if completeness["percentage"] < 75
                        else "low"
                    ),
                }
            )

        return result
