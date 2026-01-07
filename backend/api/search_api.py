"""
Search API - Optimized Item Search Endpoints

Provides debounce-friendly search with:
- Relevance scoring (exact barcode > partial barcode > name match)
- Pagination for large result sets
- Redis caching for repeat queries
- Autocomplete suggestions

Part of US1: Optimized Item Search
"""

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.api.response_models import ApiResponse
from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.services.search_service import (
    SearchResult,
    get_search_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/items", tags=["Search"])


# Response Models
class SearchItemResponse(BaseModel):
    """Search result item"""

    id: str = Field(..., description="Item ID")
    item_name: str = Field(..., description="Item name")
    item_code: Optional[str] = Field(None, description="Item code")
    barcode: Optional[str] = Field(None, description="Barcode")
    stock_qty: float = Field(0.0, description="Stock quantity")
    mrp: Optional[float] = Field(None, description="MRP/Price")
    sale_price: Optional[float] = Field(None, description="Sale Price")
    category: Optional[str] = Field(None, description="Category")
    subcategory: Optional[str] = Field(None, description="Subcategory")
    warehouse: Optional[str] = Field(None, description="Warehouse")
    uom_name: Optional[str] = Field(None, description="Unit of measure")
    manual_barcode: Optional[str] = Field(None, description="Manual barcode")
    unit2_barcode: Optional[str] = Field(None, description="Unit 2 barcode")
    unit_m_barcode: Optional[str] = Field(None, description="Unit M barcode")
    batch_id: Optional[str] = Field(None, description="Batch ID")
    relevance_score: float = Field(0.0, description="Search relevance score")
    match_type: str = Field("none", description="Type of match found")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",  # pragma: allowlist secret
                "item_name": "Apple iPhone 15 Pro",
                "item_code": "IPHONE15PRO",
                "barcode": "5100001234",
                "stock_qty": 25.0,
                "mrp": 129900.0,
                "category": "Electronics",
                "subcategory": "Smartphones",
                "warehouse": "Main",
                "uom_name": "Piece",
                "relevance_score": 1000.0,
                "match_type": "exact_barcode",
            }
        }


class SearchMetadata(BaseModel):
    """Search metadata"""

    query: str = Field(..., description="Original search query")
    has_more: bool = Field(False, description="Whether more results are available")


class OptimizedSearchResponse(BaseModel):
    """Optimized search response with metadata"""

    items: list[SearchItemResponse]
    total: int
    page: int
    page_size: int
    metadata: SearchMetadata


class SuggestionsResponse(BaseModel):
    """Autocomplete suggestions response"""

    suggestions: list[str]
    query: str


# Helper function to convert SearchResult to response model
def _to_response(result: SearchResult) -> SearchItemResponse:
    return SearchItemResponse(
        id=result.id,
        item_name=result.item_name,
        item_code=result.item_code,
        barcode=result.barcode,
        stock_qty=result.stock_qty,
        mrp=result.mrp,
        sale_price=result.sale_price,
        category=result.category,
        subcategory=result.subcategory,
        warehouse=result.warehouse,
        uom_name=result.uom_name,
        manual_barcode=result.manual_barcode,
        unit2_barcode=result.unit2_barcode,
        unit_m_barcode=result.unit_m_barcode,
        batch_id=result.batch_id,
        relevance_score=result.relevance_score,
        match_type=result.match_type,
    )


@router.get(
    "/search/optimized",
    response_model=ApiResponse[OptimizedSearchResponse],
    summary="Optimized item search",
    description="""
    Search items with relevance scoring and pagination.

    **Scoring Priority:**
    1. Exact barcode match (1000 points)
    2. Partial barcode prefix match (500+ points)
    3. Exact item_code match (400 points)
    4. Name prefix match (300+ points)
    5. Name contains query (200+ points)
    6. Fuzzy name match (0-100 points)

    **Usage Tips:**
    - Use with 300ms debounce on frontend
    - Barcode scans return instant exact matches
    - Minimum query length is 2 characters
    """,
)
async def search_optimized(
    q: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="Search query (barcode, name, or code)",
        examples=["5100001234", "iphone", "PROD"],
    ),
    limit: int = Query(
        20,
        ge=1,
        le=50,
        description="Items per page (max 50)",
    ),
    offset: int = Query(
        0,
        ge=0,
        description="Offset for pagination",
    ),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[OptimizedSearchResponse]:
    """
    Execute optimized search with relevance scoring.

    This endpoint is designed for frontend debounced search (300ms).
    Returns scored results prioritizing exact barcode matches.
    """
    try:
        search_service = get_search_service()

        # Convert offset/limit to page/page_size
        page = (offset // limit) + 1
        page_size = limit

        result = await search_service.search(
            query=q,
            page=page,
            page_size=page_size,
        )

        response = OptimizedSearchResponse(
            items=[_to_response(item) for item in result.items],
            total=result.total,
            page=result.page,
            page_size=result.page_size,
            metadata=SearchMetadata(
                query=result.query,
                has_more=result.has_more,
            ),
        )

        return ApiResponse.success_response(
            data=response,
            message=f"Found {result.total} items",
        )

    except RuntimeError as e:
        logger.error(f"Search service not initialized: {e}")
        raise HTTPException(
            status_code=503,
            detail="Search service unavailable",
        )
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Search failed",
        )


@router.post(
    "/search/optimized",
    response_model=ApiResponse[OptimizedSearchResponse],
    summary="Optimized item search (POST)",
    description="POST version for search - allows body parameters for complex queries",
)
async def search_optimized_post(
    q: str = Query(
        ...,
        min_length=1,
        max_length=100,
        description="Search query",
    ),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[OptimizedSearchResponse]:
    """POST version of optimized search (for compatibility)"""
    return await search_optimized(
        q=q, limit=limit, offset=offset, current_user=current_user
    )


@router.get(
    "/search/suggestions",
    response_model=ApiResponse[SuggestionsResponse],
    summary="Get autocomplete suggestions",
    description="Returns up to 5 name suggestions for autocomplete",
)
async def get_suggestions(
    q: str = Query(
        ...,
        min_length=2,
        max_length=50,
        description="Search prefix",
    ),
    limit: int = Query(5, ge=1, le=10),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[SuggestionsResponse]:
    """Get autocomplete suggestions for a search prefix"""
    try:
        search_service = get_search_service()
        suggestions = await search_service.get_suggestions(q, limit)

        return ApiResponse.success_response(
            data=SuggestionsResponse(
                suggestions=suggestions,
                query=q,
            ),
            message=f"Found {len(suggestions)} suggestions",
        )
    except RuntimeError as e:
        logger.error(f"Search service not initialized: {e}")
        raise HTTPException(status_code=503, detail="Search service unavailable")
    except Exception as e:
        logger.error(f"Suggestions failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to get suggestions")
