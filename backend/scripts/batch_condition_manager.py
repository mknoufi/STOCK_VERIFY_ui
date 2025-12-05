"""
Batch and Item Condition Management System
Handles multiple batches of same item and condition tracking
"""

import logging
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

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
    def create_batch(item_code: str, batch_data: Dict[str, Any]) -> Dict[str, Any]:
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
    def _analyze_batch_condition(batch: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze batch and recommend actions"""
        flags = []
        recommendations = []
        priority = "NORMAL"

        # Check expiry
        expiry_result = BatchManager._check_expiry(batch)
        if expiry_result:
            flags.extend(expiry_result["flags"])
            recommendations.extend(expiry_result["recommendations"])
            priority = expiry_result["priority"]
            batch["recommended_action"] = expiry_result["action"]

        # Check condition if no expiry action taken
        if not batch.get("recommended_action"):
            condition_result = BatchManager._check_condition(batch)
            if condition_result:
                flags.extend(condition_result["flags"])
                recommendations.extend(condition_result["recommendations"])
                priority = condition_result["priority"]
                batch["recommended_action"] = condition_result["action"]

        # Check manufacturing date age
        age_flags = BatchManager._check_age(batch)
        flags.extend(age_flags)

        batch["condition_flags"] = flags
        batch["recommendations"] = recommendations
        batch["action_priority"] = priority

        return batch

    @staticmethod
    def _check_expiry(batch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Check expiry date and return action if needed"""
        if not batch.get("expiry_date"):
            return None

        try:
            expiry = datetime.fromisoformat(batch["expiry_date"])
            days_to_expiry = (expiry - datetime.now()).days

            if days_to_expiry < 0:
                return {
                    "flags": ["EXPIRED"],
                    "action": BatchAction.DISPOSE,
                    "priority": "URGENT",
                    "recommendations": [
                        "DO NOT SELL - Expired product",
                        "Remove from shelves immediately",
                        "Dispose as per regulations",
                    ],
                }
            elif days_to_expiry <= 7:
                return {
                    "flags": ["EXPIRING_SOON"],
                    "action": BatchAction.CLEARANCE,
                    "priority": "HIGH",
                    "recommendations": [
                        f"Expires in {days_to_expiry} days - Clear urgently",
                        "Apply 50-70% discount",
                    ],
                }
            elif days_to_expiry <= 30:
                return {
                    "flags": ["SHORT_EXPIRY"],
                    "action": BatchAction.DISCOUNT_SALE,
                    "priority": "MEDIUM",
                    "recommendations": [
                        f"Expires in {days_to_expiry} days",
                        "Apply 20-30% discount",
                    ],
                }
        except (ValueError, TypeError):
            pass
        return None

    @staticmethod
    def _check_condition(batch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Check condition and return action if needed"""
        condition = batch.get("condition", ItemCondition.GOOD)

        if condition == ItemCondition.DAMAGED:
            return {
                "flags": ["DAMAGED"],
                "action": BatchAction.RETURN_TO_SUPPLIER,
                "priority": "HIGH",
                "recommendations": [
                    "Check if within return period",
                    "Document with photos",
                    "Contact supplier for replacement",
                ],
            }
        elif condition == ItemCondition.EXPIRED:
            return {
                "flags": ["EXPIRED"],
                "action": BatchAction.DISPOSE,
                "priority": "URGENT",
                "recommendations": [
                    "Remove from sales floor",
                    "Dispose immediately",
                ],
            }
        elif condition == ItemCondition.AGING:
            return {
                "flags": ["AGING"],
                "action": BatchAction.DISCOUNT_SALE,
                "priority": "MEDIUM",
                "recommendations": [
                    "Apply 15-25% discount",
                    "Promote in clearance section",
                ],
            }
        elif condition in [ItemCondition.SLOW_MOVING, ItemCondition.NON_MOVING]:
            return {
                "flags": ["SLOW_MOVING"],
                "action": BatchAction.DISCOUNT_SALE,
                "priority": "LOW",
                "recommendations": [
                    "Create bundle offers",
                    "Place in high-traffic area",
                ],
            }
        elif condition == ItemCondition.PACKAGING_DAMAGED:
            return {
                "flags": ["PACKAGING_ISSUE"],
                "action": BatchAction.REPACKAGE,
                "priority": "MEDIUM",
                "recommendations": [
                    "Repackage if product is intact",
                    "Sell at 10-15% discount",
                ],
            }
        elif condition in [ItemCondition.WATER_DAMAGED, ItemCondition.PEST_DAMAGED]:
            return {
                "flags": ["UNSELLABLE"],
                "action": BatchAction.WRITE_OFF,
                "priority": "HIGH",
                "recommendations": [
                    "Cannot be sold",
                    "Write off from inventory",
                    "Dispose safely",
                ],
            }
        return None

    @staticmethod
    def _check_age(batch: Dict[str, Any]) -> List[str]:
        """Check manufacturing date age"""
        flags = []
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
        return flags

    @staticmethod
    def aggregate_batches(batches: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate multiple batches of same item"""
        if not batches:
            return {}

        total_qty = sum(b.get("quantity", 0) for b in batches)

        # Categorize batches by condition
        by_condition: Dict[str, List[Dict[str, Any]]] = {}
        for batch in batches:
            condition = batch.get("condition", ItemCondition.GOOD)
            if condition not in by_condition:
                by_condition[condition] = []
            by_condition[condition].append(batch)

        # Priority batches (need immediate attention)
        priority_batches = [b for b in batches if b.get("action_priority") in ["URGENT", "HIGH"]]

        # Calculate discount potential
        total_value = sum(b.get("quantity", 0) * b.get("original_mrp", 0) for b in batches)
        discounted_value = sum(b.get("quantity", 0) * b.get("current_price", 0) for b in batches)
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
    def get_condition_options() -> List[Dict[str, Any]]:
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
    def get_quick_actions(condition: str) -> List[str]:
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

        return actions_map.get(condition, [])  # type: ignore


# Sample batch tracking workflow
def create_multi_batch_count(item_code: str, batches_data: List[Dict[str, Any]]) -> Dict[str, Any]:
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
