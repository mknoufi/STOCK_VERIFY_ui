"""
Standardized API Response Models
Provides consistent response formats across all API endpoints
"""

from datetime import datetime
from typing import Annotated, Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """
    Standard API response wrapper
    All API endpoints should use this format for consistency
    """

    success: Annotated[bool, Field(description="Whether the request was successful")]
    data: Annotated[Optional[T], Field(description="Response data")] = None
    error: Annotated[
        Optional[Dict[str, Any]], Field(description="Error details if success is false")
    ] = None
    message: Annotated[Optional[str], Field(description="Human-readable message")] = None
    timestamp: Annotated[
        datetime, Field(default_factory=datetime.utcnow, description="Response timestamp")
    ]
    request_id: Annotated[Optional[str], Field(description="Request ID for tracking")] = None

    @classmethod
    def success_response(
        cls, data: T, message: Optional[str] = None, request_id: Optional[str] = None
    ):
        """Create a successful response"""
        return cls(
            success=True,
            data=data,
            message=message,
            request_id=request_id,
            timestamp=datetime.utcnow(),
        )

    @classmethod
    def error_response(
        cls,
        error_code: str,
        error_message: str,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
    ):
        """Create an error response"""
        return cls(
            success=False,
            error={
                "code": error_code,
                "message": error_message,
                "details": details or {},
            },
            request_id=request_id,
            timestamp=datetime.utcnow(),
        )


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Paginated API response
    Use for endpoints that return lists with pagination
    """

    items: Annotated[List[T], Field(description="List of items")]
    total: Annotated[int, Field(description="Total number of items")]
    page: Annotated[int, Field(ge=1, description="Current page number")]
    page_size: Annotated[int, Field(ge=1, le=100, description="Items per page")]
    total_pages: Annotated[int, Field(description="Total number of pages")]
    has_next: Annotated[bool, Field(description="Whether there is a next page")]
    has_previous: Annotated[bool, Field(description="Whether there is a previous page")]

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        page: int,
        page_size: int,
    ):
        """Create a paginated response"""
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
        )


class HealthCheckResponse(BaseModel):
    """Health check response"""

    status: str = Field(..., description="Overall health status: healthy, degraded, unhealthy")
    services: Dict[str, Dict[str, Any]] = Field(
        ..., description="Individual service health statuses"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Health check timestamp"
    )
    version: Optional[str] = Field(None, description="Application version")


class ConnectionPoolStatusResponse(BaseModel):
    """Connection pool status response"""

    status: str = Field(..., description="Pool status: healthy, degraded, unhealthy")
    pool_size: int = Field(..., description="Configured pool size")
    created: int = Field(..., description="Number of connections created")
    available: int = Field(..., description="Number of available connections")
    checked_out: int = Field(..., description="Number of connections in use")
    utilization: float = Field(..., description="Pool utilization percentage")
    metrics: Dict[str, Any] = Field(..., description="Detailed metrics")
    health_check: Optional[Dict[str, Any]] = Field(None, description="Last health check results")
