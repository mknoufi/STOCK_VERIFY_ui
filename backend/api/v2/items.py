"""
API v2 Items Endpoints
Upgraded item endpoints with standardized responses
"""

# ruff: noqa: E402
import sys
from pathlib import Path

# Add project root to path for direct execution (debugging)
# This allows the file to be run directly for testing/debugging
project_root = Path(__file__).parent.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from typing import Any, Dict, Optional, cast  # noqa: E402

from fastapi import APIRouter, Depends, Query  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from backend.api.response_models import ApiResponse, PaginatedResponse  # noqa: E402
from backend.auth.dependencies import get_current_user_async as get_current_user  # noqa: E402
from backend.utils.security_utils import create_safe_regex_query  # noqa: E402

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
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[PaginatedResponse[ItemResponse]]:
    """
    Get items with pagination (v2)
    Returns standardized paginated response
    """
    try:
        from backend.server import db

        # Build query
        query = {}
        if search:
            # SECURITY: Use escaped regex to prevent ReDoS attacks (CWE-1333)
            query = {
                "$or": [
                    {"item_name": create_safe_regex_query(search)},
                    {"barcode": create_safe_regex_query(search)},
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

        return cast(
            ApiResponse[PaginatedResponse[ItemResponse]],
            ApiResponse.success_response(
                data=paginated_response,
                message=f"Retrieved {len(item_responses)} items",
            ),
        )

    except Exception as e:
        return cast(
            ApiResponse[PaginatedResponse[ItemResponse]],
            ApiResponse.error_response(
                error_code="ITEMS_FETCH_ERROR",
                error_message=f"Failed to fetch items: {str(e)}",
            ),
        )


@router.get("/{item_id}", response_model=ApiResponse[ItemResponse])
async def get_item_v2(
    item_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[ItemResponse]:
    """
    Get a single item by ID (v2)
    Returns standardized response
    """
    try:
        from bson import ObjectId

        from backend.server import db

        item = await db.erp_items.find_one({"_id": ObjectId(item_id)})

        if not item:
            return cast(
                ApiResponse[ItemResponse],
                ApiResponse.error_response(
                    error_code="ITEM_NOT_FOUND",
                    error_message=f"Item with ID {item_id} not found",
                ),
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

        return cast(
            ApiResponse[ItemResponse],
            ApiResponse.success_response(
                data=item_response,
                message="Item retrieved successfully",
            ),
        )

    except Exception as e:
        return cast(
            ApiResponse[ItemResponse],
            ApiResponse.error_response(
                error_code="ITEM_FETCH_ERROR",
                error_message=f"Failed to fetch item: {str(e)}",
            ),
        )
