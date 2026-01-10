"""
API v2 Items Endpoints
Upgraded item endpoints with standardized responses
"""

import asyncio
import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from pydantic import BaseModel

from backend.api.response_models import ApiResponse, PaginatedResponse
from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.server import db
from backend.services.ai_search import ai_search_service

# Add project root to path for direct execution (debugging)
# This allows the file to be run directly for testing/debugging
project_root = Path(__file__).parent.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))


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
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[PaginatedResponse[ItemResponse]]:
    """
    Get items with pagination (v2)
    Returns standardized paginated response
    """
    try:
        from rapidfuzz import fuzz

        # 1. Fetch Candidates (Hybrid Strategy)
        query = {}
        if search:
            # Broaden search to get candidates for fuzzy matching
            # We use a loose regex to filter obvious non-matches at DB level
            # to keep python processing fast.
            query = {
                "$or": [
                    {"item_name": {"$regex": search, "$options": "i"}},
                    {"barcode": {"$regex": search, "$options": "i"}},
                    {"category": {"$regex": search, "$options": "i"}},
                    {"item_code": {"$regex": search, "$options": "i"}},
                ]
            }

        # Optimization: reliable total count for pagination
        # Note: Fuzzy re-ranking messes up simple pagination.
        # Strategy:
        # A) If searching: Fetch ALL candidates (limit 100-200), Rank, Slice.
        # B) If NOT searching: Use standard DB pagination.

        item_responses = []
        total = 0

        if not search:
            # Case B: Standard Pagination
            total = await db.erp_items.count_documents(query)
            skip = (page - 1) * page_size
            items_cursor = db.erp_items.find(query).skip(skip).limit(page_size)
            items = await items_cursor.to_list(length=page_size)
            sorted_items = items
        else:
            # Case A: Fuzzy Search
            # Limit candidate pool to 200 for performance
            items_cursor = db.erp_items.find(query).limit(200)
            candidates = await items_cursor.to_list(length=200)
            total = len(candidates)

            # Scoring
            scored_candidates = []
            for item in candidates:
                # Weighted Score:
                # Name match is worth most (weight 1.0)
                # Barcode match is critical (weight 1.2)
                # Code match is high (1.1)

                name_score = fuzz.partial_ratio(
                    search.lower(), item.get("item_name", "").lower()
                )
                code_score = fuzz.ratio(
                    search.lower(), str(item.get("item_code", "")).lower()
                )
                barcode_score = fuzz.ratio(
                    search.lower(), str(item.get("barcode", "")).lower()
                )

                # Boost exact matches
                final_score = max(name_score, code_score * 1.1, barcode_score * 1.2)

                scored_candidates.append((final_score, item))

            # Sort by score descending
            scored_candidates.sort(key=lambda x: x[0], reverse=True)

            # Pagination on results
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            sorted_items = [x[1] for x in scored_candidates[start_idx:end_idx]]

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
            for item in sorted_items
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


@router.get("/semantic", response_model=ApiResponse[PaginatedResponse[ItemResponse]])
async def search_items_semantic(
    query: str = Query(..., min_length=2, description="Semantic search query"),
    limit: int = Query(20, ge=1, le=50, description="Max results"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[PaginatedResponse[ItemResponse]]:
    """
    Semantic Search (AI-Powered)
    Uses sentence-transformers to find items by meaning/context.
    """
    try:
        # 1. Fetch a broad set of candidates (e.g., all active items or recent ones)
        # In a real vector DB, we'd query the vector index.
        # Here, we'll fetch items and rely on the service to rerank/filter.
        # For performance, we might limit to top 500 or use a text index if available.

        # Fetching top 500 items for re-ranking context
        # This is a compromise for "Local AI" without a Vector DB
        items_cursor = db.erp_items.find({}).limit(500)
        candidates = await items_cursor.to_list(length=500)

        if not candidates:
            return ApiResponse.success_response(
                data=PaginatedResponse.create([], 0, 1, limit),
                message="No items available for semantic search",
            )

        # 2. Perform Semantic Reranking
        # The service will encode the query and candidates, then sort by similarity
        results = ai_search_service.search_rerank(query, candidates, top_k=limit)

        # 3. Convert to Response
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
            for item in results
        ]

        return ApiResponse.success_response(
            data=PaginatedResponse.create(
                item_responses, len(item_responses), 1, limit
            ),
            message=f"Found top {len(item_responses)} semantic matches",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="SEMANTIC_SEARCH_ERROR",
            error_message=f"Semantic search failed: {str(e)}",
        )


@router.get("/{item_id}", response_model=ApiResponse[ItemResponse])
async def get_item_v2(
    item_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[ItemResponse]:
    """
    Get a single item by ID (v2)
    Returns standardized response
    """
    try:
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


@router.post("/identify", response_model=ApiResponse[PaginatedResponse[ItemResponse]])
async def identify_item(
    file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[PaginatedResponse[ItemResponse]]:
    """
    Visual Search / Identify Item
    Accepts an image and returns matching items.
    Currently a mock/placeholder for the VLM integration.
    """
    try:
        # Mock Processing Delay
        await asyncio.sleep(1.0)

        # In a real implementation:
        # 1. Read file content
        #    content = await file.read()
        # 2. Extract features (CLIP/BLIP) or read barcode (pyzbar)
        # 3. Query vector DB + Barcode DB

        # Placeholder Logic:
        # For demo purposes, we will return a few random items
        # pretending we "recognized" something.

        # Determine strictness based on filename (Easter egg for manual testing)
        # If filename contains "coke", search for coke.
        filename = file.filename.lower() if file.filename else ""
        mock_query = ""

        if "coke" in filename or "cola" in filename:
            mock_query = "Cola"
        elif "chip" in filename or "lays" in filename:
            mock_query = "Chips"
        else:
            # Random fallback
            mock_query = "Biscuit"

        # Use Semantic Search to find matches for the "Recognized" term
        items_cursor = db.erp_items.find({}).limit(200)
        candidates = await items_cursor.to_list(length=200)

        results = ai_search_service.search_rerank(mock_query, candidates, top_k=5)

        # Convert to response
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
            for item in results
        ]

        return ApiResponse.success_response(
            data=PaginatedResponse.create(item_responses, len(item_responses), 1, 5),
            message=f"Identified terms: '{mock_query}'",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="VISUAL_SEARCH_ERROR",
            error_message=f"Identification failed: {str(e)}",
        )
