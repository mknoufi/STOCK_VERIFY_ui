import logging
from datetime import datetime, timedelta
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def get_verification_stats(self, days: int = 7) -> dict[str, Any]:
        """Get verification statistics for the last N days"""
        start_date = datetime.utcnow() - timedelta(days=days)

        # Total items vs verified items
        total_items = await self.db.erp_items.count_documents({})
        verified_items = await self.db.erp_items.count_documents({"verified": True})

        # Verification trend (daily)
        pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        trend = await self.db.verification_logs.aggregate(pipeline).to_list(length=days)

        # Top verifiers
        user_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {"_id": "$username", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5},
        ]
        top_users = await self.db.verification_logs.aggregate(user_pipeline).to_list(
            length=5
        )

        # Variance summary
        variance_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}, "variance": {"$ne": 0}}},
            {
                "$group": {
                    "_id": None,
                    "total_variance": {"$sum": "$variance"},
                    "abs_variance": {"$sum": {"$abs": "$variance"}},
                    "count": {"$sum": 1},
                }
            },
        ]
        variance_stats = await self.db.verification_logs.aggregate(
            variance_pipeline
        ).to_list(length=1)
        variance_data = (
            variance_stats[0]
            if variance_stats
            else {"total_variance": 0, "abs_variance": 0, "count": 0}
        )

        # T078: Enhanced Discrepancy & Accuracy Metrics

        # Surplus (variance > 0)
        surplus_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}, "variance": {"$gt": 0}}},
            {"$count": "count"},
        ]
        surplus_res = await self.db.verification_logs.aggregate(
            surplus_pipeline
        ).to_list(length=1)
        surplus_count = surplus_res[0]["count"] if surplus_res else 0

        # Shortage (variance < 0)
        shortage_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}, "variance": {"$lt": 0}}},
            {"$count": "count"},
        ]
        shortage_res = await self.db.verification_logs.aggregate(
            shortage_pipeline
        ).to_list(length=1)
        shortage_count = shortage_res[0]["count"] if shortage_res else 0

        # Accuracy Rate (Percentage of verifications with 0 variance)
        total_verifications_period = sum(t["count"] for t in trend)
        accurate_verifications = total_verifications_period - variance_data["count"]
        accuracy_rate = (
            (accurate_verifications / total_verifications_period * 100)
            if total_verifications_period > 0
            else 100.0
        )

        return {
            "summary": {
                "total_items": total_items,
                "verified_items": verified_items,
                "completion_percentage": (
                    (verified_items / total_items * 100) if total_items > 0 else 0
                ),
                "total_verifications_period": total_verifications_period,
                "variance_count": variance_data["count"],
                "net_variance": variance_data["total_variance"],
                "absolute_variance": variance_data["abs_variance"],
                "accuracy_rate": accuracy_rate,
                "surplus_count": surplus_count,
                "shortage_count": shortage_count,
            },
            "trend": trend,
            "top_users": top_users,
        }

    async def get_category_distribution(self) -> list[dict[str, Any]]:
        """Get item distribution by category"""
        pipeline = [
            {
                "$group": {
                    "_id": "$category",
                    "total": {"$sum": 1},
                    "verified": {"$sum": {"$cond": ["$verified", 1, 0]}},
                }
            },
            {"$sort": {"total": -1}},
            {"$limit": 10},
        ]
        return await self.db.erp_items.aggregate(pipeline).to_list(length=10)
