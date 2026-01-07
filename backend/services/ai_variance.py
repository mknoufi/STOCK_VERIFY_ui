import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


def _build_item_risk_pipeline(item_codes: list[str]) -> list[dict[str, Any]]:
    """Build MongoDB aggregation pipeline for item risk calculation."""
    return [
        {"$match": {"item_code": {"$in": item_codes}}},
        {"$sort": {"counted_at": -1}},
        {
            "$group": {
                "_id": "$item_code",
                "total_counts": {"$sum": 1},
                "variance_count": {
                    "$sum": {"$cond": [{"$ne": ["$variance_reason", None]}, 1, 0]}
                },
            }
        },
    ]


def _build_category_risk_pipeline(categories: list[str]) -> list[dict[str, Any]]:
    """Build MongoDB aggregation pipeline for category risk calculation."""
    return [
        {"$match": {"category": {"$in": categories}}},
        {
            "$group": {
                "_id": "$category",
                "total_counts": {"$sum": 1},
                "variance_count": {
                    "$sum": {"$cond": [{"$ne": ["$variance_reason", None]}, 1, 0]}
                },
            }
        },
    ]


def _calculate_hybrid_risk(
    heuristic: float, historical: float, total_counts: int, min_counts: int = 5
) -> float:
    """Calculate hybrid risk from heuristic and historical data."""
    if total_counts < min_counts:
        return heuristic
    return (heuristic * 0.4) + (historical * 0.6)


def _build_risk_item(
    item: dict[str, Any],
    item_risk: float,
    cat_risk: float,
    category_heuristics: dict[str, float],
) -> Optional[dict[str, Any]]:
    """Build a high-risk item dict if risk exceeds threshold."""
    category = item.get("category", "General")

    # Skip items with existing variance
    if item.get("variance_reason"):
        return None

    # Calculate total risk
    if item_risk == 0.0 and category in category_heuristics:
        total_risk = cat_risk
    else:
        total_risk = (item_risk * 0.7) + (cat_risk * 0.3)

    if total_risk <= 0.4:
        return None

    reason = (
        "Historical variance pattern"
        if item_risk > cat_risk
        else f"High-risk category: {category}"
    )

    return {
        "item_code": item.get("item_code"),
        "item_name": item.get("item_name", "Unknown Item"),
        "category": category,
        "risk_score": round(total_risk, 2),
        "reason": reason,
    }


class AIVarianceService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized:
            return

        # Heuristic-based risk scores for categories (0.0 to 1.0)
        self.category_heuristics = {
            "Electronics": 0.8,
            "Smartphone": 0.85,
            "High-Value": 0.9,
            "Accessories": 0.5,
            "Mobile": 0.7,
            "Laptop": 0.8,
            "Tablet": 0.8,
            "Storage": 0.4,
            "Peripherals": 0.3,
        }

        # Default risk for unknown categories
        self.default_risk = 0.2
        self.initialized = True

    async def get_historical_risk(self, db, item_code: str) -> float:
        """
        Calculate risk based on historical variance frequency for a specific item.
        """
        try:
            # Check last 5 counts for this item
            pipeline = [
                {"$match": {"item_code": item_code}},
                {"$sort": {"counted_at": -1}},
                {"$limit": 10},
                {
                    "$group": {
                        "_id": None,
                        "total_counts": {"$sum": 1},
                        "variance_count": {
                            "$sum": {
                                "$cond": [{"$ne": ["$variance_reason", None]}, 1, 0]
                            }
                        },
                    }
                },
            ]

            results = await db.variances.aggregate(pipeline).to_list(length=1)

            if not results:
                return 0.0

            stats = results[0]
            if stats["total_counts"] == 0:
                return 0.0

            return float(stats["variance_count"]) / float(stats["total_counts"])

        except Exception as e:
            logger.error(f"Error calculating historical risk for {item_code}: {e}")
            return 0.0

    async def get_category_risk_score(self, db, category: str) -> float:
        """
        Calculate risk based on historical variance frequency for a category.
        """
        try:
            # Combine heuristic with historical data if available
            heuristic = self.category_heuristics.get(category, self.default_risk)

            pipeline = [
                {"$match": {"category": category}},
                {"$limit": 100},
                {
                    "$group": {
                        "_id": None,
                        "total_counts": {"$sum": 1},
                        "variance_count": {
                            "$sum": {
                                "$cond": [{"$ne": ["$variance_reason", None]}, 1, 0]
                            }
                        },
                    }
                },
            ]

            results = await db.variances.aggregate(pipeline).to_list(length=1)

            if not results:
                return heuristic

            stats = results[0]
            if stats["total_counts"] < 5:  # Not enough data, weight towards heuristic
                return heuristic

            historical = float(stats["variance_count"]) / float(stats["total_counts"])

            # Hybrid: 40% heuristic, 60% historical
            return (heuristic * 0.4) + (historical * 0.6)

        except Exception as e:
            logger.error(f"Error calculating category risk for {category}: {e}")
            return self.default_risk

    async def predict_session_risks(
        self, db, session_id: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        """
        Analyze all items in a session and predict which are most likely to have variances.
        """
        try:
            # 1. Get all counted items in this session
            counted_items = await db.count_lines.find(
                {"session_id": session_id}
            ).to_list(length=1000)

            if not counted_items:
                return []

            # 2. Extract unique item codes and categories for bulk lookup
            item_codes = list(
                {
                    item.get("item_code")
                    for item in counted_items
                    if item.get("item_code")
                }
            )
            categories = list(
                {item.get("category") for item in counted_items if item.get("category")}
            )

            # 3. Bulk calculate historical item risks
            item_risk_map = await self._calculate_item_risks(db, item_codes)

            # 4. Bulk calculate category risks
            cat_risk_map = await self._calculate_category_risks(db, categories)

            # 5. Process items with pre-calculated risks
            high_risk_items = self._process_items_for_risks(
                counted_items, item_risk_map, cat_risk_map
            )

            high_risk_items.sort(key=lambda x: x["risk_score"], reverse=True)
            return high_risk_items[:limit]

        except Exception as e:
            logger.error(f"Error predicting session risks for {session_id}: {e}")
            return []

    async def _calculate_item_risks(
        self, db, item_codes: list[str]
    ) -> dict[str, float]:
        """Calculate item risk scores from historical variances."""
        if not item_codes:
            return {}

        pipeline = _build_item_risk_pipeline(item_codes)
        results = await db.variances.aggregate(pipeline).to_list(length=len(item_codes))

        risk_map = {}
        for res in results:
            if res["total_counts"] > 0:
                risk_map[res["_id"]] = (
                    float(res["variance_count"]) / res["total_counts"]
                )
        return risk_map

    async def _calculate_category_risks(
        self, db, categories: list[str]
    ) -> dict[str, float]:
        """Calculate category risk scores with hybrid heuristic/historical."""
        if not categories:
            return {}

        pipeline = _build_category_risk_pipeline(categories)
        results = await db.variances.aggregate(pipeline).to_list(length=len(categories))

        risk_map = {}
        for res in results:
            heuristic = self.category_heuristics.get(res["_id"], self.default_risk)
            historical = (
                float(res["variance_count"]) / res["total_counts"]
                if res["total_counts"] > 0
                else 0
            )
            risk_map[res["_id"]] = _calculate_hybrid_risk(
                heuristic, historical, res["total_counts"]
            )
        return risk_map

    def _process_items_for_risks(
        self,
        counted_items: list[dict[str, Any]],
        item_risk_map: dict[str, float],
        cat_risk_map: dict[str, float],
    ) -> list[dict[str, Any]]:
        """Process counted items and build high-risk items list."""
        high_risk_items = []
        for item in counted_items:
            item_code = item.get("item_code")
            category = item.get("category", "General")

            item_risk = item_risk_map.get(item_code, 0.0)
            cat_risk = cat_risk_map.get(
                category, self.category_heuristics.get(category, self.default_risk)
            )

            risk_item = _build_risk_item(
                item, item_risk, cat_risk, self.category_heuristics
            )
            if risk_item:
                high_risk_items.append(risk_item)

        return high_risk_items


# Singleton instance
ai_variance_service = AIVarianceService()
