"""
Quality Control Service for Stock Verification System
Handles item condition tracking, expiry date management, and quality inspections.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class QualityInspection(BaseModel):
    """Quality inspection model"""

    item_code: str
    batch_number: Optional[str] = None
    inspection_date: datetime = Field(default_factory=datetime.utcnow)
    inspector_id: str
    condition_status: str = Field(..., pattern="^(GOOD|DAMAGED|EXPIRED)$")
    expiry_date: Optional[datetime] = None
    quality_notes: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    disposition: str = Field(..., pattern="^(ACCEPTED|REJECTED|QUARANTINE)$")
    session_id: Optional[str] = None


class ExpiryAlert(BaseModel):
    """Expiry alert model"""

    item_code: str
    batch_number: Optional[str] = None
    expiry_date: datetime
    alert_type: str = Field(..., pattern="^(EXPIRED|EXPIRING_SOON)$")
    alert_date: datetime = Field(default_factory=datetime.utcnow)
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None


class QualityControlService:
    """Service for managing quality control operations"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.quality_inspections = db.addon_quality_inspections
        self.expiry_alerts = db.addon_expiry_alerts
        self.defective_items = db.addon_defective_items

    async def create_inspection(self, inspection: QualityInspection) -> str:
        """Create a new quality inspection"""
        try:
            result = await self.quality_inspections.insert_one(inspection.dict())
            logger.info(f"Created quality inspection for item {inspection.item_code}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to create quality inspection: {e}")
            raise

    async def get_inspection(self, inspection_id: str) -> Optional[Dict[str, Any]]:
        """Get inspection by ID"""
        try:
            inspection = await self.quality_inspections.find_one({"_id": ObjectId(inspection_id)})
            return inspection
        except Exception as e:
            logger.error(f"Failed to get inspection {inspection_id}: {e}")
            return None

    async def get_item_inspections(self, item_code: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get inspections for a specific item"""
        try:
            cursor = (
                self.quality_inspections.find({"item_code": item_code})
                .sort("inspection_date", -1)
                .limit(limit)
            )
            inspections = await cursor.to_list(length=None)
            return inspections
        except Exception as e:
            logger.error(f"Failed to get inspections for item {item_code}: {e}")
            return []

    async def update_inspection(self, inspection_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing inspection"""
        try:
            result = await self.quality_inspections.update_one(
                {"_id": ObjectId(inspection_id)},
                {"$set": {**updates, "updated_at": datetime.utcnow()}},
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update inspection {inspection_id}: {e}")
            return False

    async def get_expiring_items(self, days_ahead: int = 30) -> List[Dict[str, Any]]:
        """Get items expiring within specified days"""
        try:
            expiry_threshold = datetime.utcnow() + timedelta(days=days_ahead)
            cursor = self.quality_inspections.find(
                {
                    "expiry_date": {"$lte": expiry_threshold, "$gte": datetime.utcnow()},
                    "condition_status": {"$ne": "EXPIRED"},
                }
            ).sort("expiry_date", 1)
            items = await cursor.to_list(length=None)
            return items
        except Exception as e:
            logger.error(f"Failed to get expiring items: {e}")
            return []

    async def get_expired_items(self) -> List[Dict[str, Any]]:
        """Get expired items"""
        try:
            cursor = self.quality_inspections.find(
                {"expiry_date": {"$lt": datetime.utcnow()}, "condition_status": {"$ne": "EXPIRED"}}
            ).sort("expiry_date", 1)
            items = await cursor.to_list(length=None)
            return items
        except Exception as e:
            logger.error(f"Failed to get expired items: {e}")
            return []

    async def create_expiry_alert(self, alert: ExpiryAlert) -> str:
        """Create an expiry alert"""
        try:
            result = await self.expiry_alerts.insert_one(alert.dict())
            logger.info(f"Created expiry alert for item {alert.item_code}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to create expiry alert: {e}")
            raise

    async def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Acknowledge an expiry alert"""
        try:
            result = await self.expiry_alerts.update_one(
                {"_id": ObjectId(alert_id)},
                {
                    "$set": {
                        "acknowledged": True,
                        "acknowledged_by": user_id,
                        "acknowledged_at": datetime.utcnow(),
                    }
                },
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to acknowledge alert {alert_id}: {e}")
            return False

    async def get_unacknowledged_alerts(self) -> List[Dict[str, Any]]:
        """Get unacknowledged expiry alerts"""
        try:
            cursor = self.expiry_alerts.find({"acknowledged": False}).sort("alert_date", -1)
            alerts = await cursor.to_list(length=None)
            return alerts
        except Exception as e:
            logger.error(f"Failed to get unacknowledged alerts: {e}")
            return []

    async def report_defective_item(self, defective_item: Dict[str, Any]) -> str:
        """Report a defective item"""
        try:
            result = await self.defective_items.insert_one(
                {**defective_item, "reported_at": datetime.utcnow(), "status": "PENDING"}
            )
            logger.info(f"Reported defective item {defective_item.get('item_code')}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to report defective item: {e}")
            raise

    async def get_defective_items(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get defective items, optionally filtered by status"""
        try:
            query = {}
            if status:
                query["status"] = status

            cursor = self.defective_items.find(query).sort("reported_at", -1)
            items = await cursor.to_list(length=None)
            return items
        except Exception as e:
            logger.error(f"Failed to get defective items: {e}")
            return []

    async def update_defective_item_status(self, item_id: str, status: str, user_id: str) -> bool:
        """Update defective item status"""
        try:
            result = await self.defective_items.update_one(
                {"_id": ObjectId(item_id)},
                {
                    "$set": {
                        "status": status,
                        "updated_by": user_id,
                        "updated_at": datetime.utcnow(),
                    }
                },
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Failed to update defective item {item_id}: {e}")
            return False

    async def get_quality_metrics(self) -> Dict[str, Any]:
        """Get quality control metrics"""
        try:
            pipeline = [{"$group": {"_id": "$condition_status", "count": {"$sum": 1}}}]
            condition_stats = await self.quality_inspections.aggregate(pipeline).to_list(
                length=None
            )

            # Get defective items stats
            defective_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
            defective_stats = await self.defective_items.aggregate(defective_pipeline).to_list(
                length=None
            )

            # Get expiring items count
            expiring_count = await self.quality_inspections.count_documents(
                {
                    "expiry_date": {
                        "$lte": datetime.utcnow() + timedelta(days=30),
                        "$gte": datetime.utcnow(),
                    },
                    "condition_status": {"$ne": "EXPIRED"},
                }
            )

            return {
                "condition_stats": condition_stats,
                "defective_stats": defective_stats,
                "expiring_count": expiring_count,
                "total_inspections": sum(stat["count"] for stat in condition_stats),
            }
        except Exception as e:
            logger.error(f"Failed to get quality metrics: {e}")
            return {}
