"""
API v2 Items Endpoints
Upgraded item endpoints with standardized responses
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from pydantic import BaseModel

from backend.api.response_models import ApiResponse, PaginatedResponse
from backend.auth.dependencies import get_current_user_async as get_current_user

router = APIRouter()


class ItemResponse(BaseModel):
    """Item response model"""

    id: str
    name: str
    item_code: Optional[str] = None
    barcode: Optional[str] = None
    stock_qty: float
    mrp: Optional[float] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    warehouse: Optional[str] = None
    uom_name: Optional[str] = None


@router.get("/", response_model=ApiResponse[PaginatedResponse[ItemResponse]])
async def get_items_v2(
    search: Optional[str] = Query(None, description="Search by name or barcode"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get items with pagination (v2)
    Returns standardized paginated response
    """
    try:
        from backend.server import db

        # Build query
        query = {}
        if search:
            query = {
                "$or": [
                    {"item_name": {"$regex": search, "$options": "i"}},
                    {"barcode": {"$regex": search, "$options": "i"}},
                ]
            }

        # Get total count
        total = await db.erp_items.count_documents(query)

        # Get paginated items
        skip = (page - 1) * page_size
        items_cursor = db.erp_items.find(query).skip(skip).limit(page_size)
        items = await items_cursor.to_list(length=page_size)

        # Convert to response models
        item_responses = [
            ItemResponse(
                id=str(item["_id"]),
                name=item.get("item_name", ""),
                item_code=item.get("item_code"),
                barcode=item.get("barcode"),
                stock_qty=item.get("stock_qty", 0.0),
                mrp=item.get("mrp"),
                category=item.get("category"),
                subcategory=item.get("subcategory"),
                warehouse=item.get("warehouse"),
                uom_name=item.get("uom_name"),
            )
            for item in items
        ]

        paginated_response = PaginatedResponse.create(
            items=item_responses,
            total=total,
            page=page,
            page_size=page_size,
        )

        return ApiResponse.success_response(
            data=paginated_response,
            message=f"Retrieved {len(item_responses)} items",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="ITEMS_FETCH_ERROR",
            error_message=f"Failed to fetch items: {str(e)}",
        )


@router.get("/{item_id}", response_model=ApiResponse[ItemResponse])
async def get_item_v2(
    item_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get a single item by ID (v2)
    Returns standardized response
    """
    try:
        from backend.server import db
        from bson import ObjectId

        item = await db.erp_items.find_one({"_id": ObjectId(item_id)})

        if not item:
            return ApiResponse.error_response(
                error_code="ITEM_NOT_FOUND",
                error_message=f"Item with ID {item_id} not found",
            )

        item_response = ItemResponse(
            id=str(item["_id"]),
            name=item.get("item_name", ""),
            item_code=item.get("item_code"),
            barcode=item.get("barcode"),
            stock_qty=item.get("stock_qty", 0.0),
            mrp=item.get("mrp"),
            category=item.get("category"),
            subcategory=item.get("subcategory"),
            warehouse=item.get("warehouse"),
            uom_name=item.get("uom_name"),
        )

        return ApiResponse.success_response(
            data=item_response,
            message="Item retrieved successfully",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="ITEM_FETCH_ERROR",
            error_message=f"Failed to fetch item: {str(e)}",
        )
