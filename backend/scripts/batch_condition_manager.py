"""
Batch and Item Condition Management System
Handles multiple batches of same item and condition tracking
"""

import logging
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class ItemCondition(str, Enum):
    """Item condition types"""

    GOOD = "good"
    DAMAGED = "damaged"
    AGING = "aging"
    EXPIRED = "expired"
    SCRATCHED = "scratched"
    DEFECTIVE = "defective"
    SLOW_MOVING = "slow_moving"
    NON_MOVING = "non_moving"
    OBSOLETE = "obsolete"
    WATER_DAMAGED = "water_damaged"
    PEST_DAMAGED = "pest_damaged"
    PACKAGING_DAMAGED = "packaging_damaged"


class BatchAction(str, Enum):
    """Recommended actions for batches"""

    SELL_NORMAL = "sell_normal"
    DISCOUNT_SALE = "discount_sale"
    CLEARANCE = "clearance"
    RETURN_TO_SUPPLIER = "return_to_supplier"
    DISPOSE = "dispose"
    REPAIR = "repair"
    REPACKAGE = "repackage"
    DONATE = "donate"
    WRITE_OFF = "write_off"


class BatchManager:
    """Manage multiple batches of same item"""

    @staticmethod
    def create_batch(item_code: str, batch_data: dict) -> dict:
        """Create a new batch entry"""
        batch = {
            "batch_id": batch_data.get("batch_id")
            or f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "item_code": item_code,
            "batch_number": batch_data.get("batch_number", ""),
            "lot_number": batch_data.get("lot_number", ""),
            "serial_number": batch_data.get("serial_number", ""),
            # Location details
            "location": batch_data.get("location", ""),
            "shelf": batch_data.get("shelf", ""),
            "bin": batch_data.get("bin", ""),
            "section": batch_data.get("section", ""),
            # Quantity details
            "quantity": batch_data.get("quantity", 0),
            "unit": batch_data.get("unit", "PCS"),
            # Date tracking
            "mfg_date": batch_data.get("mfg_date"),
            "expiry_date": batch_data.get("expiry_date"),
            "received_date": batch_data.get("received_date"),
            # Condition tracking
            "condition": batch_data.get("condition", ItemCondition.GOOD),
            "condition_notes": batch_data.get("condition_notes", ""),
            "condition_flags": batch_data.get("condition_flags", []),
            # Discount/Pricing
            "original_mrp": batch_data.get("original_mrp", 0),
            "current_price": batch_data.get("current_price", 0),
            "discount_applied": batch_data.get("discount_applied", 0),
            # Action tracking
            "recommended_action": batch_data.get("recommended_action"),
            "action_priority": batch_data.get("action_priority", "NORMAL"),
            "action_deadline": batch_data.get("action_deadline"),
            # Photos
            "photos": batch_data.get("photos", []),
            # Metadata
            "counted_by": batch_data.get("counted_by", ""),
            "counted_at": datetime.utcnow(),
            "verified": batch_data.get("verified", False),
            "verified_by": batch_data.get("verified_by"),
        }

        # Auto-detect issues
        batch = BatchManager._analyze_batch_condition(batch)

        return batch

    @staticmethod
    def _analyze_batch_condition(batch: dict) -> dict:
        """Analyze batch and recommend actions"""
        flags = []
        recommendations = []
        priority = "NORMAL"

        # Check expiry
        if batch.get("expiry_date"):
            try:
                expiry = datetime.fromisoformat(batch["expiry_date"])
                days_to_expiry = (expiry - datetime.now()).days

                if days_to_expiry < 0:
                    flags.append("EXPIRED")
                    batch["recommended_action"] = BatchAction.DISPOSE
                    priority = "URGENT"
                    recommendations.append("DO NOT SELL - Expired product")
                    recommendations.append("Remove from shelves immediately")
                    recommendations.append("Dispose as per regulations")
                elif days_to_expiry <= 7:
                    flags.append("EXPIRING_SOON")
                    batch["recommended_action"] = BatchAction.CLEARANCE
                    priority = "HIGH"
                    recommendations.append(
                        f"Expires in {days_to_expiry} days - Clear urgently"
                    )
                    recommendations.append("Apply 50-70% discount")
                elif days_to_expiry <= 30:
                    flags.append("SHORT_EXPIRY")
                    batch["recommended_action"] = BatchAction.DISCOUNT_SALE
                    priority = "MEDIUM"
                    recommendations.append(f"Expires in {days_to_expiry} days")
                    recommendations.append("Apply 20-30% discount")
            except (ValueError, TypeError):
                pass

        # Check condition
        condition = batch.get("condition", ItemCondition.GOOD)

        if condition == ItemCondition.DAMAGED:
            flags.append("DAMAGED")
            batch["recommended_action"] = BatchAction.RETURN_TO_SUPPLIER
            priority = "HIGH"
            recommendations.append("Check if within return period")
            recommendations.append("Document with photos")
            recommendations.append("Contact supplier for replacement")

        elif condition == ItemCondition.EXPIRED:
            flags.append("EXPIRED")
            batch["recommended_action"] = BatchAction.DISPOSE
            priority = "URGENT"
            recommendations.append("Remove from sales floor")
            recommendations.append("Dispose immediately")

        elif condition == ItemCondition.AGING:
            flags.append("AGING")
            batch["recommended_action"] = BatchAction.DISCOUNT_SALE
            priority = "MEDIUM"
            recommendations.append("Apply 15-25% discount")
            recommendations.append("Promote in clearance section")

        elif condition in [ItemCondition.SLOW_MOVING, ItemCondition.NON_MOVING]:
            flags.append("SLOW_MOVING")
            batch["recommended_action"] = BatchAction.DISCOUNT_SALE
            priority = "LOW"
            recommendations.append("Create bundle offers")
            recommendations.append("Place in high-traffic area")

        elif condition == ItemCondition.PACKAGING_DAMAGED:
            flags.append("PACKAGING_ISSUE")
            batch["recommended_action"] = BatchAction.REPACKAGE
            priority = "MEDIUM"
            recommendations.append("Repackage if product is intact")
            recommendations.append("Sell at 10-15% discount")

        elif condition in [ItemCondition.WATER_DAMAGED, ItemCondition.PEST_DAMAGED]:
            flags.append("UNSELLABLE")
            batch["recommended_action"] = BatchAction.WRITE_OFF
            priority = "HIGH"
            recommendations.append("Cannot be sold")
            recommendations.append("Write off from inventory")
            recommendations.append("Dispose safely")

        # Check manufacturing date age
        if batch.get("mfg_date"):
            try:
                mfg = datetime.fromisoformat(batch["mfg_date"])
                age_months = (datetime.now() - mfg).days / 30

                if age_months > 24:
                    flags.append("VERY_OLD")
                elif age_months > 12:
                    flags.append("OLD_STOCK")
            except (ValueError, TypeError):
                pass

        batch["condition_flags"] = flags
        batch["recommendations"] = recommendations
        batch["action_priority"] = priority

        return batch

    @staticmethod
    def aggregate_batches(batches: list[dict]) -> dict:
        """Aggregate multiple batches of same item"""
        if not batches:
            return {}

        total_qty = sum(b.get("quantity", 0) for b in batches)

        # Categorize batches by condition
        by_condition = {}
        for batch in batches:
            condition = batch.get("condition", ItemCondition.GOOD)
            if condition not in by_condition:
                by_condition[condition] = []
            by_condition[condition].append(batch)

        # Priority batches (need immediate attention)
        priority_batches = [
            b for b in batches if b.get("action_priority") in ["URGENT", "HIGH"]
        ]

        # Calculate discount potential
        total_value = sum(
            b.get("quantity", 0) * b.get("original_mrp", 0) for b in batches
        )
        discounted_value = sum(
            b.get("quantity", 0) * b.get("current_price", 0) for b in batches
        )
        potential_loss = total_value - discounted_value

        return {
            "total_batches": len(batches),
            "total_quantity": total_qty,
            "by_condition": {
                condition: {
                    "count": len(batch_list),
                    "quantity": sum(b.get("quantity", 0) for b in batch_list),
                }
                for condition, batch_list in by_condition.items()
            },
            "priority_batches": len(priority_batches),
            "priority_actions": [
                {
                    "batch_id": b.get("batch_id"),
                    "condition": b.get("condition"),
                    "quantity": b.get("quantity"),
                    "action": b.get("recommended_action"),
                    "priority": b.get("action_priority"),
                }
                for b in priority_batches
            ],
            "financial_impact": {
                "total_value": total_value,
                "discounted_value": discounted_value,
                "potential_loss": potential_loss,
            },
        }


class ConditionMarker:
    """Helper for marking item conditions during counting"""

    CONDITION_DEFINITIONS = {
        ItemCondition.GOOD: {
            "label": "Good Condition",
            "icon": "✅",
            "color": "#4CAF50",
            "action": "Sell normally",
            "discount": 0,
        },
        ItemCondition.DAMAGED: {
            "label": "Damaged",
            "icon": "💔",
            "color": "#F44336",
            "action": "Return or dispose",
            "discount": 0,
            "requires_photo": True,
        },
        ItemCondition.AGING: {
            "label": "Aging Stock",
            "icon": "⏳",
            "color": "#FF9800",
            "action": "Discount sale",
            "discount": 20,
        },
        ItemCondition.EXPIRED: {
            "label": "Expired",
            "icon": "❌",
            "color": "#D32F2F",
            "action": "Dispose immediately",
            "discount": 0,
            "requires_photo": True,
        },
        ItemCondition.SCRATCHED: {
            "label": "Scratched",
            "icon": "🔸",
            "color": "#FFA726",
            "action": "Minor discount",
            "discount": 10,
        },
        ItemCondition.SLOW_MOVING: {
            "label": "Slow Moving",
            "icon": "🐌",
            "color": "#9E9E9E",
            "action": "Bundle offers",
            "discount": 15,
        },
        ItemCondition.NON_MOVING: {
            "label": "Non-Moving",
            "icon": "⛔",
            "color": "#757575",
            "action": "Clearance",
            "discount": 30,
        },
        ItemCondition.PACKAGING_DAMAGED: {
            "label": "Packaging Damaged",
            "icon": "📦",
            "color": "#FF9800",
            "action": "Repackage or discount",
            "discount": 15,
            "requires_photo": True,
        },
        ItemCondition.WATER_DAMAGED: {
            "label": "Water Damaged",
            "icon": "💧",
            "color": "#2196F3",
            "action": "Write off",
            "discount": 0,
            "requires_photo": True,
        },
        ItemCondition.PEST_DAMAGED: {
            "label": "Pest Damaged",
            "icon": "🐛",
            "color": "#8D6E63",
            "action": "Dispose",
            "discount": 0,
            "requires_photo": True,
        },
    }

    @staticmethod
    def get_condition_options() -> list[dict]:
        """Get all condition options for UI"""
        return [
            {
                "value": condition,
                "label": info["label"],
                "icon": info["icon"],
                "color": info["color"],
                "action": info["action"],
                "discount": info["discount"],
                "requires_photo": info.get("requires_photo", False),
            }
            for condition, info in ConditionMarker.CONDITION_DEFINITIONS.items()
        ]

    @staticmethod
    def get_quick_actions(condition: str) -> list[str]:
        """Get quick action suggestions for condition"""
        actions_map = {
            ItemCondition.GOOD: [
                "Verify location on shelf",
                "Check for dust/dirt",
                "Ensure proper display",
            ],
            ItemCondition.DAMAGED: [
                "Take 3-4 clear photos",
                "Note damage type and extent",
                "Check if repairable",
                "Contact supplier if recent",
            ],
            ItemCondition.AGING: [
                "Apply discount sticker",
                "Move to clearance section",
                "Update price in system",
            ],
            ItemCondition.EXPIRED: [
                "Remove from shelf immediately",
                "Take photo for records",
                "Tag for disposal",
                "Update inventory",
            ],
            ItemCondition.SLOW_MOVING: [
                "Create bundle deal",
                "Move to eye-level shelf",
                "Add promotional signage",
            ],
            ItemCondition.NON_MOVING: [
                "Apply 30% discount",
                "Consider donation",
                "Promote on social media",
            ],
            ItemCondition.PACKAGING_DAMAGED: [
                "Assess if repackageable",
                "Take photo of damage",
                "Apply 10-15% discount",
                "Update label",
            ],
        }

        return actions_map.get(condition, [])


# Sample batch tracking workflow
def create_multi_batch_count(item_code: str, batches_data: list[dict]) -> dict:
    """
    Create count entry with multiple batches

    Example usage:
    batches = [
        {
            "batch_number": "LOT001",
            "location": "Shelf A1",
            "quantity": 20,
            "condition": "good",
            "mfg_date": "2024-01-15",
            "expiry_date": "2025-01-15"
        },
        {
            "batch_number": "LOT002",
            "location": "Shelf A2",
            "quantity": 15,
            "condition": "aging",
            "mfg_date": "2023-06-10",
            "expiry_date": "2024-12-31"
        }
    ]
    """
    batches = []
    for batch_data in batches_data:
        batch = BatchManager.create_batch(item_code, batch_data)
        batches.append(batch)

    # Aggregate
    summary = BatchManager.aggregate_batches(batches)

    return {
        "item_code": item_code,
        "batches": batches,
        "summary": summary,
        "total_quantity": summary["total_quantity"],
        "requires_attention": summary["priority_batches"] > 0,
    }
