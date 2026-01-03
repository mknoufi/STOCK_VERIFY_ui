from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.services.analytics_service import AnalyticsService


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.verification_logs = MagicMock()
    db.erp_items = MagicMock()

    # Mock count_documents as AsyncMock
    db.erp_items.count_documents = AsyncMock(side_effect=lambda query: 100 if not query else 40)

    return db


@pytest.mark.asyncio
async def test_get_verification_stats(mock_db):
    # Setup mock data for aggregate calls
    # 1. Trend
    mock_trend_cursor = MagicMock()
    mock_trend_cursor.to_list = AsyncMock(
        return_value=[
            {"_id": "2023-10-01", "count": 5},
            {"_id": "2023-10-02", "count": 10},
        ]
    )

    # 2. Top Users
    mock_users_cursor = MagicMock()
    mock_users_cursor.to_list = AsyncMock(
        return_value=[{"_id": "user1", "count": 10}, {"_id": "user2", "count": 5}]
    )

    # 3. Variance
    mock_variance_cursor = MagicMock()
    mock_variance_cursor.to_list = AsyncMock(
        return_value=[{"total_variance": 2, "abs_variance": 4, "count": 2}]
    )

    # Configure aggregate to return different cursors based on call order or just mock it to return what we need
    # Since there are 5 calls to verification_logs.aggregate (trend, users, variance, surplus, shortage), we can use side_effect
    mock_surplus_cursor = MagicMock()
    mock_surplus_cursor.to_list = AsyncMock(return_value=[{"count": 5}])

    mock_shortage_cursor = MagicMock()
    mock_shortage_cursor.to_list = AsyncMock(return_value=[{"count": 2}])

    mock_db.verification_logs.aggregate.side_effect = [
        mock_trend_cursor,
        mock_users_cursor,
        mock_variance_cursor,
        mock_surplus_cursor,
        mock_shortage_cursor,
    ]

    service = AnalyticsService(mock_db)
    stats = await service.get_verification_stats(days=7)

    assert stats["summary"]["total_items"] == 100
    assert stats["summary"]["verified_items"] == 40
    assert stats["summary"]["completion_percentage"] == 40.0
    assert stats["summary"]["total_verifications_period"] == 15
    assert len(stats["trend"]) == 2
    assert len(stats["top_users"]) == 2
    assert stats["top_users"][0]["_id"] == "user1"


@pytest.mark.asyncio
async def test_get_category_distribution(mock_db):
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(
        return_value=[
            {"_id": "Electronics", "total": 20, "verified": 10},
            {"_id": "Groceries", "total": 15, "verified": 5},
        ]
    )
    mock_db.erp_items.aggregate.return_value = mock_cursor

    service = AnalyticsService(mock_db)
    dist = await service.get_category_distribution()

    assert len(dist) == 2
    assert dist[0]["_id"] == "Electronics"
    assert dist[0]["total"] == 20
    assert dist[1]["verified"] == 5
