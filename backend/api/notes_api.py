from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.db.runtime import get_db
from backend.utils.api_utils import create_safe_error_response, sanitize_for_logging

router = APIRouter()


class NoteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=5000)


class Note(BaseModel):
    id: str
    title: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: str


def _serialize_note(doc: dict[str, Any]) -> Note:
    created_at = doc.get("created_at")
    if not isinstance(created_at, datetime):
        created_at = datetime.now(timezone.utc)
    updated_at = doc.get("updated_at")
    if updated_at is not None and not isinstance(updated_at, datetime):
        updated_at = None
    return Note(
        id=str(doc.get("_id")),
        title=doc.get("title", ""),
        content=doc.get("content", ""),
        created_at=created_at,
        updated_at=updated_at,
        created_by=doc.get("created_by", ""),
    )


@router.get("/notes", response_model=dict[str, Any])
async def list_notes(
    q: Optional[str] = Query(default=None, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    try:
        coll = get_db()["notes"]
        query: dict[str, Any] = {}
        if q:
            safe_q = sanitize_for_logging(q)
            query = {
                "$or": [
                    {"title": {"$regex": safe_q, "$options": "i"}},
                    {"content": {"$regex": safe_q, "$options": "i"}},
                ]
            }

        total_items = await coll.count_documents(query)
        skip = (page - 1) * page_size
        limit = page_size

        cursor = coll.find(query).sort("created_at", -1).skip(skip).limit(limit)
        items: list[Note] = [_serialize_note(doc) async for doc in cursor]

        total_pages = (
            (total_items + page_size - 1) // page_size if total_items > 0 else 0
        )

        return {
            "success": True,
            "data": items,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
            },
            "error": None,
        }
    except Exception as e:
        raise create_safe_error_response(
            500, "Failed to fetch notes", "NOTES_LIST_ERROR", str(e)
        )


@router.post("/notes", response_model=dict[str, Any])
async def create_note(
    payload: NoteCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    try:
        coll = get_db()["notes"]
        now = datetime.now(timezone.utc)
        doc = {
            "title": payload.title,
            "content": payload.content,
            "created_at": now,
            "updated_at": None,
            "created_by": current_user.get("username") or current_user.get("id"),
        }
        res = await coll.insert_one(doc)
        doc["_id"] = res.inserted_id
        return {"success": True, "data": _serialize_note(doc), "error": None}
    except Exception as e:
        raise create_safe_error_response(
            500, "Failed to create note", "NOTES_CREATE_ERROR", str(e)
        )


@router.delete("/notes/{note_id}", response_model=dict[str, Any])
async def delete_note(
    note_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    try:
        coll = get_db()["notes"]
        try:
            oid = ObjectId(note_id)
        except Exception:
            raise HTTPException(
                status_code=400,
                detail={
                    "success": False,
                    "error": {"message": "Invalid note id", "code": "INVALID_NOTE_ID"},
                },
            )
        res = await coll.delete_one({"_id": oid})
        if res.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": {"message": "Note not found", "code": "NOTE_NOT_FOUND"},
                },
            )
        return {
            "success": True,
            "data": {"deleted": True, "id": note_id},
            "error": None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise create_safe_error_response(
            500, "Failed to delete note", "NOTES_DELETE_ERROR", str(e)
        )
