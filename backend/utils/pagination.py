"""
Pagination Utilities - Standardized pagination for FastAPI endpoints

Based on fastapi-pagination patterns from awesome-fastapi best practices.
Provides consistent pagination across all API endpoints with proper typing.
"""

from typing import Any, Generic, Optional, TypeVar

from fastapi import Query
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class PaginationParams:
    """
    Dependency class for pagination parameters.

    Usage:
        @router.get("/items")
        async def list_items(pagination: PaginationParams = Depends()):
            items = await get_items(
                skip=pagination.skip,
                limit=pagination.limit,
            )
            return paginate(items, pagination, total_count)
    """

    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number (1-indexed)"),
        size: int = Query(
            20,
            ge=1,
            le=100,
            description="Items per page (max 100)",
        ),
    ):
        self.page = page
        self.size = size

    @property
    def skip(self) -> int:
        """Calculate offset for database queries"""
        return (self.page - 1) * self.size

    @property
    def limit(self) -> int:
        """Alias for size (common in database queries)"""
        return self.size


class CursorPaginationParams:
    """
    Cursor-based pagination for large datasets.
    More efficient than offset pagination for large collections.

    Usage:
        @router.get("/items")
        async def list_items(pagination: CursorPaginationParams = Depends()):
            items = await get_items_after_cursor(
                pagination.cursor,
                pagination.limit,
            )
            return cursor_paginate(items, pagination)
    """

    def __init__(
        self,
        cursor: Optional[str] = Query(
            None,
            description="Cursor for next page",
        ),
        limit: int = Query(
            20,
            ge=1,
            le=100,
            description="Items per page (max 100)",
        ),
    ):
        self.cursor = cursor
        self.limit = limit


class PageInfo(BaseModel):
    """Pagination metadata for page-based pagination"""

    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, description="Items per page")
    total_items: int = Field(..., ge=0, description="Total number of items")
    total_pages: int = Field(..., ge=0, description="Total number of pages")
    has_previous: bool = Field(..., description="Whether previous page exists")
    has_next: bool = Field(..., description="Whether next page exists")


class CursorInfo(BaseModel):
    """Pagination metadata for cursor-based pagination"""

    next_cursor: Optional[str] = Field(
        None,
        description="Cursor for next page",
    )
    previous_cursor: Optional[str] = Field(
        None,
        description="Cursor for previous page",
    )
    has_more: bool = Field(..., description="Whether more items exist")
    limit: int = Field(..., ge=1, description="Items per page")


class Page(BaseModel, Generic[T]):
    """
    Standardized paginated response model.

    Example response:
    {
        "items": [...],
        "page_info": {
            "page": 1,
            "size": 20,
            "total_items": 100,
            "total_pages": 5,
            "has_previous": false,
            "has_next": true
        }
    }
    """

    items: list[Any] = Field(..., description="List of items in current page")
    page_info: PageInfo = Field(..., description="Pagination metadata")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {"id": 1, "name": "Item 1"},
                    {"id": 2, "name": "Item 2"},
                ],
                "page_info": {
                    "page": 1,
                    "size": 20,
                    "total_items": 100,
                    "total_pages": 5,
                    "has_previous": False,
                    "has_next": True,
                },
            }
        }
    )


class CursorPage(BaseModel, Generic[T]):
    """
    Cursor-based paginated response model.

    Example response:
    {
        "items": [...],
        "cursor_info": {
            "next_cursor": "eyJpZCI6IDUwfQ==",
            "has_more": true,
            "limit": 20
        }
    }
    """

    items: list[Any] = Field(..., description="List of items in current page")
    cursor_info: CursorInfo = Field(
        ...,
        description="Cursor pagination metadata",
    )


def paginate(
    items: list[Any],
    params: PaginationParams,
    total: int,
) -> Page:
    """
    Create a paginated response from items list.

    Args:
        items: List of items for current page
        params: Pagination parameters
        total: Total count of items (all pages)

    Returns:
        Page response with items and pagination metadata
    """
    total_pages = (total + params.size - 1) // params.size if total > 0 else 0

    return Page(
        items=items,
        page_info=PageInfo(
            page=params.page,
            size=params.size,
            total_items=total,
            total_pages=total_pages,
            has_previous=params.page > 1,
            has_next=params.page < total_pages,
        ),
    )


def cursor_paginate(
    items: list[Any],
    params: CursorPaginationParams,
    next_cursor: Optional[str] = None,
    previous_cursor: Optional[str] = None,
) -> CursorPage:
    """
    Create a cursor-based paginated response.

    Args:
        items: List of items for current page
        params: Cursor pagination parameters
        next_cursor: Cursor for fetching next page
        previous_cursor: Cursor for fetching previous page

    Returns:
        CursorPage response with items and cursor metadata
    """
    # If we got more items than limit, there are more pages
    has_more = len(items) > params.limit

    # Trim items to limit if needed
    if has_more:
        items = items[: params.limit]

    return CursorPage(
        items=items,
        cursor_info=CursorInfo(
            next_cursor=next_cursor,
            previous_cursor=previous_cursor,
            has_more=has_more,
            limit=params.limit,
        ),
    )


# Helper functions for MongoDB queries
async def get_paginated_mongo(
    collection,
    query: dict,
    params: PaginationParams,
    sort: Optional[list[tuple[str, int]]] = None,
    projection: Optional[dict] = None,
) -> tuple[list[dict], int]:
    """
    Execute paginated MongoDB query.

    Args:
        collection: MongoDB collection
        query: Query filter
        params: Pagination parameters
        sort: Sort specification (e.g., [("created_at", -1)])
        projection: Fields to include/exclude

    Returns:
        Tuple of (items, total_count)
    """
    # Get total count
    total = await collection.count_documents(query)

    # Build cursor
    cursor = collection.find(query, projection)

    if sort:
        cursor = cursor.sort(sort)

    cursor = cursor.skip(params.skip).limit(params.limit)

    # Execute query
    items = await cursor.to_list(length=params.limit)

    return items, total
