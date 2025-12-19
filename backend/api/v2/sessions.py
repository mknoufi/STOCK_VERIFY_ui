"""
API v2 Sessions Endpoints
Upgraded session endpoints with standardized responses
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from backend.api.response_models import ApiResponse, PaginatedResponse
from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.services.ai_variance import ai_variance_service

router = APIRouter()


class SessionResponse(BaseModel):
    """Session response model"""

    id: str
    name: str
    warehouse: str
    status: str
    type: str
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None


@router.get("/", response_model=ApiResponse[PaginatedResponse[SessionResponse]])
async def get_sessions_v2(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: dict = Depends(get_current_user),
):
    """
    Get sessions with pagination (v2)
    Returns standardized paginated response
    """
    try:
        from backend.server import db

        # Build query
        query = {}
        if status:
            query["status"] = status

        # Get total count
        total = await db.sessions.count_documents(query)

        # Get paginated sessions
        skip = (page - 1) * page_size
        sessions_cursor = (
            db.sessions.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        )
        sessions = await sessions_cursor.to_list(length=page_size)

        # Convert to response models
        session_responses = [
            SessionResponse(
                id=str(session["_id"]),
                name=session.get("name", ""),
                warehouse=session.get("warehouse", ""),
                status=session.get("status", "active"),
                type=session.get("type", "STANDARD"),
                created_by=session.get("created_by", ""),
                created_at=session.get("created_at", datetime.utcnow()),
                updated_at=session.get("updated_at"),
            )
            for session in sessions
        ]

        paginated_response = PaginatedResponse.create(
            items=session_responses,
            total=total,
            page=page,
            page_size=page_size,
        )

        return ApiResponse.success_response(
            data=paginated_response,
            message=f"Retrieved {len(session_responses)} sessions",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="SESSIONS_FETCH_ERROR",
            error_message=f"Failed to fetch sessions: {str(e)}",
        )


@router.get("/{session_id}/rack-progress", response_model=ApiResponse)
async def get_rack_progress(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Get progress percentage for each rack in the session's warehouse.
    """
    try:
        # 1. Get Session to find Warehouse
        from bson import ObjectId

        from backend.server import db

        try:
            session = await db.sessions.find_one({"_id": ObjectId(session_id)})
        except Exception:
            # Try finding by string id if ObjectId fails (for offline/legacy ids)
            session = await db.sessions.find_one({"session_id": session_id})

        if not session:
            return ApiResponse.error_response(
                error_code="SESSION_NOT_FOUND", error_message="Session not found"
            )

        warehouse = session.get("warehouse")
        if not warehouse:
            return ApiResponse.error_response(
                error_code="INVALID_SESSION",
                error_message="Session has no warehouse assigned",
            )

        # 2. Aggregation: Total Items per Rack (Master Data)
        # Filter by warehouse and group by rack
        total_pipeline = [
            {"$match": {"warehouse": warehouse, "rack": {"$exists": True, "$ne": ""}}},
            {"$group": {"_id": "$rack", "total_items": {"$sum": 1}}},
        ]
        total_counts = await db.erp_items.aggregate(total_pipeline).to_list(length=1000)
        # Map: { "A1": 100, "B2": 50 }
        totals_map = {item["_id"]: item["total_items"] for item in total_counts}

        # 3. Aggregation: Counted Items per Rack (Session Data)
        # Filter by session_id and group by rack (need to lookup item first or assuming count_lines has rack?
        # Usually count_lines records what was scanned. If it doesn't store rack, we might need a lookup.
        # However, typically optimization implies count_lines should have location snapshot or we rely on item master.
        # Let's check count_lines schema. If it doesn't have rack, we have to look it up.
        # Assuming for 'progress' we want to know how many *unique items* from that rack have been counted.

        # Strategy: Get all distinct item_codes counted in this session.
        # Then check which racks those items belong to.

        count_pipeline = [
            {"$match": {"session_id": session_id}},
            {"$group": {"_id": "$item_code"}},  # distinct item codes
        ]
        counted_items = await db.count_lines.aggregate(count_pipeline).to_list(
            length=10000
        )
        counted_item_codes = [c["_id"] for c in counted_items]

        # Now query erp_items to see which racks these counted items belong to
        if counted_item_codes:
            progress_pipeline = [
                {
                    "$match": {
                        "warehouse": warehouse,
                        "item_code": {"$in": counted_item_codes},
                        "rack": {"$exists": True, "$ne": ""},
                    }
                },
                {"$group": {"_id": "$rack", "counted_items": {"$sum": 1}}},
            ]
            progress_counts = await db.erp_items.aggregate(progress_pipeline).to_list(
                length=1000
            )
            # Map: { "A1": 45, "B2": 10 }
            progress_map = {
                item["_id"]: item["counted_items"] for item in progress_counts
            }
        else:
            progress_map = {}

        # 4. Merge Data
        rack_progress = []
        all_racks = set(totals_map.keys()) | set(progress_map.keys())

        for rack in sorted(all_racks):
            total = totals_map.get(rack, 0)
            counted = progress_map.get(rack, 0)
            percentage = round((counted / total * 100), 1) if total > 0 else 0

            # Cap at 100% just in case
            percentage = min(percentage, 100)

            rack_progress.append(
                {
                    "rack": rack,
                    "total": total,
                    "counted": counted,
                    "percentage": percentage,
                }
            )

        return ApiResponse.success_response(
            data=rack_progress, message="Rack progress calculated successfully"
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="PROGRESS_CALC_ERROR",
            error_message=f"Failed to calculate progress: {str(e)}",
        )


@router.get("/watchtower", response_model=ApiResponse)
async def get_watchtower_stats(
    current_user: dict = Depends(get_current_user),
):
    """
    Get real-time statistics for the Watchtower dashboard.
    Returns:
        - Active sessions count
        - Total scans today
        - Active users (last 15 mins)
        - Recent variances
        - Hourly throughput (today)
    """
    try:
        from datetime import datetime, timedelta

        from backend.server import db

        # 1. Active Sessions
        active_sessions_count = await db.sessions.count_documents({"status": "OPEN"})

        # 2. Total Scans Today
        today_start = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        total_scans_today = await db.count_lines.count_documents(
            {"counted_at": {"$gte": today_start.isoformat()}}
        )

        # 3. Active Users (Last 15 mins)
        # Assuming we track 'last_active' in users or have an activity log.
        # For now, we'll approximate active users based on recent count_lines or activity logs if available.
        # Fallback: Count unique users who added a count_line in the last 15 mins.
        fifteen_mins_ago = (datetime.utcnow() - timedelta(minutes=15)).isoformat()
        active_users_pipeline = [
            {"$match": {"counted_at": {"$gte": fifteen_mins_ago}}},
            {"$group": {"_id": "$counted_by"}},
            {"$count": "count"},
        ]
        active_users_result = await db.count_lines.aggregate(
            active_users_pipeline
        ).to_list(length=1)
        active_users_count = (
            active_users_result[0]["count"] if active_users_result else 0
        )

        # 4. Hourly Throughput (Today)
        # Group count_lines by hour
        throughput_pipeline = [
            {"$match": {"counted_at": {"$gte": today_start.isoformat()}}},
            {
                "$group": {
                    "_id": {
                        "$hour": {"$dateFromString": {"dateString": "$counted_at"}}
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        throughput_data = await db.count_lines.aggregate(throughput_pipeline).to_list(
            length=24
        )

        # Format for frontend chart [0, 0, ..., 10, 50, ...]
        hourly_throughput = [0] * 24
        for item in throughput_data:
            hour = item["_id"]
            if 0 <= hour < 24:
                hourly_throughput[hour] = item["count"]

        # 5. Recent Variances (Top 5 most significant active variances)
        # Simplified: Get recent count lines where we might infer variance
        recent_activity = (
            await db.count_lines.find({"counted_at": {"$gte": today_start.isoformat()}})
            .sort("counted_at", -1)
            .limit(5)
            .to_list(length=5)
        )

        # 6. AI Predicted Risks (Summary)
        # Get active sessions and count high-risk items
        active_sessions = await db.sessions.find({"status": "OPEN"}).to_list(length=10)
        risk_predictions = []
        total_high_risk = 0

        for sess in active_sessions:
            sess_id = str(sess["_id"])
            preds = await ai_variance_service.predict_session_risks(
                db, sess_id, limit=3
            )
            risk_predictions.extend(preds)
            total_high_risk += len(preds)
            if len(risk_predictions) >= 5:
                break

        return ApiResponse.success_response(
            data={
                "active_sessions": active_sessions_count,
                "total_scans_today": total_scans_today,
                "active_users": active_users_count,
                "hourly_throughput": hourly_throughput,
                "predicted_risk_count": total_high_risk,
                "high_risk_items": risk_predictions[:5],
                "recent_activity": [
                    {
                        "item_code": r.get("item_code"),
                        "qty": r.get("quantity"),
                        "user": r.get("counted_by", "Unknown"),
                        "time": r.get("counted_at"),
                    }
                    for r in recent_activity
                ],
            },
            message="Watchtower stats retrieved",
        )

    except Exception as e:
        return ApiResponse.error_response(
            error_code="WATCHTOWER_ERROR",
            error_message=f"Failed to fetch stats: {str(e)}",
        )
