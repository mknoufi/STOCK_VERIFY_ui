"""
API v2 Sessions Endpoints
Upgraded session endpoints with standardized responses
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from backend.api.response_models import ApiResponse, PaginatedResponse
from backend.auth.dependencies import get_current_user_async as get_current_user

router = APIRouter()


class SessionResponse(BaseModel):
    """Session response model"""
    id: str
    name: str
    warehouse: str
    status: str
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
        sessions_cursor = db.sessions.find(query).sort("created_at", -1).skip(skip).limit(page_size)
        sessions = await sessions_cursor.to_list(length=page_size)
        
        # Convert to response models
        session_responses = [
            SessionResponse(
                id=str(session["_id"]),
                name=session.get("name", ""),
                warehouse=session.get("warehouse", ""),
                status=session.get("status", "active"),
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

