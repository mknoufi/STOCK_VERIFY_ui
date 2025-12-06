"""
Quality Control API endpoints for Stock Verification System
Provides REST endpoints for quality inspections, expiry management, and defective item handling.
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from ..auth.dependencies import get_current_user
from ..services.quality_control_service import QualityControlService
from ..db.runtime import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/quality", tags=["quality-control"])


class QualityInspectionRequest(BaseModel):
    """Request model for creating quality inspections"""

    item_code: str
    batch_number: Optional[str] = None
    condition_status: str = Field(..., pattern="^(GOOD|DAMAGED|EXPIRED)$")
    expiry_date: Optional[str] = None  # ISO format date string
    quality_notes: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    disposition: str = Field(..., pattern="^(ACCEPTED|REJECTED|QUARANTINE)$")
    session_id: Optional[str] = None


class QualityInspectionUpdate(BaseModel):
    """Model for updating quality inspections"""

    condition_status: Optional[str] = Field(None, pattern="^(GOOD|DAMAGED|EXPIRED)$")
    expiry_date: Optional[str] = None  # ISO format date string
    quality_notes: Optional[str] = None
    photos: Optional[List[str]] = None
    disposition: Optional[str] = Field(None, pattern="^(ACCEPTED|REJECTED|QUARANTINE)$")


class ExpiryAlertRequest(BaseModel):
    """Request model for creating expiry alerts"""

    item_code: str
    batch_number: Optional[str] = None
    expiry_date: str  # ISO format date string
    alert_type: str = Field(..., pattern="^(EXPIRED|EXPIRING_SOON)$")


class DefectiveItemRequest(BaseModel):
    """Request model for reporting defective items"""

    item_code: str
    batch_number: Optional[str] = None
    defect_description: str
    severity: str = Field(..., pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    photos: List[str] = Field(default_factory=list)
    reported_by: str


async def get_quality_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> QualityControlService:
    """Dependency to get quality control service"""
    return QualityControlService(db)


@router.post("/inspections", response_model=Dict[str, str])
async def create_inspection(
    request: QualityInspectionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a new quality inspection"""
    try:
        # Convert expiry_date string to datetime if provided
        expiry_date = None
        if request.expiry_date:
            from datetime import datetime

            expiry_date = datetime.fromisoformat(request.expiry_date.replace("Z", "+00:00"))

        inspection_data = {
            "item_code": request.item_code,
            "batch_number": request.batch_number,
            "inspection_date": datetime.utcnow(),
            "inspector_id": current_user["user_id"],
            "condition_status": request.condition_status,
            "expiry_date": expiry_date,
            "quality_notes": request.quality_notes,
            "photos": request.photos,
            "disposition": request.disposition,
            "session_id": request.session_id,
        }

        from ..services.quality_control_service import QualityInspection

        inspection = QualityInspection(**inspection_data)
        inspection_id = await service.create_inspection(inspection)

        return {
            "inspection_id": inspection_id,
            "message": "Quality inspection created successfully",
        }

    except Exception as e:
        logger.error(f"Failed to create quality inspection: {e}")
        raise HTTPException(status_code=500, detail="Failed to create quality inspection")


@router.get("/inspections/{inspection_id}")
async def get_inspection(
    inspection_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Get a specific quality inspection"""
    try:
        inspection = await service.get_inspection(inspection_id)
        if not inspection:
            raise HTTPException(status_code=404, detail="Inspection not found")

        return inspection

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get inspection {inspection_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve inspection")


@router.get("/inspections")
async def get_item_inspections(
    item_code: str = Query(..., description="Item code to get inspections for"),
    limit: int = Query(50, description="Maximum number of inspections to return"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Get quality inspections for a specific item"""
    try:
        inspections = await service.get_item_inspections(item_code, limit)
        return {"inspections": inspections, "count": len(inspections)}

    except Exception as e:
        logger.error(f"Failed to get inspections for item {item_code}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve inspections")


@router.put("/inspections/{inspection_id}")
async def update_inspection(
    inspection_id: str,
    request: QualityInspectionUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Update an existing quality inspection"""
    try:
        updates = request.dict(exclude_unset=True)

        # Convert expiry_date string to datetime if provided
        if "expiry_date" in updates and updates["expiry_date"]:
            from datetime import datetime

            updates["expiry_date"] = datetime.fromisoformat(
                updates["expiry_date"].replace("Z", "+00:00")
            )

        success = await service.update_inspection(inspection_id, updates)

        if not success:
            raise HTTPException(status_code=404, detail="Inspection not found or update failed")

        return {"message": "Quality inspection updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update inspection {inspection_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update inspection")


@router.get("/expiring")
async def get_expiring_items(
    days_ahead: int = Query(30, description="Number of days to look ahead for expiring items"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Get items expiring within specified days"""
    try:
        items = await service.get_expiring_items(days_ahead)
        return {"expiring_items": items, "count": len(items), "days_ahead": days_ahead}

    except Exception as e:
        logger.error(f"Failed to get expiring items: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve expiring items")


@router.get("/expired")
async def get_expired_items(
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Get expired items"""
    try:
        items = await service.get_expired_items()
        return {"expired_items": items, "count": len(items)}

    except Exception as e:
        logger.error(f"Failed to get expired items: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve expired items")


@router.post("/alerts", response_model=Dict[str, str])
async def create_expiry_alert(
    request: ExpiryAlertRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Create an expiry alert"""
    try:
        from datetime import datetime
        from ..services.quality_control_service import ExpiryAlert

        expiry_date = datetime.fromisoformat(request.expiry_date.replace("Z", "+00:00"))

        alert = ExpiryAlert(
            item_code=request.item_code,
            batch_number=request.batch_number,
            expiry_date=expiry_date,
            alert_type=request.alert_type,
        )
        alert_id = await service.create_expiry_alert(alert)

        return {"alert_id": alert_id, "message": "Expiry alert created successfully"}

    except Exception as e:
        logger.error(f"Failed to create expiry alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to create expiry alert")


@router.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Acknowledge an expiry alert"""
    try:
        success = await service.acknowledge_alert(alert_id, current_user["user_id"])

        if not success:
            raise HTTPException(status_code=404, detail="Alert not found or already acknowledged")

        return {"message": "Alert acknowledged successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to acknowledge alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")


@router.get("/alerts/unacknowledged")
async def get_unacknowledged_alerts(
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Get unacknowledged expiry alerts"""
    try:
        alerts = await service.get_unacknowledged_alerts()
        return {"alerts": alerts, "count": len(alerts)}

    except Exception as e:
        logger.error(f"Failed to get unacknowledged alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")


@router.post("/defective-items", response_model=Dict[str, str])
async def report_defective_item(
    request: DefectiveItemRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Report a defective item"""
    try:
        defective_item = {
            "item_code": request.item_code,
            "batch_number": request.batch_number,
            "defect_description": request.defect_description,
            "severity": request.severity,
            "photos": request.photos,
            "reported_by": request.reported_by,
        }

        item_id = await service.report_defective_item(defective_item)

        return {"item_id": item_id, "message": "Defective item reported successfully"}

    except Exception as e:
        logger.error(f"Failed to report defective item: {e}")
        raise HTTPException(status_code=500, detail="Failed to report defective item")


@router.get("/defective-items")
async def get_defective_items(
    status: Optional[str] = Query(
        None, description="Filter by status (PENDING, INVESTIGATING, RESOLVED)"
    ),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Get defective items, optionally filtered by status"""
    try:
        items = await service.get_defective_items(status)
        return {"defective_items": items, "count": len(items), "filter_status": status}

    except Exception as e:
        logger.error(f"Failed to get defective items: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve defective items")


@router.put("/defective-items/{item_id}/status")
async def update_defective_item_status(
    item_id: str,
    status: str = Query(..., description="New status (PENDING, INVESTIGATING, RESOLVED)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Update defective item status"""
    try:
        success = await service.update_defective_item_status(
            item_id, status, current_user["user_id"]
        )

        if not success:
            raise HTTPException(status_code=404, detail="Defective item not found or update failed")

        return {"message": f"Defective item status updated to {status}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update defective item {item_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update defective item")


@router.get("/metrics")
async def get_quality_metrics(
    current_user: Dict[str, Any] = Depends(get_current_user),
    service: QualityControlService = Depends(get_quality_service),
):
    """Get quality control metrics"""
    try:
        metrics = await service.get_quality_metrics()
        return metrics

    except Exception as e:
        logger.error(f"Failed to get quality metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve quality metrics")
