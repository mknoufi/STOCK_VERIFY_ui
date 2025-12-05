import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from backend.api.schemas import ERPItem
from backend.error_messages import get_error_message

logger = logging.getLogger(__name__)


async def _ensure_sql_connection(sql_connector: Any, db: Any) -> bool:
    """Ensure SQL Server connection is established if configured."""
    config = await db.erp_config.find_one({})

    if not config or not config.get("use_sql_server", False):
        return False

    if sql_connector.test_connection():
        return True

    try:
        host = config.get("host") or os.getenv("SQL_SERVER_HOST")
        port = config.get("port") or int(os.getenv("SQL_SERVER_PORT", 1433))
        database = config.get("database") or os.getenv("SQL_SERVER_DATABASE")
        user = config.get("user") or os.getenv("SQL_SERVER_USER")
        password = config.get("password") or os.getenv("SQL_SERVER_PASSWORD")

        if host and database:
            sql_connector.connect(host, port, database, user, password)
            return True
    except Exception as e:
        logger.warning(f"Failed to establish SQL Server connection: {str(e)}")

    return False


def _get_barcode_variations(barcode: str) -> List[str]:
    """Generate barcode variations for lookup."""
    normalized_barcode = barcode.strip()
    variations = [normalized_barcode]

    if normalized_barcode.isdigit():
        # Pad to 6 digits if less than 6
        if len(normalized_barcode) < 6:
            padded = normalized_barcode.zfill(6)
            variations.append(padded)
            logger.info(f"Trying padded 6-digit barcode: {padded} (from {normalized_barcode})")

        # Try exact 6-digit format
        if len(normalized_barcode) != 6:
            # If more than 6 digits, try trimming leading zeros
            trimmed = normalized_barcode.lstrip("0")
            if trimmed and len(trimmed) <= 6:
                padded_trimmed = trimmed.zfill(6)
                variations.append(padded_trimmed)
                logger.info(
                    f"Trying trimmed 6-digit barcode: {padded_trimmed} (from {normalized_barcode})"
                )

    return variations


def _map_erp_item_to_schema(
    item: Dict[str, Any], original_barcode: Optional[str] = None
) -> Dict[str, Any]:
    """Map raw ERP item data to internal schema format."""
    return {
        "item_code": item.get("item_code", ""),
        "item_name": item.get("item_name", ""),
        "barcode": item.get("barcode", original_barcode or ""),
        "stock_qty": float(item.get("stock_qty", 0.0)),
        "mrp": float(item.get("mrp", 0.0)),
        "category": item.get("category", "General"),
        "subcategory": item.get("subcategory", ""),
        "warehouse": item.get("warehouse", "Main"),
        "uom_code": item.get("uom_code", ""),
        "uom_name": item.get("uom_name", ""),
        "floor": item.get("floor", ""),
        "rack": item.get("rack", ""),
        "manual_barcode": item.get("manual_barcode", ""),
    }


async def _fetch_from_mongo_fallback(barcode: str, db: Any, cache_service: Any) -> ERPItem:
    """Fallback to MongoDB cache when ERP is unavailable."""
    item = await db.erp_items.find_one({"barcode": barcode})
    if not item:
        error = get_error_message("DB_ITEM_NOT_FOUND", {"barcode": barcode})
        logger.warning(f"Item not found in MongoDB cache: barcode={barcode}")
        raise HTTPException(
            status_code=error["status_code"],
            detail={
                "message": error["message"],
                "detail": f"{error['detail']} Barcode: {barcode}. Note: ERP system is not configured, using cached data.",
                "code": error["code"],
                "category": error["category"],
                "barcode": barcode,
                "source": "mongodb_cache",
            },
        )

    # Cache for 1 hour
    await cache_service.set("items", barcode, item, ttl=3600)
    logger.debug(f"Item fetched from MongoDB cache: barcode={barcode}")

    return ERPItem(**item)


async def fetch_item_from_erp(
    barcode: str, sql_connector: Any, db: Any, cache_service: Any
) -> ERPItem:
    """
    Fetch item by barcode from ERP (SQL Server) with fallback to MongoDB and caching.
    """
    # Try cache first
    cached = await cache_service.get("items", barcode)
    if cached:
        return ERPItem(**cached)

    # Check connection
    is_connected = await _ensure_sql_connection(sql_connector, db)

    if is_connected:
        # Fetch from SQL Server (Polosys ERP)
        try:
            barcode_variations = _get_barcode_variations(barcode)
            item = None
            tried_barcodes = []

            for barcode_variant in barcode_variations:
                tried_barcodes.append(barcode_variant)
                item = sql_connector.get_item_by_barcode(barcode_variant)
                if item:
                    logger.info(
                        f"Found item with barcode variant: {barcode_variant} (original: {barcode})"
                    )
                    # Keep original barcode in response
                    item["barcode"] = barcode.strip()
                    break

            if not item:
                error = get_error_message("ERP_ITEM_NOT_FOUND", {"barcode": barcode})
                logger.warning(
                    f"Item not found in ERP: barcode={barcode}, tried variations: {tried_barcodes}"
                )
                raise HTTPException(
                    status_code=error["status_code"],
                    detail={
                        "message": error["message"],
                        "detail": f"{error['detail']} Barcode: {barcode}. Tried variations: {', '.join(tried_barcodes)}",
                        "code": error["code"],
                        "category": error["category"],
                        "barcode": barcode,
                        "tried_variations": tried_barcodes,
                    },
                )

            item_data = _map_erp_item_to_schema(item, barcode)

            # Cache for 1 hour
            await cache_service.set("items", barcode, item_data, ttl=3600)
            logger.info(f"Item fetched from ERP: {item_data.get('item_code')} (barcode: {barcode})")

            return ERPItem(**item_data)
        except HTTPException:
            raise
        except Exception as e:
            error = get_error_message("ERP_QUERY_FAILED", {"barcode": barcode, "error": str(e)})
            logger.error(f"ERP query error for barcode {barcode}: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=error["status_code"],
                detail={
                    "message": error["message"],
                    "detail": f"{error['detail']} Barcode: {barcode}. Error: {str(e)}",
                    "code": error["code"],
                    "category": error["category"],
                    "barcode": barcode,
                },
            )

    return await _fetch_from_mongo_fallback(barcode, db, cache_service)


async def refresh_stock_from_erp(
    item_code: str, sql_connector: Any, db: Any, cache_service: Any
) -> Dict[str, Any]:
    """
    Refresh item stock from ERP and update MongoDB.
    """
    is_connected = await _ensure_sql_connection(sql_connector, db)

    if is_connected:
        try:
            # Try by item code first
            item = sql_connector.get_item_by_code(item_code)

            # If not found by code, try to get from MongoDB first to get barcode
            if not item:
                mongo_item = await db.erp_items.find_one({"item_code": item_code})
                if mongo_item and mongo_item.get("barcode"):
                    item = sql_connector.get_item_by_barcode(mongo_item.get("barcode"))

            if not item:
                error = get_error_message("ERP_ITEM_NOT_FOUND", {"item_code": item_code})
                raise HTTPException(
                    status_code=error["status_code"],
                    detail={
                        "message": error["message"],
                        "detail": f"{error['detail']} Item Code: {item_code}",
                        "code": error["code"],
                        "category": error["category"],
                    },
                )

            # Prepare updated item data
            item_data = _map_erp_item_to_schema(item)
            # Add sync metadata
            item_data.update(
                {
                    "synced_at": datetime.utcnow(),
                    "synced_from_erp": True,
                    "last_erp_update": datetime.utcnow(),
                }
            )

            # Update MongoDB
            await db.erp_items.update_one(
                {"item_code": item_code},
                {"$set": item_data, "$setOnInsert": {"created_at": datetime.utcnow()}},
                upsert=True,
            )

            # Clear cache
            await cache_service.delete("items", item_data.get("barcode", ""))

            logger.info(f"Stock refreshed from ERP: {item_code} - Stock: {item_data['stock_qty']}")

            return {
                "success": True,
                "item": ERPItem(**item_data),
                "message": f"Stock updated: {item_data['stock_qty']}",
            }

        except HTTPException:
            raise
        except Exception as e:
            error = get_error_message("ERP_CONNECTION_ERROR", {"error": str(e)})
            logger.error(f"Failed to refresh stock from ERP: {str(e)}")
            raise HTTPException(
                status_code=error["status_code"],
                detail={
                    "message": error["message"],
                    "detail": f"Failed to refresh stock: {str(e)}",
                    "code": error["code"],
                    "category": error["category"],
                },
            )

    # Fallback: Get from MongoDB
    item = await db.erp_items.find_one({"item_code": item_code})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    return {
        "success": True,
        "item": ERPItem(**item),
        "message": "Stock from MongoDB (ERP connection not available)",
    }


async def search_items_in_erp(search_term: str, sql_connector: Any, db: Any) -> List[ERPItem]:
    """
    Search items in ERP or MongoDB.
    """
    is_connected = await _ensure_sql_connection(sql_connector, db)

    if is_connected:
        # Search in SQL Server (Polosys ERP)
        try:
            items = sql_connector.search_items(search_term)
            result_items = [_map_erp_item_to_schema(item) for item in items]

            logger.info(f"Search in ERP returned {len(result_items)} items for '{search_term}'")
            return [ERPItem(**item) for item in result_items]
        except Exception as e:
            logger.error(f"ERP search error: {str(e)}")
            # Fallback to MongoDB
            pass

    # Fallback: Search in MongoDB
    query = {
        "$or": [
            {"item_name": {"$regex": search_term, "$options": "i"}},
            {"item_code": {"$regex": search_term, "$options": "i"}},
            {"barcode": {"$regex": search_term, "$options": "i"}},
        ]
    }
    cursor = db.erp_items.find(query).limit(50)
    items = await cursor.to_list(length=50)

    return [ERPItem(**item) for item in items]
