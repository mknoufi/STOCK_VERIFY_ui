from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.services.ai_variance import AIVarianceService


@pytest.mark.asyncio
async def test_get_category_risk_score_heuristic():
    service = AIVarianceService()
    db = MagicMock()

    # Mock aggregate to return empty list (no historical data)
    db.variances.aggregate.return_value.to_list = AsyncMock(return_value=[])

    # Electronics should have high heuristic risk
    risk = await service.get_category_risk_score(db, "Electronics")
    assert risk == 0.8


@pytest.mark.asyncio
async def test_get_category_risk_score_historical():
    service = AIVarianceService()
    db = MagicMock()

    # Mock historical data: 10 counts, 5 variances = 0.5 risk
    db.variances.aggregate.return_value.to_list = AsyncMock(
        return_value=[{"total_counts": 10, "variance_count": 5}]
    )

    # Electronics heuristic 0.8
    # Hybrid: (0.8 * 0.4) + (0.5 * 0.6) = 0.32 + 0.30 = 0.62
    risk = await service.get_category_risk_score(db, "Electronics")
    assert round(risk, 2) == 0.62


@pytest.mark.asyncio
async def test_predict_session_risks():
    service = AIVarianceService()
    db = MagicMock()

    # Mock counted items
    db.count_lines.find.return_value.to_list = AsyncMock(
        return_value=[
            {"item_code": "ITEM1", "item_name": "iPhone", "category": "Electronics"},
            {"item_code": "ITEM2", "item_name": "Cable", "category": "Accessories"},
        ]
    )

    # Mock session
    db.sessions.find_one = AsyncMock(return_value={"_id": "sess1", "warehouse": "WH1"})

    # Mock variance data (empty)
    db.variances.aggregate.return_value.to_list = AsyncMock(return_value=[])

    # iPhone (Electronics) risk should be higher than Cable (Accessories)
    risks = await service.predict_session_risks(db, "sess1")

    assert len(risks) > 0
    assert risks[0]["item_name"] == "iPhone"
    assert risks[0]["risk_score"] > 0.4
