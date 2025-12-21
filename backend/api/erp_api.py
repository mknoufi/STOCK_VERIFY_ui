import logging
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.api.schemas import ERPItem
from backend.auth.dependencies import get_current_user
from backend.error_messages import get_error_message
from backend.services.cache_service import CacheService

logger = logging.getLogger(__name__)
router = APIRouter()

_db: Optional[AsyncIOMotorDatabase[Any]] = None
_cache_service: Optional[CacheService] = None


def init_erp_api(
    db: AsyncIOMotorDatabase,
    cache_service: CacheService,
):
    global _db, _cache_service
    _db = db
    _cache_service = cache_service


_ALPHANUMERIC_PATTERN = re.compile(r"^[A-Z0-9_\-]+$")


def _normalize_barcode_input(barcode: str, *, allow_alphanumeric: bool = True) -> str:
    """Normalize and validate barcode or item code input.

    Rules derived from tests and existing usage:
    - Empty values are rejected with 400.
    - Numeric barcodes must be exactly 6 digits and start with 51, 52 or 53.
      (Used for /erp/items/barcode and enhanced barcode lookups.)
    - When ``allow_alphanumeric`` is True, non-numeric item codes such as
      "TEST001" are allowed for endpoints like refresh-stock.
    """

    if not barcode or not barcode.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Barcode cannot be empty",
                "error_code": "INVALID_BARCODE_EMPTY",
            },
        )

    normalized = barcode.strip().upper()

    # Strict rules for numeric barcodes used in public barcode endpoints
    if normalized.isdigit():
        if len(normalized) != 6:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Numeric barcode must be exactly 6 digits",
                    "barcode": normalized,
                    "error_code": "INVALID_BARCODE_LENGTH",
                },
            )

        if normalized[:2] not in {"51", "52", "53"}:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Invalid barcode prefix. Allowed prefixes are 51, 52, 53.",
                    "barcode": normalized,
                    "error_code": "INVALID_BARCODE_PREFIX",
                },
            )

        return normalized

    # For barcode endpoints we do not allow non-numeric values
    if not allow_alphanumeric:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Barcode must be numeric for this endpoint",
                "barcode": normalized,
                "error_code": "INVALID_BARCODE_FORMAT",
            },
        )

    # Alphanumeric validation for item_code-style inputs (e.g. refresh-stock)
    if _ALPHANUMERIC_PATTERN.fullmatch(normalized):
        if len(normalized) < 2:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Item code must be at least 2 characters",
                    "barcode": normalized,
                    "error_code": "INVALID_ITEM_CODE_LENGTH",
                },
            )
        if len(normalized) > 50:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Item code is too long (max 50 characters)",
                    "barcode": normalized,
                    "error_code": "INVALID_ITEM_CODE_LENGTH",
                },
            )
        return normalized

    raise HTTPException(
        status_code=400,
        detail={
            "message": "Invalid barcode format. Use letters, numbers, hyphens, or underscores.",
            "barcode": normalized,
            "error_code": "INVALID_BARCODE_FORMAT",
        },
    )


@router.get("/erp/items/barcode/{barcode}", response_model=ERPItem)
async def get_item_by_barcode(
    barcode: str, current_user: dict = Depends(get_current_user)
):
    """
    Get item details by barcode from MongoDB.
    """
    if _db is None or _cache_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # For barcode lookups, we only accept numeric barcodes with valid prefixes
    normalized_barcode = _normalize_barcode_input(barcode, allow_alphanumeric=False)

    # Check cache first
    cached_item = await _cache_service.get("items", normalized_barcode)
    if cached_item:
        logger.debug(f"Item found in cache: {barcode}")
        return ERPItem(**cached_item)

    # Fallback to MongoDB
    regex_match = {"$regex": f"^{re.escape(normalized_barcode)}$", "$options": "i"}
    item = await _db.erp_items.find_one(
        {
            "$or": [
                {"barcode": normalized_barcode},
                {"autobarcode": normalized_barcode},
                {"manual_barcode": normalized_barcode},
                {"item_code": normalized_barcode},
                {"item_code": regex_match},
            ]
        }
    )
    if not item:
        error = get_error_message("DB_ITEM_NOT_FOUND", {"barcode": barcode})
        logger.warning(f"Item not found in MongoDB: barcode={normalized_barcode}")
        raise HTTPException(
            status_code=error["status_code"],
            detail={
                "message": error["message"],
                "detail": f"{error['detail']} Barcode: {normalized_barcode}.",
                "code": error["code"],
                "category": error["category"],
                "barcode": normalized_barcode,
                "source": "mongodb",
            },
        )

    # Cache for 1 hour
    await _cache_service.set("items", normalized_barcode, item, ttl=3600)
    logger.debug(f"Item fetched from MongoDB: barcode={normalized_barcode}")

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

    # For refresh-stock we accept both numeric barcodes and item codes
    normalized_code = _normalize_barcode_input(item_code)

    regex_match = {"$regex": f"^{re.escape(normalized_code)}$", "$options": "i"}
    item = await _db.erp_items.find_one(
        {
            "$or": [
                {"item_code": normalized_code},
                {"item_code": regex_match},
                {"barcode": normalized_code},
                {"manual_barcode": normalized_code},
            ]
        }
    )
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
        search_term = search.strip()

        # Search in MongoDB
        items_cursor = _db.erp_items.find(
            {
                "$or": [
                    {"item_name": {"$regex": search_term, "$options": "i"}},
                    {"item_code": {"$regex": search_term, "$options": "i"}},
                    {"barcode": {"$regex": search_term, "$options": "i"}},
                    {"manual_barcode": {"$regex": search_term, "$options": "i"}},
                ]
            }
        )
        total = await _db.erp_items.count_documents(
            {
                "$or": [
                    {"item_name": {"$regex": search_term, "$options": "i"}},
                    {"item_code": {"$regex": search_term, "$options": "i"}},
                    {"barcode": {"$regex": search_term, "$options": "i"}},
                    {"manual_barcode": {"$regex": search_term, "$options": "i"}},
                ]
            }
        )
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
    query: Optional[str] = Query(
        None, description="Search term (legacy param 'query')"
    ),
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
