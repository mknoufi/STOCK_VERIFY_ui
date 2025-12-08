"""
Stock Verify Evaluation Framework
=================================

Comprehensive evaluation suite covering:
- API Performance Metrics (response time, throughput, success rates)
- Business Logic Quality (variance calculations, sync consistency)
- Workflow Completion (session lifecycle, verification flows)
- Data Quality (accuracy, consistency between databases)

Usage:
    pytest backend/tests/evaluation/ -v --tb=short
    pytest backend/tests/evaluation/ -v -m performance
    pytest backend/tests/evaluation/ -v -m business_logic
    pytest backend/tests/evaluation/ -v -m data_quality
"""

from .evaluators import (
    APIPerformanceEvaluator,
    BusinessLogicEvaluator,
    DataQualityEvaluator,
    WorkflowEvaluator,
)
from .metrics_collector import EvaluationReport, MetricsCollector

__all__ = [
    "MetricsCollector",
    "EvaluationReport",
    "APIPerformanceEvaluator",
    "BusinessLogicEvaluator",
    "DataQualityEvaluator",
    "WorkflowEvaluator",
]
