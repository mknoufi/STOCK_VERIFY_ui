import logging
import os
from collections.abc import Sequence
from datetime import date, datetime
from typing import Any, Optional

from fastapi import HTTPException

from backend.api.schemas import ERPItem
from backend.error_messages import get_error_message

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Module-level helpers for _map_erp_item_to_schema (reduce cyclomatic complexity)
# --------------------------------------------------------------------------- #
def _safe_float(val: Any, default: Optional[float] = None) -> Optional[float]:
    """Safely convert a value to float."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_str(val: Any, default: str = "") -> str:
    """Safely convert a value to string."""
    if val is None:
        return default
    return str(val)


def _safe_optional_str(val: Any) -> Optional[str]:
    """Safely convert a value to optional string (None if empty)."""
    if val is None or val == "":
        return None
    return str(val)


def _safe_date_str(val: Any) -> Optional[str]:
    """Convert date/datetime to ISO string."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return datetime.combine(val, datetime.min.time()).isoformat()
    try:
        return str(val)
    except Exception:
        return None


def _add_optional_fields(
    mapped: dict, item: dict, field_defs: Sequence[tuple[str, str, str]]
) -> None:
    """Add optional fields to mapped dict if present in item.

    field_defs: list of (item_key, mapped_key, type) where type is 'str' or 'float'
    """
    for item_key, mapped_key, field_type in field_defs:
        val = item.get(item_key)
        if val is not None:
            if field_type == "float":
                mapped[mapped_key] = _safe_float(val)
            else:
                mapped[mapped_key] = _safe_str(val)


# --------------------------------------------------------------------------- #
# Field definition tuples for _map_erp_item_to_schema
# --------------------------------------------------------------------------- #
_SALES_PRICING_FIELDS = (
    ("sales_price", "sales_price", "float"),
    ("sale_price", "sale_price", "float"),
    ("standard_rate", "standard_rate", "float"),
    ("last_purchase_rate", "last_purchase_rate", "float"),
    ("last_purchase_price", "last_purchase_price", "float"),
)

_BRAND_FIELDS = (
    ("brand_id", "brand_id", "str"),
    ("brand_name", "brand_name", "str"),
    ("brand_code", "brand_code", "str"),
)

_SUPPLIER_FIELDS = (
    ("supplier_id", "supplier_id", "str"),
    ("supplier_code", "supplier_code", "str"),
    ("supplier_name", "supplier_name", "str"),
    ("last_purchase_supplier", "last_purchase_supplier", "str"),
    ("supplier_phone", "supplier_phone", "str"),
    ("supplier_city", "supplier_city", "str"),
    ("supplier_state", "supplier_state", "str"),
    ("supplier_gst", "supplier_gst", "str"),
)

_PURCHASE_FIELDS = (
    ("purchase_price", "purchase_price", "float"),
    ("last_purchase_qty", "last_purchase_qty", "float"),
    ("purchase_qty", "purchase_qty", "float"),
    ("purchase_invoice_no", "purchase_invoice_no", "str"),
    ("purchase_reference", "purchase_reference", "str"),
    ("last_purchase_cost", "last_purchase_cost", "float"),
    ("purchase_voucher_type", "purchase_voucher_type", "str"),
    ("purchase_type", "purchase_type", "str"),
)


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


def _get_barcode_variations(barcode: str) -> list[str]:
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


def _map_erp_item_to_schema(item: dict[str, Any], original_barcode: str = None) -> dict[str, Any]:
    """Map raw ERP item data to internal schema format."""
    mapped = {
        "item_code": _safe_str(item.get("item_code"), ""),
        "item_name": _safe_str(item.get("item_name"), ""),
        "barcode": _safe_str(item.get("barcode"), original_barcode or ""),
        "stock_qty": _safe_float(item.get("stock_qty"), 0.0),
        "mrp": _safe_float(item.get("mrp"), 0.0),
        "category": _safe_str(item.get("category"), "General"),
        "subcategory": _safe_str(item.get("subcategory"), ""),
        "warehouse": _safe_str(item.get("warehouse"), "Main"),
        "location": _safe_str(item.get("location"), ""),
        "uom_code": _safe_str(item.get("uom_code"), ""),
        "uom_name": _safe_str(item.get("uom_name"), ""),
        "hsn_code": _safe_optional_str(item.get("hsn_code")),
        "gst_category": _safe_optional_str(item.get("gst_category")),
        "gst_percent": _safe_float(item.get("gst_percent")),
        "sgst_percent": _safe_float(item.get("sgst_percent")),
        "cgst_percent": _safe_float(item.get("cgst_percent")),
        "igst_percent": _safe_float(item.get("igst_percent")),
        "floor": _safe_str(item.get("floor"), ""),
        "rack": _safe_str(item.get("rack"), ""),
        "manual_barcode": _safe_str(item.get("manual_barcode"), ""),
        "batch_id": _safe_optional_str(item.get("batch_id")),
        "batch_no": _safe_optional_str(item.get("batch_no")),
        "manufacturing_date": _safe_date_str(item.get("mfg_date")),
        "expiry_date": _safe_date_str(item.get("expiry_date")),
    }

    # Apply optional field groups using module-level tuple definitions
    for field_group in (
        _SALES_PRICING_FIELDS,
        _BRAND_FIELDS,
        _SUPPLIER_FIELDS,
        _PURCHASE_FIELDS,
    ):
        _add_optional_fields(mapped, item, field_group)

    # Special case: keep datetime object
    if item.get("last_purchase_date") is not None:
        mapped["last_purchase_date"] = item.get("last_purchase_date")

    return mapped


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
) -> dict[str, Any]:
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


async def search_items_in_erp(search_term: str, sql_connector: Any, db: Any) -> list[ERPItem]:
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
