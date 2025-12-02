"""
Enhanced Item API - Upgraded endpoints with better error handling,
caching, validation, and performance monitoring
"""

import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

# Import from auth module to avoid circular imports
from backend.auth.dependencies import get_current_user_async as get_current_user

# Import other dependencies directly
# Import services and database
from backend.services.monitoring_service import MonitoringService

logger = logging.getLogger(__name__)

# These will be initialized at runtime
db: AsyncIOMotorDatabase = None
cache_service = None
monitoring_service: MonitoringService = None


def init_enhanced_api(database, cache_svc, monitoring_svc):
    """Initialize enhanced API with dependencies"""
    global db, cache_service, monitoring_service
    db = database
    cache_service = cache_svc
    monitoring_service = monitoring_svc


# Enhanced router with comprehensive item management
enhanced_item_router = APIRouter(prefix="/api/v2/erp/items", tags=["Enhanced Items"])


class ItemResponse:
    """Enhanced item response with metadata"""

    def __init__(self, item_data: Dict[str, Any], source: str, response_time_ms: float):
        self.item_data = item_data
        self.source = source  # 'mongodb', 'cache'
        self.response_time_ms = response_time_ms
        self.timestamp = datetime.utcnow().isoformat()


@enhanced_item_router.get("/barcode/{barcode}/enhanced")
async def get_item_by_barcode_enhanced(
    barcode: str,
    request: Request,
    force_source: Optional[str] = Query(
        None, description="Force data source: mongodb, or cache"
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

    if source == "mongodb":
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

    # All strategies failed
    return None, "not_found"


def _build_relevance_stage(query: str) -> Dict[str, Any]:
    """Build relevance scoring stage for aggregation pipeline"""
    return {
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


def _build_match_conditions(
    query: str,
    search_fields: List[str],
    category: Optional[str],
    warehouse: Optional[str],
    stock_level: Optional[str],
) -> Dict[str, Any]:
    """Build match conditions for search pipeline"""
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

    return match_conditions


def _build_search_pipeline(
    query: str,
    search_fields: List[str],
    limit: int,
    offset: int,
    sort_by: str,
    category: Optional[str],
    warehouse: Optional[str],
    stock_level: Optional[str],
) -> List[Dict[str, Any]]:
    """Build MongoDB aggregation pipeline for advanced search"""
    pipeline = []

    # Match stage - search criteria
    match_conditions = _build_match_conditions(
        query, search_fields, category, warehouse, stock_level
    )
    pipeline.append({"$match": match_conditions})

    # Add relevance scoring
    pipeline.append(_build_relevance_stage(query))

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

    return pipeline


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
        pipeline = _build_search_pipeline(
            query,
            search_fields,
            limit,
            offset,
            sort_by,
            category,
            warehouse,
            stock_level,
        )

        # Execute aggregation
        cursor = db.erp_items.aggregate(pipeline)
        results = await cursor.to_list(length=limit)

        # Get total count for pagination
        # Reconstruct match conditions for count query
        # This is a bit redundant but keeps the helper function focused on the pipeline
        match_conditions = pipeline[0]["$match"]
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
            mongo_client=db.client, mongo_db=db
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
    Trigger real-time sync for specific items or all items (Now disabled as ERP is disconnected)
    """
    if current_user["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Supervisor access required")

    return {
        "sync_type": "disabled",
        "message": "Real-time sync is disabled because the ERP connection is not configured.",
        "timestamp": datetime.utcnow().isoformat(),
    }


@enhanced_item_router.get("/database/status")
async def get_database_status(current_user: dict = Depends(get_current_user)):
    """
    Get comprehensive database status and health information
    """
    try:
        from backend.services.database_manager import DatabaseManager

        db_manager = DatabaseManager(
            mongo_client=db.client, mongo_db=db
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
            mongo_client=db.client, mongo_db=db
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
