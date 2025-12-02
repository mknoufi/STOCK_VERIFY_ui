"""
Barcode Analysis Module
Detects aging stock, slow-moving items, and price discount requirements
Based on barcode ranges and patterns
"""

import logging
from typing import Any, Dict, List, Optional, TypedDict

logger = logging.getLogger(__name__)


class AgingRangeConfig(TypedDict):
    category: str
    age_months: int
    discount_percentage: int
    action: str
    priority: str


class BarcodeAnalysisResult(TypedDict):
    barcode: str
    is_aging_stock: bool
    category: str
    age_months: int
    recommended_discount: int
    action_required: Optional[str]
    priority: str
    flags: List[str]
    recommendations: List[str]


class BatchSummary(TypedDict):
    total_items: int
    aging_count: int
    urgent_count: int
    total_recommended_discount: int
    categories: Dict[str, int]


class BarcodeAnalyzer:
    """
    Analyzes barcodes to detect aging stock and recommend actions
    """

    # Configuration for barcode range analysis
    AGING_STOCK_RANGES: Dict[str, AgingRangeConfig] = {
        "510000-510999": {
            "category": "Very Old Stock",
            "age_months": 24,
            "discount_percentage": 30,
            "action": "URGENT_CLEARANCE",
            "priority": "HIGH",
        },
        "511000-511999": {
            "category": "Old Stock",
            "age_months": 18,
            "discount_percentage": 20,
            "action": "CLEARANCE_SALE",
            "priority": "MEDIUM",
        },
        "512000-519999": {
            "category": "Aging Stock",
            "age_months": 12,
            "discount_percentage": 15,
            "action": "PROMOTIONAL_SALE",
            "priority": "MEDIUM",
        },
        "520000-529999": {
            "category": "Slow Moving",
            "age_months": 6,
            "discount_percentage": 10,
            "action": "BUNDLE_OFFER",
            "priority": "LOW",
        },
    }

    @staticmethod
    def analyze_barcode(barcode: str) -> Dict[str, Any]:
        """
        Analyze barcode and return aging/discount recommendations
        """
        result: BarcodeAnalysisResult = {
            "barcode": barcode,
            "is_aging_stock": False,
            "category": "Regular Stock",
            "age_months": 0,
            "recommended_discount": 0,
            "action_required": None,
            "priority": "NORMAL",
            "flags": [],
            "recommendations": [],
        }

        try:
            # Clean barcode
            barcode_num = barcode.strip()

            # Check if numeric
            if not barcode_num.isdigit():
                return result

            barcode_int = int(barcode_num)

            # Check against aging stock ranges
            for range_key, range_config in BarcodeAnalyzer.AGING_STOCK_RANGES.items():
                start, end = range_key.split("-")
                start_num = int(start)
                end_num = int(end)

                if start_num <= barcode_int <= end_num:
                    result["is_aging_stock"] = True
                    result["category"] = range_config["category"]
                    result["age_months"] = range_config["age_months"]
                    result["recommended_discount"] = range_config["discount_percentage"]
                    result["action_required"] = range_config["action"]
                    result["priority"] = range_config["priority"]

                    # Add flags
                    if range_config["discount_percentage"] >= 20:
                        result["flags"].append("DEEP_DISCOUNT")
                    if range_config["priority"] == "HIGH":
                        result["flags"].append("URGENT")

                    # Add recommendations
                    result["recommendations"] = BarcodeAnalyzer._generate_recommendations(
                        range_config
                    )

                    logger.info(f"Aging stock detected: {barcode} - {range_config['category']}")
                    break

            # Additional pattern analysis
            if barcode_num.startswith("51") or barcode_num.startswith("52"):
                if not result["is_aging_stock"]:
                    result["flags"].append("REVIEW_REQUIRED")
                    result["recommendations"].append("Check stock age manually")

        except Exception as e:
            logger.error(f"Error analyzing barcode {barcode}: {str(e)}")

        return result

    @staticmethod
    def _generate_recommendations(config: AgingRangeConfig) -> List[str]:
        """Generate action recommendations based on configuration"""
        recommendations: List[str] = []

        if config["action"] == "URGENT_CLEARANCE":
            recommendations.extend(
                [
                    f"Apply {config['discount_percentage']}% discount immediately",
                    "Move to clearance section",
                    "Consider bundling with fast-moving items",
                    "Check for damage or expiry",
                    "Update price labels with 'CLEARANCE' tag",
                ]
            )
        elif config["action"] == "CLEARANCE_SALE":
            recommendations.extend(
                [
                    f"Offer {config['discount_percentage']}% discount",
                    "Include in next clearance sale",
                    "Promote on WhatsApp/social media",
                    "Bundle with related items",
                ]
            )
        elif config["action"] == "PROMOTIONAL_SALE":
            recommendations.extend(
                [
                    f"Consider {config['discount_percentage']}% promotional discount",
                    "Include in festival offers",
                    "Cross-sell with popular items",
                ]
            )
        elif config["action"] == "BUNDLE_OFFER":
            recommendations.extend(
                [
                    "Create bundle offers",
                    "Place near checkout counter",
                    f"Light discount ({config['discount_percentage']}%) if needed",
                ]
            )

        return recommendations

    @staticmethod
    def get_discount_label(discount_percentage: int) -> str:
        """Get display label for discount"""
        if discount_percentage >= 30:
            return f"🔥 {discount_percentage}% OFF - CLEARANCE"
        elif discount_percentage >= 20:
            return f"💰 {discount_percentage}% OFF"
        elif discount_percentage >= 10:
            return f"✨ {discount_percentage}% OFF"
        else:
            return ""

    @staticmethod
    def batch_analyze(barcodes: List[str]) -> Dict[str, Any]:
        """
        Analyze multiple barcodes and generate summary
        """
        results: List[BarcodeAnalysisResult] = []
        summary: BatchSummary = {
            "total_items": len(barcodes),
            "aging_count": 0,
            "urgent_count": 0,
            "total_recommended_discount": 0,
            "categories": {},
        }

        for barcode in barcodes:
            analysis = BarcodeAnalyzer.analyze_barcode(barcode)
            results.append(analysis)

            if analysis["is_aging_stock"]:
                summary["aging_count"] += 1

                if analysis["priority"] == "HIGH":
                    summary["urgent_count"] += 1

                category = analysis["category"]
                if category not in summary["categories"]:
                    summary["categories"][category] = 0
                summary["categories"][category] += 1

        return {"results": results, "summary": summary}


# Pre-configured barcode patterns for quick lookup
BARCODE_PATTERNS = {
    "aging_prefixes": [
        "510",
        "511",
        "512",
        "513",
        "514",
        "515",
        "516",
        "517",
        "518",
        "519",
        "520",
        "521",
        "522",
        "523",
        "524",
        "525",
        "526",
        "527",
        "528",
        "529",
    ],
    "clearance_threshold": 510000,
    "slow_moving_threshold": 520000,
}


def is_aging_stock_barcode(barcode: str) -> bool:
    """Quick check if barcode indicates aging stock"""
    try:
        if barcode.isdigit():
            barcode_int = int(barcode)
            return 510000 <= barcode_int <= 529999
    except (ValueError, TypeError):
        pass
    return False


def get_stock_age_indicator(barcode: str) -> str:
    """Get quick age indicator"""
    if not barcode.isdigit():
        return "UNKNOWN"

    barcode_int = int(barcode)

    if 510000 <= barcode_int <= 510999:
        return "VERY_OLD"
    elif 511000 <= barcode_int <= 519999:
        return "OLD"
    elif 520000 <= barcode_int <= 529999:
        return "SLOW_MOVING"
    else:
        return "REGULAR"
