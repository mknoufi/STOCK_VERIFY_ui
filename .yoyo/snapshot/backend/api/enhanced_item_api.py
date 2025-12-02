"""
Enhanced Item API - Upgraded endpoints with better error handling,
caching, validation, and performance monitoring
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Optional, Dict, Any, List
import logging
import time
from datetime import datetime
import asyncio

# Import from auth module to avoid circular imports
from backend.auth.dependencies import get_current_user_async as get_current_user

# Import other dependencies directly
# Import services and database
from backend.services.monitoring_service import MonitoringService
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# These will be initialized at runtime
db: AsyncIOMotorDatabase = None
sql_connector = None
cache_service = None
monitoring_service: MonitoringService = None


def init_enhanced_api(database, sql_conn, cache_svc, monitoring_svc):
    """Initialize enhanced API with dependencies"""
    global db, sql_connector, cache_service, monitoring_service
    db = database
    sql_connector = sql_conn
    cache_service = cache_svc
    monitoring_service = monitoring_svc


# Enhanced router with comprehensive item management
enhanced_item_router = APIRouter(prefix="/api/v2/erp/items", tags=["Enhanced Items"])


class ItemResponse:
    """Enhanced item response with metadata"""

    def __init__(self, item_data: Dict[str, Any], source: str, response_time_ms: float):
        self.item_data = item_data
        self.source = source  # 'sql_server', 'mongodb', 'cache'
        self.response_time_ms = response_time_ms
        self.timestamp = datetime.utcnow().isoformat()


@enhanced_item_router.get("/barcode/{barcode}/enhanced")
async def get_item_by_barcode_enhanced(
    barcode: str,
    request: Request,
    force_source: Optional[str] = Query(
        None, description="Force data source: sql_server, mongodb, or cache"
    ),
    include_metadata: bool = Query(True, description="Include response metadata"),
    current_user: dict = Depends(get_current_user),
):
    """
    Enhanced barcode lookup with multiple data sources, caching, and performance monitoring
    """
    start_time = time.time()

    try:
        # Log request for monitoring
        monitoring_service.track_request("enhanced_barcode_lookup", request)

        # Validate barcode format
        if not barcode or len(barcode.strip()) == 0:
            raise HTTPException(status_code=400, detail="Barcode cannot be empty")

        barcode = barcode.strip()

        # Determine data source strategy
        if force_source:
            item_data, source = await _fetch_from_specific_source(barcode, force_source)
        else:
            item_data, source = await _fetch_with_fallback_strategy(barcode)

        response_time = (time.time() - start_time) * 1000

        # Log performance
        logger.info(f"Enhanced barcode lookup: {barcode} from {source} in {response_time:.2f}ms")

        # Prepare response
        response_data = {
            "item": item_data,
            "metadata": (
                {
                    "source": source,
                    "response_time_ms": response_time,
                    "timestamp": datetime.utcnow().isoformat(),
                    "barcode_searched": barcode,
                    "user": current_user["username"],
                }
                if include_metadata
                else None
            ),
        }

        # Cache successful result
        if item_data and cache_service:
            await cache_service.set_async(
                "items",
                f"enhanced_{barcode}",
                response_data,
                ttl=1800,  # 30 minutes
            )

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        response_time = (time.time() - start_time) * 1000
        logger.error(
            f"Enhanced barcode lookup failed: {barcode} in {response_time:.2f}ms - {str(e)}"
        )

        raise HTTPException(
            status_code=500,
            detail={
                "message": "Enhanced barcode lookup failed",
                "barcode": barcode,
                "source": "error",
                "response_time_ms": response_time,
                "error": str(e),
            },
        )


async def _fetch_from_specific_source(barcode: str, source: str) -> tuple[Optional[Dict], str]:
    """Fetch item from a specific data source"""

    if source == "sql_server":
        if not sql_connector.test_connection():
            raise HTTPException(status_code=503, detail="SQL Server not available")

        item = sql_connector.get_item_by_barcode(barcode)
        return item, "sql_server"

    elif source == "mongodb":
        item = await db.erp_items.find_one({"barcode": barcode})
        return item, "mongodb"

    elif source == "cache":
        if cache_service:
            item = await cache_service.get_async("items", f"enhanced_{barcode}")
            return item.get("item") if item else None, "cache"
        else:
            raise HTTPException(status_code=503, detail="Cache service not available")

    else:
        raise HTTPException(status_code=400, detail=f"Invalid source: {source}")


async def _fetch_with_fallback_strategy(barcode: str) -> tuple[Optional[Dict], str]:
    """
    Intelligent fallback strategy:
    1. Try cache first (fastest)
    2. Try MongoDB (fast, most up-to-date)
    3. Try SQL Server (slowest, authoritative)
    """

    # Strategy 1: Cache (if available)
    if cache_service:
        try:
            cached = await cache_service.get_async("items", f"enhanced_{barcode}")
            if cached and cached.get("item"):
                return cached["item"], "cache"
        except Exception:
            pass  # Continue to next strategy

    # Strategy 2: MongoDB (primary app database)
    try:
        mongo_item = await db.erp_items.find_one({"barcode": barcode})
        if mongo_item:
            # Convert ObjectId to string for JSON serialization
            mongo_item["_id"] = str(mongo_item["_id"])
            return mongo_item, "mongodb"
    except Exception as e:
        logger.warning(f"MongoDB lookup failed: {str(e)}")

    # Strategy 3: SQL Server (authoritative source)
    try:
        if sql_connector.test_connection():
            sql_item = sql_connector.get_item_by_barcode(barcode)
            if sql_item:
                # Sync this item to MongoDB for future fast access
                asyncio.create_task(_sync_item_to_mongodb(sql_item))
                return sql_item, "sql_server"
    except Exception as e:
        logger.warning(f"SQL Server lookup failed: {str(e)}")

    # All strategies failed
    return None, "not_found"


async def _sync_item_to_mongodb(item: Dict[str, Any]):
    """Background sync of SQL Server item to MongoDB"""
    try:
        item_doc = {
            "item_code": item.get("item_code", ""),
            "item_name": item.get("item_name", ""),
            "barcode": item.get("barcode", ""),
            "stock_qty": float(item.get("stock_qty", 0.0)),
            "mrp": float(item.get("mrp", 0.0)),
            "category": item.get("category", "General"),
            "warehouse": item.get("warehouse", "Main"),
            "uom_code": item.get("uom_code", ""),
            "uom_name": item.get("uom_name", ""),
            "synced_at": datetime.utcnow(),
            "synced_from_erp": True,
            "sync_method": "realtime",
        }

        await db.erp_items.update_one(
            {"item_code": item_doc["item_code"]},
            {"$set": item_doc, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True,
        )

        logger.debug(f"Background synced item to MongoDB: {item.get('item_code')}")

    except Exception as e:
        logger.error(f"Background MongoDB sync failed: {str(e)}")


@enhanced_item_router.get("/search/advanced")
async def advanced_item_search(
    query: str = Query(..., description="Search query"),
    search_fields: List[str] = Query(
        ["item_name", "item_code", "barcode"], description="Fields to search in"
    ),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Results offset"),
    sort_by: str = Query("relevance", description="Sort by: relevance, name, code, stock"),
    category: Optional[str] = Query(None, description="Filter by category"),
    warehouse: Optional[str] = Query(None, description="Filter by warehouse"),
    stock_level: Optional[str] = Query(
        None, description="Filter by stock: low, medium, high, zero"
    ),
    current_user: dict = Depends(get_current_user),
):
    """
    Advanced search with multiple criteria, filtering, and sorting
    """
    start_time = time.time()

    try:
        # Build MongoDB aggregation pipeline
        pipeline = []

        # Match stage - search criteria
        match_conditions = {"$or": []}

        for field in search_fields:
            match_conditions["$or"].append({field: {"$regex": query, "$options": "i"}})

        # Additional filters
        if category:
            match_conditions["category"] = {"$regex": category, "$options": "i"}

        if warehouse:
            match_conditions["warehouse"] = {"$regex": warehouse, "$options": "i"}

        if stock_level:
            if stock_level == "zero":
                match_conditions["stock_qty"] = {"$eq": 0}
            elif stock_level == "low":
                match_conditions["stock_qty"] = {"$gt": 0, "$lt": 10}
            elif stock_level == "medium":
                match_conditions["stock_qty"] = {"$gte": 10, "$lt": 100}
            elif stock_level == "high":
                match_conditions["stock_qty"] = {"$gte": 100}

        pipeline.append({"$match": match_conditions})

        # Add relevance scoring
        pipeline.append(
            {
                "$addFields": {
                    "relevance_score": {
                        "$sum": [
                            {
                                "$cond": [
                                    {
                                        "$regexMatch": {
                                            "input": "$item_name",
                                            "regex": query,
                                            "options": "i",
                                        }
                                    },
                                    10,
                                    0,
                                ]
                            },
                            {
                                "$cond": [
                                    {
                                        "$regexMatch": {
                                            "input": "$item_code",
                                            "regex": query,
                                            "options": "i",
                                        }
                                    },
                                    8,
                                    0,
                                ]
                            },
                            {
                                "$cond": [
                                    {
                                        "$regexMatch": {
                                            "input": "$barcode",
                                            "regex": query,
                                            "options": "i",
                                        }
                                    },
                                    15,
                                    0,
                                ]
                            },
                            {
                                "$cond": [
                                    {
                                        "$regexMatch": {
                                            "input": "$category",
                                            "regex": query,
                                            "options": "i",
                                        }
                                    },
                                    5,
                                    0,
                                ]
                            },
                        ]
                    }
                }
            }
        )

        # Sorting
        sort_stage = {}
        if sort_by == "relevance":
            sort_stage = {"relevance_score": -1, "item_name": 1}
        elif sort_by == "name":
            sort_stage = {"item_name": 1}
        elif sort_by == "code":
            sort_stage = {"item_code": 1}
        elif sort_by == "stock":
            sort_stage = {"stock_qty": -1}
        else:
            sort_stage = {"relevance_score": -1}

        pipeline.append({"$sort": sort_stage})

        # Pagination
        pipeline.append({"$skip": offset})
        pipeline.append({"$limit": limit})

        # Execute aggregation
        cursor = db.erp_items.aggregate(pipeline)
        results = await cursor.to_list(length=limit)

        # Get total count for pagination
        count_pipeline = [{"$match": match_conditions}, {"$count": "total"}]
        count_result = await db.erp_items.aggregate(count_pipeline).to_list(1)
        total_count = count_result[0]["total"] if count_result else 0

        # Prepare response
        response_time = (time.time() - start_time) * 1000

        # Clean up results (remove MongoDB ObjectIds)
        for result in results:
            result["_id"] = str(result["_id"])

        return {
            "items": results,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total_count,
            },
            "search_info": {
                "query": query,
                "search_fields": search_fields,
                "filters": {
                    "category": category,
                    "warehouse": warehouse,
                    "stock_level": stock_level,
                },
                "sort_by": sort_by,
            },
            "performance": {
                "response_time_ms": response_time,
                "results_count": len(results),
                "source": "mongodb_aggregation",
            },
        }

    except Exception as e:
        response_time = (time.time() - start_time) * 1000
        logger.error(f"Advanced search failed: {query} in {response_time:.2f}ms - {str(e)}")

        raise HTTPException(
            status_code=500,
            detail={
                "message": "Advanced search failed",
                "query": query,
                "response_time_ms": response_time,
                "error": str(e),
            },
        )


@enhanced_item_router.get("/performance/stats")
async def get_item_api_performance(current_user: dict = Depends(get_current_user)):
    """Get performance statistics for item API operations"""

    if current_user["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Supervisor access required")

    try:
        # Get database manager instance
        from backend.services.database_manager import DatabaseManager

        db_manager = DatabaseManager(
            mongo_client=db.client, mongo_db=db, sql_connector=sql_connector
        )

        # Comprehensive performance analysis
        performance_data = {
            "database_health": await db_manager.check_database_health(),
            "data_flow_verification": await db_manager.verify_data_flow(),
            "database_insights": await db_manager.get_database_insights(),
            "api_metrics": (
                monitoring_service.get_endpoint_metrics("/erp/items") if monitoring_service else {}
            ),
            "cache_stats": await cache_service.get_stats() if cache_service else {},
        }

        return performance_data

    except Exception as e:
        logger.error(f"Performance stats failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Performance analysis failed: {str(e)}")


@enhanced_item_router.post("/sync/realtime")
async def trigger_realtime_sync(
    item_codes: List[str] = None, current_user: dict = Depends(get_current_user)
):
    """
    Trigger real-time sync for specific items or all items
    """
    if current_user["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Supervisor access required")

    try:
        if item_codes:
            # Sync specific items
            sync_results = []

            for item_code in item_codes:
                try:
                    # Get from SQL Server
                    sql_item = sql_connector.get_item_by_code(item_code)

                    if sql_item:
                        # Sync to MongoDB
                        await _sync_item_to_mongodb(sql_item)
                        sync_results.append(
                            {
                                "item_code": item_code,
                                "status": "synced",
                                "source": "sql_server",
                            }
                        )
                    else:
                        sync_results.append(
                            {
                                "item_code": item_code,
                                "status": "not_found",
                                "source": "sql_server",
                            }
                        )

                except Exception as e:
                    sync_results.append(
                        {"item_code": item_code, "status": "error", "error": str(e)}
                    )

            return {
                "sync_type": "selective",
                "requested_items": len(item_codes),
                "results": sync_results,
                "timestamp": datetime.utcnow().isoformat(),
            }

        else:
            # Full sync - delegate to advanced sync service
            from backend.services.advanced_erp_sync import AdvancedERPSyncService

            advanced_sync = AdvancedERPSyncService(
                sql_connector=sql_connector,
                mongo_db=db,
                sync_interval=3600,
                batch_size=500,
            )

            sync_stats = await advanced_sync.sync_items_advanced()

            return {
                "sync_type": "full",
                "stats": sync_stats,
                "timestamp": datetime.utcnow().isoformat(),
            }

    except Exception as e:
        logger.error(f"Realtime sync failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Realtime sync failed: {str(e)}")


@enhanced_item_router.get("/database/status")
async def get_database_status(current_user: dict = Depends(get_current_user)):
    """
    Get comprehensive database status and health information
    """
    try:
        from backend.services.database_manager import DatabaseManager

        db_manager = DatabaseManager(
            mongo_client=db.client, mongo_db=db, sql_connector=sql_connector
        )

        return await db_manager.check_database_health()

    except Exception as e:
        logger.error(f"Database status check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database status failed: {str(e)}")


@enhanced_item_router.post("/database/optimize")
async def optimize_database_performance(current_user: dict = Depends(get_current_user)):
    """
    Optimize database performance (supervisor only)
    """
    if current_user["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Supervisor access required")

    try:
        from backend.services.database_manager import DatabaseManager

        db_manager = DatabaseManager(
            mongo_client=db.client, mongo_db=db, sql_connector=sql_connector
        )

        optimization_results = await db_manager.optimize_database_performance()

        return {
            "optimization_completed": True,
            "results": optimization_results,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Database optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


# Helper function for background MongoDB sync
async def _sync_item_to_mongodb(item: Dict[str, Any]):
    """Sync a single item from SQL Server to MongoDB"""
    try:
        item_doc = {
            "item_code": item.get("item_code", ""),
            "item_name": item.get("item_name", ""),
            "barcode": item.get("barcode", ""),
            "stock_qty": float(item.get("stock_qty", 0.0)),
            "mrp": float(item.get("mrp", 0.0)),
            "category": item.get("category", "General"),
            "subcategory": item.get("subcategory", ""),
            "warehouse": item.get("warehouse", "Main"),
            "uom_code": item.get("uom_code", ""),
            "uom_name": item.get("uom_name", ""),
            "floor": item.get("floor", ""),
            "rack": item.get("rack", ""),
            "batch_no": item.get("batch_no", ""),
            "mfg_date": item.get("mfg_date"),
            "expiry_date": item.get("expiry_date"),
            "synced_at": datetime.utcnow(),
            "synced_from_erp": True,
            "sync_method": "realtime",
            "data_version": 3,  # Incremented for new fields
            # Preserve verification metadata if exists
            "$setOnInsert": {
                "verified": False,
                "verified_by": None,
                "verified_at": None,
                "last_scanned_at": None,
            },
        }

        # Use $setOnInsert to preserve existing verification data
        update_doc = {
            "$set": {k: v for k, v in item_doc.items() if k != "$setOnInsert"},
            "$setOnInsert": {
                "created_at": datetime.utcnow(),
                "verified": False,
                "verified_by": None,
                "verified_at": None,
                "last_scanned_at": None,
            },
        }

        await db.erp_items.update_one(
            {"item_code": item_doc["item_code"]},
            update_doc,
            upsert=True,
        )

        return True

    except Exception as e:
        logger.error(f"MongoDB sync failed for item {item.get('item_code')}: {str(e)}")
        return False
