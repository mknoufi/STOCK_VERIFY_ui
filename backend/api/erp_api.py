import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.api.schemas import ERPItem
from backend.auth.dependencies import get_current_user
from backend.error_messages import get_error_message
from backend.services.cache_service import CacheService
from backend.utils.security_utils import escape_regex, create_safe_regex_query

logger = logging.getLogger(__name__)
router = APIRouter()

_db: Optional[AsyncIOMotorDatabase] = None
_cache_service: Optional[CacheService] = None


def init_erp_api(
    db: AsyncIOMotorDatabase,
    cache_service: CacheService,
):
    global _db, _cache_service
    _db = db
    _cache_service = cache_service


@router.get("/erp/items/barcode/{barcode}", response_model=ERPItem)
async def get_item_by_barcode(barcode: str, current_user: dict = Depends(get_current_user)):
    """
    Get item details by barcode from MongoDB.
    """
    if _db is None or _cache_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Check cache first
    cached_item = await _cache_service.get("items", barcode)
    if cached_item:
        logger.debug(f"Item found in cache: {barcode}")
        return ERPItem(**cached_item)

    # Fallback to MongoDB
    # Search in multiple barcode fields (Manual -> Auto -> PLU -> Barcode)
    item = await _db.erp_items.find_one(
        {
            "$or": [
                {"barcode": barcode},
                {"manual_barcode": barcode},
                {"auto_barcode": barcode},
                {"plu_code": barcode},
            ]
        }
    )
    if not item:
        error = get_error_message("DB_ITEM_NOT_FOUND", {"barcode": barcode})
        logger.warning(f"Item not found in MongoDB: barcode={barcode}")
        raise HTTPException(
            status_code=error["status_code"],
            detail={
                "message": error["message"],
                "detail": f"{error['detail']} Barcode: {barcode}.",
                "code": error["code"],
                "category": error["category"],
                "barcode": barcode,
                "source": "mongodb",
            },
        )

    # Cache for 1 hour
    await _cache_service.set("items", barcode, item, ttl=3600)
    logger.debug(f"Item fetched from MongoDB: barcode={barcode}")

    return ERPItem(**item)


@router.post("/erp/items/{item_code}/refresh-stock")
async def refresh_item_stock(
    request: Request, item_code: str, current_user: dict = Depends(get_current_user)
):
    """
    Refresh item stock from ERP and update MongoDB
    (Now just returns the data from MongoDB as ERP is disabled)
    """
    if _db is None or _cache_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Get from MongoDB
    item = await _db.erp_items.find_one({"item_code": item_code})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    return {
        "success": True,
        "item": ERPItem(**item),
        "message": "Stock from MongoDB (ERP connection is disabled)",
    }


@router.get("/erp/items")
async def get_all_items(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
):
    """
    Get all items or search items from MongoDB
    """
    if _db is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # If search query provided, search items
    if search and search.strip():
        # SECURITY: Escape regex special characters to prevent ReDoS attacks (CWE-1333)
        search_term = escape_regex(search.strip())

        # Search in MongoDB with escaped pattern
        search_query = {
            "$or": [
                {"item_name": create_safe_regex_query(search.strip())},
                {"item_code": create_safe_regex_query(search.strip())},
                {"barcode": create_safe_regex_query(search.strip())},
                {"manual_barcode": create_safe_regex_query(search.strip())},
                {"auto_barcode": create_safe_regex_query(search.strip())},
                {"plu_code": create_safe_regex_query(search.strip())},
            ]
        }
        items_cursor = _db.erp_items.find(search_query)
        total = await _db.erp_items.count_documents(search_query)
        skip = (page - 1) * page_size
        items = await items_cursor.skip(skip).limit(page_size).to_list(page_size)

        # Ensure all items have required fields with defaults
        normalized_items = []
        for item in items:
            if "category" not in item:
                item["category"] = "General"
            if "warehouse" not in item:
                item["warehouse"] = "Main"
            normalized_items.append(item)

        return {
            "items": [ERPItem(**item) for item in normalized_items],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
                "has_next": skip + page_size < total,
                "has_prev": page > 1,
            },
        }

    # No search: return all items from MongoDB with pagination
    total = await _db.erp_items.count_documents({})
    skip = (page - 1) * page_size
    items_cursor = _db.erp_items.find().sort("item_name", 1).skip(skip).limit(page_size)
    items = await items_cursor.to_list(page_size)

    return {
        "items": [ERPItem(**item) for item in items],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": skip + page_size < total,
            "has_prev": page > 1,
        },
    }


@router.get("/items/search")
async def search_items_compatibility(
    query: Optional[str] = Query(None, description="Search term (legacy param 'query')"),
    search: Optional[str] = Query(None, description="Alternate search param"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: dict = Depends(get_current_user),
):
    """
    Compatibility endpoint for legacy clients that call `/api/items/search?query=...`.
    Reuses the new `/api/erp/items?search=...` implementation.
    """
    search_term = (query or search or "").strip()
    if not search_term:
        raise HTTPException(
            status_code=400,
            detail="Missing search term. Provide ?query= or ?search= parameter.",
        )

    return await get_all_items(
        search=search_term,
        current_user=current_user,
        page=page,
        page_size=page_size,
    )


@router.get("/erp/categories")
async def get_categories(current_user: dict = Depends(get_current_user)):
    """
    Get all unique categories and subcategories from the ERP items collection.
    Returns a list of categories with their associated subcategories.
    """
    if _db is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        # Aggregate categories and subcategories
        pipeline = [
            {
                "$match": {
                    "category": {"$exists": True, "$ne": None, "$ne": ""}
                }
            },
            {
                "$group": {
                    "_id": "$category",
                    "subcategories": {"$addToSet": "$subcategory"},
                    "item_count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]

        categories = []
        async for doc in _db.erp_items.aggregate(pipeline):
            # Filter out empty/null subcategories
            subcats = [s for s in doc.get("subcategories", []) if s]
            categories.append({
                "name": doc["_id"],
                "subcategories": sorted(subcats),
                "item_count": doc["item_count"]
            })

        # Also get items without category
        uncategorized_count = await _db.erp_items.count_documents({
            "$or": [
                {"category": {"$exists": False}},
                {"category": None},
                {"category": ""}
            ]
        })

        if uncategorized_count > 0:
            categories.append({
                "name": "Uncategorized",
                "subcategories": [],
                "item_count": uncategorized_count
            })

        return {
            "success": True,
            "data": {
                "categories": categories,
                "total_categories": len(categories)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch categories: {str(e)}"
        )


@router.get("/erp/subcategories/{category}")
async def get_subcategories(category: str, current_user: dict = Depends(get_current_user)):
    """
    Get all subcategories for a specific category.
    """
    if _db is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        subcategories = await _db.erp_items.distinct(
            "subcategory",
            {"category": category, "subcategory": {"$exists": True, "$ne": None, "$ne": ""}}
        )

        return {
            "success": True,
            "data": {
                "category": category,
                "subcategories": sorted(subcategories),
                "count": len(subcategories)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching subcategories for {category}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch subcategories: {str(e)}"
        )
