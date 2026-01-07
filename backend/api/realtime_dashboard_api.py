"""
Real-Time Dashboard API
Server-Sent Events (SSE) and WebSocket endpoints for live data updates
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.auth.dependencies import get_current_user, require_role
from backend.db.runtime import get_db
from backend.services.advanced_report_service import (
    AdvancedReportService,
    ColumnConfig,
    ReportConfig,
    ReportFilters,
    SortOrder,
)
from backend.utils.tracing import trace_dashboard_query, trace_span

logger = logging.getLogger(__name__)

realtime_dashboard_router = APIRouter(prefix="/dashboard", tags=["Real-Time Dashboard"])


# ==========================================
# Request/Response Models
# ==========================================


class DashboardColumnPreference(BaseModel):
    """User's column visibility preferences."""

    field: str
    visible: bool


class DashboardConfig(BaseModel):
    """Dashboard configuration from frontend."""

    columns: Optional[list[DashboardColumnPreference]] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=10, le=200)
    sort_by: Optional[str] = None
    sort_order: str = "desc"
    filters: Optional[dict[str, Any]] = None
    auto_refresh: bool = True
    refresh_interval_seconds: int = Field(default=10, ge=5, le=300)


class ItemDetails(BaseModel):
    """Expanded item details for drill-down."""

    id: str
    item_code: str
    item_name: str
    barcode: Optional[str]
    category: Optional[str]
    warehouse: Optional[str]
    floor: Optional[str]
    rack_id: Optional[str]
    stock_qty: float
    counted_qty: float
    variance: float
    variance_percentage: float
    mrp: float
    verified: bool
    verified_by: Optional[str]
    verified_at: Optional[datetime]
    counted_by: str
    counted_at: datetime
    session_id: str
    notes: Optional[str]
    correction_reason: Optional[dict]
    photo_proofs: Optional[list[dict]]
    audit_trail: list[dict] = []


# ==========================================
# WebSocket Connection Manager
# ==========================================


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.user_configs: dict[str, DashboardConfig] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: {user_id}")

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)
        self.user_configs.pop(user_id, None)
        logger.info(f"WebSocket disconnected: {user_id}")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to {user_id}: {e}")
                self.disconnect(user_id)

    async def broadcast(self, message: dict):
        disconnected = []
        for user_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(user_id)

        for user_id in disconnected:
            self.disconnect(user_id)

    def set_config(self, user_id: str, config: DashboardConfig):
        self.user_configs[user_id] = config

    def get_config(self, user_id: str) -> Optional[DashboardConfig]:
        return self.user_configs.get(user_id)


manager = ConnectionManager()


# ==========================================
# Helper Functions
# ==========================================


def parse_filters(filters: Optional[dict[str, Any]]) -> ReportFilters:
    """Parse frontend filters to ReportFilters."""
    if not filters:
        return ReportFilters()

    return ReportFilters(
        warehouse=filters.get("warehouse"),
        floor=filters.get("floor"),
        rack_id=filters.get("rack_id"),
        category=filters.get("category"),
        verified=filters.get("verified"),
        session_id=filters.get("session_id"),
        user_id=filters.get("user_id"),
        search_query=filters.get("search"),
        date_from=filters.get("date_from"),
        date_to=filters.get("date_to"),
        variance_min=filters.get("variance_min"),
        variance_max=filters.get("variance_max"),
    )


# ==========================================
# REST Endpoints
# ==========================================


@realtime_dashboard_router.get("/columns")
async def get_available_columns(
    report_type: str = Query(default="verified_items"),
    current_user: dict = Depends(get_current_user),
):
    """Get available columns for the dashboard table."""
    db = get_db()
    service = AdvancedReportService(db)
    columns = service.get_column_config(report_type)

    return {
        "success": True,
        "columns": [col.model_dump() for col in columns],
        "report_type": report_type,
    }


@realtime_dashboard_router.post("/data")
@trace_dashboard_query("verified_items_table")
async def get_dashboard_data(
    config: DashboardConfig,
    current_user: dict = Depends(get_current_user),
):
    """Get dashboard data with configured columns and filters."""
    db = get_db()
    service = AdvancedReportService(db)

    # Build column configs from preferences
    default_columns = service.get_column_config("verified_items")
    if config.columns:
        visibility_map = {pref.field: pref.visible for pref in config.columns}
        for col in default_columns:
            if col.field in visibility_map:
                col.visible = visibility_map[col.field]

    report_config = ReportConfig(
        report_type="verified_items",
        filters=parse_filters(config.filters),
        columns=default_columns,
        sort_by=config.sort_by,
        sort_order=(
            SortOrder(config.sort_order) if config.sort_order else SortOrder.DESC
        ),
        page=config.page,
        page_size=config.page_size,
        include_aggregations=True,
        include_summary=True,
    )

    result = await service.generate_verified_items_report(report_config)

    return result


@realtime_dashboard_router.get("/item/{item_id}")
@trace_dashboard_query("item_details")
async def get_item_details(
    item_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get detailed information for a specific item."""
    db = get_db()

    with trace_span("mongodb.count_lines.find_one", {"item_id": item_id}):
        item = await db.count_lines.find_one({"id": item_id})

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Get audit trail
    with trace_span("mongodb.audit_logs.find", {"entity_id": item_id}):
        audit_cursor = (
            db.audit_logs.find({"entity_id": item_id, "entity_type": "count_line"})
            .sort("timestamp", -1)
            .limit(50)
        )
        audit_trail = await audit_cursor.to_list(50)

    # Clean up for response
    item.pop("_id", None)
    for log in audit_trail:
        log.pop("_id", None)
        if "timestamp" in log and isinstance(log["timestamp"], datetime):
            log["timestamp"] = log["timestamp"].isoformat()

    return {
        "success": True,
        "item": item,
        "audit_trail": audit_trail,
    }


@realtime_dashboard_router.get("/stats")
@trace_dashboard_query("dashboard_stats")
async def get_dashboard_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get real-time dashboard statistics."""
    db = get_db()

    with trace_span("calculate_dashboard_stats"):
        # Run aggregations in parallel
        stats_pipeline = [
            {
                "$facet": {
                    "total": [{"$count": "count"}],
                    "verified": [
                        {"$match": {"verified": True}},
                        {"$count": "count"},
                    ],
                    "pending": [
                        {"$match": {"verified": False}},
                        {"$count": "count"},
                    ],
                    "variance_stats": [
                        {
                            "$group": {
                                "_id": None,
                                "total_variance": {"$sum": "$variance"},
                                "positive": {
                                    "$sum": {
                                        "$cond": [
                                            {"$gt": ["$variance", 0]},
                                            "$variance",
                                            0,
                                        ]
                                    }
                                },
                                "negative": {
                                    "$sum": {
                                        "$cond": [
                                            {"$lt": ["$variance", 0]},
                                            "$variance",
                                            0,
                                        ]
                                    }
                                },
                                "avg_variance": {"$avg": "$variance"},
                            }
                        }
                    ],
                    "today_activity": [
                        {
                            "$match": {
                                "counted_at": {
                                    "$gte": datetime.utcnow().replace(
                                        hour=0, minute=0, second=0
                                    )
                                }
                            }
                        },
                        {"$count": "count"},
                    ],
                    "by_warehouse": [
                        {"$group": {"_id": "$warehouse", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}},
                        {"$limit": 10},
                    ],
                    "by_status": [
                        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                    ],
                }
            }
        ]

        result = await db.count_lines.aggregate(stats_pipeline).to_list(1)

    stats = result[0] if result else {}

    def get_count(key: str) -> int:
        data = stats.get(key, [])
        return data[0]["count"] if data else 0

    variance_stats = (
        stats.get("variance_stats", [{}])[0] if stats.get("variance_stats") else {}
    )

    return {
        "success": True,
        "stats": {
            "total_items": get_count("total"),
            "verified_items": get_count("verified"),
            "pending_items": get_count("pending"),
            "today_activity": get_count("today_activity"),
            "total_variance": variance_stats.get("total_variance", 0),
            "positive_variance": variance_stats.get("positive", 0),
            "negative_variance": variance_stats.get("negative", 0),
            "avg_variance": variance_stats.get("avg_variance", 0),
            "verification_rate": (
                (get_count("verified") / get_count("total") * 100)
                if get_count("total") > 0
                else 0
            ),
        },
        "by_warehouse": [
            {"warehouse": item["_id"] or "Unknown", "count": item["count"]}
            for item in stats.get("by_warehouse", [])
        ],
        "by_status": [
            {"status": item["_id"] or "Unknown", "count": item["count"]}
            for item in stats.get("by_status", [])
        ],
        "timestamp": datetime.utcnow().isoformat(),
    }


@realtime_dashboard_router.get("/filters/options")
async def get_filter_options(
    current_user: dict = Depends(get_current_user),
):
    """Get available filter options (distinct values)."""
    db = get_db()

    with trace_span("fetch_filter_options"):
        warehouses = await db.count_lines.distinct("warehouse")
        floors = await db.count_lines.distinct("floor")
        categories = await db.count_lines.distinct("category")
        statuses = await db.count_lines.distinct("status")
        users = await db.count_lines.distinct("counted_by")

    return {
        "success": True,
        "options": {
            "warehouses": [w for w in warehouses if w],
            "floors": [f for f in floors if f],
            "categories": [c for c in categories if c],
            "statuses": [s for s in statuses if s],
            "users": [u for u in users if u],
            "verified": [True, False],
        },
    }


# ==========================================
# Server-Sent Events (SSE) Endpoint
# ==========================================


@realtime_dashboard_router.get("/stream")
async def dashboard_stream(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=10, le=200),
    refresh_interval: int = Query(default=10, ge=5, le=300),
    current_user: dict = Depends(require_role("staff", "supervisor", "admin")),
):
    """Server-Sent Events stream for real-time dashboard updates."""

    async def event_generator():
        db = get_db()
        service = AdvancedReportService(db)

        while True:
            try:
                with trace_span("sse_data_fetch"):
                    config = ReportConfig(
                        report_type="verified_items",
                        page=page,
                        page_size=page_size,
                        include_aggregations=True,
                    )
                    result = await service.generate_verified_items_report(config)

                # Format as SSE
                data = json.dumps(
                    {
                        "type": "data",
                        "payload": result,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )
                yield f"data: {data}\n\n"

                await asyncio.sleep(refresh_interval)

            except asyncio.CancelledError:
                logger.info("SSE stream cancelled")
                break
            except Exception as e:
                logger.error(f"SSE stream error: {e}")
                error_data = json.dumps(
                    {
                        "type": "error",
                        "message": str(e),
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )
                yield f"data: {error_data}\n\n"
                await asyncio.sleep(5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ==========================================
# WebSocket Helpers
# ==========================================


async def _ws_get_report(
    service: AdvancedReportService, config: DashboardConfig
) -> dict:
    """Generate report for WebSocket response."""
    return await service.generate_verified_items_report(
        ReportConfig(
            report_type="verified_items",
            filters=parse_filters(config.filters),
            page=config.page,
            page_size=config.page_size,
            sort_by=config.sort_by,
            sort_order=(
                SortOrder(config.sort_order) if config.sort_order else SortOrder.DESC
            ),
        )
    )


async def _ws_handle_config_update(
    data: dict,
    user_id: str,
    service: AdvancedReportService,
) -> DashboardConfig:
    """Handle config_update message, return new config."""
    new_config = DashboardConfig(**data.get("config", {}))
    manager.set_config(user_id, new_config)
    result = await _ws_get_report(service, new_config)
    await manager.send_personal_message(
        {"type": "data_update", "payload": result}, user_id
    )
    return new_config


async def _ws_handle_refresh(
    user_id: str,
    service: AdvancedReportService,
    config: DashboardConfig,
) -> None:
    """Handle refresh message."""
    result = await _ws_get_report(service, config)
    await manager.send_personal_message(
        {"type": "data_update", "payload": result}, user_id
    )


async def _ws_handle_get_item_details(data: dict, user_id: str, db) -> None:
    """Handle get_item_details message."""
    item_id = data.get("item_id")
    if item_id:
        item = await db.count_lines.find_one({"id": item_id})
        if item:
            item.pop("_id", None)
            await manager.send_personal_message(
                {"type": "item_details", "payload": item}, user_id
            )


# ==========================================
# WebSocket Endpoint
async def _ws_handle_auto_refresh(
    user_id: str, service: AdvancedReportService, config: DashboardConfig
) -> None:
    """Handle auto-refresh on timeout."""
    if config.auto_refresh:
        result = await _ws_get_report(service, config)
        await manager.send_personal_message(
            {"type": "auto_refresh", "payload": result}, user_id
        )


async def _ws_process_message(
    data: dict,
    user_id: str,
    service: AdvancedReportService,
    config: DashboardConfig,
    db,
) -> DashboardConfig:
    """Process WebSocket message and return (potentially updated) config."""
    message_type = data.get("type")

    if message_type == "config_update":
        return await _ws_handle_config_update(data, user_id, service)
    elif message_type == "refresh":
        await _ws_handle_refresh(user_id, service, config)
    elif message_type == "get_item_details":
        await _ws_handle_get_item_details(data, user_id, db)

    return config


# ==========================================
# WebSocket Endpoint
# ==========================================


@realtime_dashboard_router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """WebSocket endpoint for bidirectional real-time communication."""
    user_id = token
    await manager.connect(websocket, user_id)

    try:
        db = get_db()
        service = AdvancedReportService(db)
        config = DashboardConfig()
        manager.set_config(user_id, config)

        # Send initial data
        result = await _ws_get_report(service, config)
        await manager.send_personal_message(
            {"type": "initial_data", "payload": result}, user_id
        )

        # Listen for client messages
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_json(), timeout=config.refresh_interval_seconds
                )
                config = await _ws_process_message(data, user_id, service, config, db)
            except asyncio.TimeoutError:
                await _ws_handle_auto_refresh(user_id, service, config)

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
        manager.disconnect(user_id)


# ==========================================
# Export Endpoints
# ==========================================


@realtime_dashboard_router.post("/export/csv")
async def export_dashboard_csv(
    config: DashboardConfig,
    current_user: dict = Depends(require_role("supervisor", "admin")),
):
    """Export current dashboard view as CSV."""
    db = get_db()
    service = AdvancedReportService(db)

    # Get all data (no pagination for export)
    report_config = ReportConfig(
        report_type="verified_items",
        filters=parse_filters(config.filters),
        page=1,
        page_size=10000,  # Max export
        sort_by=config.sort_by,
        sort_order=(
            SortOrder(config.sort_order) if config.sort_order else SortOrder.DESC
        ),
    )

    result = await service.generate_verified_items_report(report_config)
    columns = [ColumnConfig(**col) for col in result["columns"]]

    # Apply visibility from config
    if config.columns:
        visibility_map = {pref.field: pref.visible for pref in config.columns}
        for col in columns:
            if col.field in visibility_map:
                col.visible = visibility_map[col.field]

    csv_content = await service.export_to_csv(result["data"], columns)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=dashboard_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        },
    )


@realtime_dashboard_router.post("/export/xlsx")
async def export_dashboard_xlsx(
    config: DashboardConfig,
    current_user: dict = Depends(require_role("supervisor", "admin")),
):
    """Export current dashboard view as Excel."""
    db = get_db()
    service = AdvancedReportService(db)

    report_config = ReportConfig(
        report_type="verified_items",
        filters=parse_filters(config.filters),
        page=1,
        page_size=10000,
        sort_by=config.sort_by,
        sort_order=(
            SortOrder(config.sort_order) if config.sort_order else SortOrder.DESC
        ),
    )

    result = await service.generate_verified_items_report(report_config)
    columns = [ColumnConfig(**col) for col in result["columns"]]

    if config.columns:
        visibility_map = {pref.field: pref.visible for pref in config.columns}
        for col in columns:
            if col.field in visibility_map:
                col.visible = visibility_map[col.field]

    xlsx_content = await service.export_to_xlsx(result["data"], columns)

    return StreamingResponse(
        iter([xlsx_content]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=dashboard_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        },
    )
