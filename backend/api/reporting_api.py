"""
Reporting API - Query builder, snapshots, exports, and comparisons
Enterprise-grade reporting with MongoDB aggregations
"""

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field

from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.services.reporting.compare_engine import CompareEngine
from backend.services.reporting.export_engine import ExportEngine
from backend.services.reporting.query_builder import QueryBuilder
from backend.services.reporting.snapshot_engine import SnapshotEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["Reporting"])


# Models


class QuerySpec(BaseModel):
    """Query specification"""

    collection: str = Field(..., description="Collection to query")
    filters: dict[str, Optional[Any]] = Field(default=None, description="Filter conditions")
    group_by: Optional[list[str]] = Field(None, description="Group by fields")
    aggregations: dict[str, Optional[str]] = Field(default=None, description="Aggregations")
    sort: dict[str, Optional[int]] = Field(default=None, description="Sort specification")
    limit: Optional[int] = Field(None, description="Limit results")


class CreateSnapshotRequest(BaseModel):
    """Create snapshot request"""

    name: str = Field(..., description="Snapshot name")
    description: str = Field(..., description="Snapshot description")
    query_spec: QuerySpec = Field(..., description="Query specification")
    snapshot_type: str = Field("custom", description="Snapshot type")
    tags: Optional[list[str]] = Field(None, description="Tags")


class CompareSnapshotsRequest(BaseModel):
    """Compare snapshots request"""

    snapshot_a_id: str = Field(..., description="First snapshot ID")
    snapshot_b_id: str = Field(..., description="Second snapshot ID")
    comparison_name: Optional[str] = Field(None, description="Comparison name")


# Endpoints


@router.post("/query/preview")
async def preview_query(
    query_spec: QuerySpec,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Preview query results without saving
    """
    from backend.server import db

    query_builder = QueryBuilder()

    # Build pipeline
    pipeline = query_builder.build_pipeline(
        collection=query_spec.collection,
        filters=query_spec.filters,
        group_by=query_spec.group_by,
        aggregations=query_spec.aggregations,
        sort=query_spec.sort,
        limit=query_spec.limit or 100,  # Default preview limit
    )

    # Execute query
    cursor = db[query_spec.collection].aggregate(pipeline)
    results = await cursor.to_list(length=query_spec.limit or 100)

    return {
        "collection": query_spec.collection,
        "row_count": len(results),
        "rows": results,
        "pipeline": pipeline,  # For debugging
    }


@router.post("/snapshots", response_model=dict[str, Any])
async def create_snapshot(
    request: CreateSnapshotRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Create a new snapshot
    """
    from backend.server import db

    snapshot_engine = SnapshotEngine(db)

    snapshot = await snapshot_engine.create_snapshot(
        name=request.name,
        description=request.description,
        query_spec=request.query_spec.dict(),
        created_by=current_user["username"],
        snapshot_type=request.snapshot_type,
        tags=request.tags,
    )

    return snapshot


@router.get("/snapshots")
async def list_snapshots(
    created_by: Optional[str] = Query(None),
    snapshot_type: Optional[str] = Query(None),
    tags: Optional[str] = Query(None),  # Comma-separated
    limit: int = Query(50, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """
    List snapshots with filters
    """
    from backend.server import db

    snapshot_engine = SnapshotEngine(db)

    # Parse tags
    tag_list = tags.split(",") if tags else None

    # Only supervisors can view other users' snapshots
    if created_by and created_by != current_user["username"]:
        if current_user["role"] != "supervisor":
            raise HTTPException(status_code=403, detail="Access denied")

    snapshots = await snapshot_engine.list_snapshots(
        created_by=created_by,
        snapshot_type=snapshot_type,
        tags=tag_list,
        limit=limit,
    )

    return snapshots


@router.get("/snapshots/{snapshot_id}")
async def get_snapshot(
    snapshot_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get snapshot with pagination
    """
    from backend.server import db

    snapshot_engine = SnapshotEngine(db)

    snapshot_data = await snapshot_engine.get_snapshot_data(snapshot_id, skip=skip, limit=limit)

    if not snapshot_data:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    return snapshot_data


@router.delete("/snapshots/{snapshot_id}")
async def delete_snapshot(
    snapshot_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Delete snapshot
    """
    from backend.server import db

    snapshot_engine = SnapshotEngine(db)

    try:
        deleted = await snapshot_engine.delete_snapshot(snapshot_id, current_user["username"])

        if deleted:
            return {"success": True, "snapshot_id": snapshot_id}
        else:
            raise HTTPException(status_code=404, detail="Snapshot not found")

    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/snapshots/{snapshot_id}/refresh")
async def refresh_snapshot(
    snapshot_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Refresh snapshot with latest data
    """
    from backend.server import db

    snapshot_engine = SnapshotEngine(db)

    new_snapshot = await snapshot_engine.refresh_snapshot(snapshot_id)
    return new_snapshot


@router.get("/snapshots/{snapshot_id}/export")
async def export_snapshot(
    snapshot_id: str,
    format: str = Query("csv", regex="^(csv|xlsx|json)$"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """
    Export snapshot to file

    Formats: csv, xlsx, json
    """
    from backend.server import db

    snapshot_engine = SnapshotEngine(db)
    export_engine = ExportEngine()

    # Get snapshot
    snapshot = await snapshot_engine.get_snapshot(snapshot_id)

    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    # Export
    if format == "csv":
        content = export_engine.export_to_csv(snapshot)
        media_type = "text/csv"
    elif format == "xlsx":
        content = export_engine.export_to_xlsx(snapshot)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif format == "json":
        content = export_engine.export_to_json(snapshot)
        media_type = "application/json"
    else:
        raise HTTPException(status_code=400, detail="Invalid format")

    # Generate filename
    filename = export_engine.get_export_filename(snapshot, format)

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/compare")
async def compare_snapshots(
    request: CompareSnapshotsRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Compare two snapshots
    """
    from backend.server import db

    compare_engine = CompareEngine(db)

    comparison = await compare_engine.compare_snapshots(
        snapshot_a_id=request.snapshot_a_id,
        snapshot_b_id=request.snapshot_b_id,
        created_by=current_user["username"],
        comparison_name=request.comparison_name,
    )

    return comparison


@router.get("/compare/{job_id}")
async def get_comparison(
    job_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get comparison job
    """
    from backend.server import db

    compare_engine = CompareEngine(db)

    comparison = await compare_engine.get_comparison(job_id)

    if not comparison:
        raise HTTPException(status_code=404, detail="Comparison not found")

    return comparison


@router.get("/compare")
async def list_comparisons(
    created_by: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[dict[str, Any]]:
    """
    List comparison jobs
    """
    from backend.server import db

    compare_engine = CompareEngine(db)

    # Only supervisors can view other users' comparisons
    if created_by and created_by != current_user["username"]:
        if current_user["role"] != "supervisor":
            raise HTTPException(status_code=403, detail="Access denied")

    comparisons = await compare_engine.list_comparisons(created_by=created_by, limit=limit)

    return comparisons


@router.get("/collections")
async def get_available_collections(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Get available collections and their fields
    """
    query_builder = QueryBuilder()

    return {
        "collections": query_builder.COLLECTIONS,
        "fields": query_builder.FIELDS,
        "aggregations": query_builder.AGGREGATIONS,
    }
