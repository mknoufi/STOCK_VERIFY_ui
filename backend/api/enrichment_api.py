"""
Enrichment API Endpoints - Handle item data enrichment and corrections
Provides endpoints for adding serial numbers, MRP, HSN codes, and other missing data
"""

import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.services.enrichment_service import EnrichmentService

logger = logging.getLogger(__name__)

# Router
enrichment_router = APIRouter(prefix="/api/v1/enrichment", tags=["Enrichment"])

# These will be initialized at runtime
enrichment_service: Optional[EnrichmentService] = None


def init_enrichment_api(service: EnrichmentService):
    """Initialize enrichment API with service"""
    global enrichment_service
    enrichment_service = service


# Request/Response Models
class EnrichmentRequest(BaseModel):
    """Request model for item enrichment"""

    item_code: str = Field(..., description="Item code to enrich")
    serial_number: Optional[str] = Field(None, description="Serial number")
    mrp: Optional[float] = Field(None, description="Maximum Retail Price", ge=0)
    hsn_code: Optional[str] = Field(None, description="HSN code (4 or 8 digits)")
    barcode: Optional[str] = Field(None, description="Barcode (8-13 digits)")
    location: Optional[str] = Field(None, description="Physical location/rack")
    condition: Optional[str] = Field(
        None, description="Item condition: good, damaged, obsolete, new"
    )
    notes: Optional[str] = Field(None, description="Additional notes")


class EnrichmentResponse(BaseModel):
    """Response model for enrichment operation"""

    success: bool
    item_code: str
    fields_updated: list[str] = []
    corrections_count: int = 0
    data_complete: bool = False
    completion_percentage: float = 0.0
    error: Optional[str] = None


class BulkEnrichmentRequest(BaseModel):
    """Request model for bulk enrichment"""

    enrichments: list[EnrichmentRequest] = Field(..., description="List of enrichment records")


class DataCompletenessResponse(BaseModel):
    """Response model for data completeness check"""

    item_code: str
    is_complete: bool
    percentage: float
    missing_fields: list[str]
    filled_fields: int
    total_fields: int


# Endpoints
@enrichment_router.post("/record", response_model=EnrichmentResponse)
async def record_item_enrichment(
    request: EnrichmentRequest, current_user: dict[str, Any] = Depends(get_current_user)
) -> EnrichmentResponse:
    """
    Record data enrichment for an item

    Staff can add/correct:
    - Serial numbers
    - MRP
    - HSN codes
    - Barcodes
    - Location/Rack
    - Item condition
    - Notes
    """
    if not enrichment_service:
        raise HTTPException(status_code=500, detail="Enrichment service not initialized")

    try:
        # Extract enrichment data
        enrichment_data = {
            "serial_number": request.serial_number,
            "mrp": request.mrp,
            "hsn_code": request.hsn_code,
            "barcode": request.barcode,
            "location": request.location,
            "condition": request.condition,
            "notes": request.notes,
        }

        # Remove None values
        enrichment_data = {k: v for k, v in enrichment_data.items() if v is not None}

        if not enrichment_data:
            raise HTTPException(status_code=400, detail="No enrichment data provided")

        # Record enrichment
        result = await enrichment_service.record_enrichment(
            item_code=request.item_code,
            enrichment_data=enrichment_data,
            user_id=current_user["_id"],
            username=current_user["username"],
        )

        if not result["success"]:
            return EnrichmentResponse(
                success=False,
                item_code=request.item_code,
                error=result.get("error", "Enrichment failed"),
            )

        return EnrichmentResponse(
            success=True,
            item_code=result["item_code"],
            fields_updated=result["fields_updated"],
            corrections_count=result["corrections_count"],
            data_complete=result["data_complete"],
            completion_percentage=result["completion_percentage"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enrichment API error for {request.item_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to record enrichment: {str(e)}")


@enrichment_router.get("/completeness/{item_code}", response_model=DataCompletenessResponse)
async def check_data_completeness(
    item_code: str, current_user: dict[str, Any] = Depends(get_current_user)
) -> DataCompletenessResponse:
    """
    Check data completeness for a specific item
    Returns which fields are missing
    """
    if not enrichment_service:
        raise HTTPException(status_code=500, detail="Enrichment service not initialized")

    try:
        completeness = await enrichment_service.calculate_completeness(item_code)

        return DataCompletenessResponse(
            item_code=item_code,
            is_complete=completeness["is_complete"],
            percentage=completeness["percentage"],
            missing_fields=completeness["missing_fields"],
            filled_fields=completeness["filled_fields"],
            total_fields=completeness["total_fields"],
        )

    except Exception as e:
        logger.error(f"Completeness check error for {item_code}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check completeness: {str(e)}")


@enrichment_router.get("/stats")
async def get_enrichment_statistics(
    start_date: Optional[datetime] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO format)"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get enrichment statistics for a date range
    Shows overall enrichment progress and activity
    """
    if not enrichment_service:
        raise HTTPException(status_code=500, detail="Enrichment service not initialized")

    try:
        stats = await enrichment_service.get_enrichment_stats(
            start_date=start_date, end_date=end_date, user_id=user_id
        )

        return {"success": True, "stats": stats}

    except Exception as e:
        logger.error(f"Enrichment stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get enrichment stats: {str(e)}")


@enrichment_router.get("/incomplete")
async def get_incomplete_items(
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(100, ge=1, le=500, description="Maximum items to return"),
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get items with incomplete data (missing serial#, MRP, HSN, etc.)
    Used to assign enrichment tasks to staff
    """
    if not enrichment_service:
        raise HTTPException(status_code=500, detail="Enrichment service not initialized")

    try:
        items = await enrichment_service.get_items_needing_enrichment(
            category=category, limit=limit
        )

        return {"success": True, "items": items, "count": len(items)}

    except Exception as e:
        logger.error(f"Get incomplete items error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get incomplete items: {str(e)}")


@enrichment_router.get("/leaderboard")
async def get_enrichment_leaderboard_endpoint(
    start_date: Optional[datetime] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date (ISO format)"),
    limit: int = Query(10, ge=1, le=50, description="Number of users to return"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get enrichment leaderboard
    Shows top contributors to data enrichment
    """
    if not enrichment_service:
        raise HTTPException(status_code=500, detail="Enrichment service not initialized")

    try:
        leaderboard = await enrichment_service.get_enrichment_leaderboard(
            start_date=start_date, end_date=end_date, limit=limit
        )

        return {"success": True, "leaderboard": leaderboard}

    except Exception as e:
        logger.error(f"Leaderboard error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get leaderboard: {str(e)}")


@enrichment_router.post("/bulk")
async def bulk_import_enrichments_endpoint(
    request: BulkEnrichmentRequest, current_user: dict = Depends(get_current_user)
):
    """
    Bulk import enrichment data (e.g., from Excel upload)
    Admin/Supervisor can upload Excel with enrichment data
    """
    if not enrichment_service:
        raise HTTPException(status_code=500, detail="Enrichment service not initialized")

    # Check if user has permission for bulk import
    if current_user.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="Only admin/supervisor can perform bulk import")

    try:
        enrichments = [e.model_dump() for e in request.enrichments]

        results = await enrichment_service.bulk_import_enrichments(
            enrichments=enrichments,
            user_id=current_user["_id"],
            username=current_user["username"],
        )

        return {"success": True, "results": results}

    except Exception as e:
        logger.error(f"Bulk import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Bulk import failed: {str(e)}")


@enrichment_router.post("/validate")
async def validate_enrichment_data_endpoint(
    request: EnrichmentRequest, current_user: dict = Depends(get_current_user)
):
    """
    Validate enrichment data before submission
    Frontend can use this to validate user input
    """
    if not enrichment_service:
        raise HTTPException(status_code=500, detail="Enrichment service not initialized")

    try:
        enrichment_data = {
            "serial_number": request.serial_number,
            "mrp": request.mrp,
            "hsn_code": request.hsn_code,
            "barcode": request.barcode,
            "condition": request.condition,
        }

        # Remove None values
        enrichment_data = {k: v for k, v in enrichment_data.items() if v is not None}

        validation_result = enrichment_service.validate_enrichment_data(enrichment_data)

        return {
            "success": True,
            "is_valid": validation_result["is_valid"],
            "errors": validation_result["errors"],
        }

    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
