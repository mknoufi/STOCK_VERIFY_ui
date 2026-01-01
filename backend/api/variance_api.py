from typing import Any

from fastapi import APIRouter, Depends

from backend.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/variance-reasons")
async def get_variance_reasons(
    current_user: dict = Depends(get_current_user),
) -> dict[str, list[dict[str, str]]]:
    """Get list of variance reasons"""
    # Return common variance reasons
    return {
        "reasons": [
            {"id": "damaged", "label": "Damaged"},
            {"id": "expired", "label": "Expired"},
            {"id": "theft", "label": "Theft"},
            {"id": "misplaced", "label": "Misplaced"},
            {"id": "data_entry_error", "label": "Data Entry Error"},
            {"id": "supplier_shortage", "label": "Supplier Shortage"},
            {"id": "other", "label": "Other"},
        ]
    }


@router.get("/variance/trend")
async def get_variance_trend(
    days: int = 7,
    current_user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    """Get variance trend data for the last N days"""
    from datetime import datetime, timedelta

    from backend.db.runtime import get_db

    db = get_db()

    # Calculate start date
    start_date = datetime.utcnow() - timedelta(days=days)

    # Aggregate variances by date
    pipeline: list[dict[str, Any]] = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]

    results = await db.variances.aggregate(pipeline).to_list(length=days)

    # Fill in missing dates
    data = []
    current_date = start_date
    date_map = {r["_id"]: r["count"] for r in results}

    for _ in range(days):
        date_str = current_date.strftime("%Y-%m-%d")
        data.append({"date": date_str, "count": date_map.get(date_str, 0)})
        current_date += timedelta(days=1)

    return {"success": True, "data": data}
