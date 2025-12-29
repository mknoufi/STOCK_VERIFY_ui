from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class AnalyticsEvent(BaseModel):
    """
    Represents a real-time event for analytics and activity feed.
    Corresponds to RealTimeEvent in data-model.md.
    """

    type: Literal[
        "session_update",
        "item_update",
        "count_complete",
        "user_activity",
        "system_alert",
    ]
    payload: dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    target_roles: list[str] = Field(default_factory=list)


class VarianceAnalytics(BaseModel):
    """
    Aggregated analytics data for variance reporting.
    """

    period_type: Literal["daily", "weekly", "monthly"]
    period_start: datetime
    period_end: datetime

    total_items_counted: int = 0
    items_with_variance: int = 0
    variance_rate: float = 0.0
    accuracy_score: float = 100.0

    # variance_by_category: category -> {count: int, total_variance_value: float}
    variance_by_category: dict[str, dict[str, float]] = Field(default_factory=dict)
    variance_by_reason: dict[str, int] = Field(default_factory=dict)

    previous_period_accuracy: float = 0.0
    accuracy_change: float = 0.0

    session_ids: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    generated_by: str
