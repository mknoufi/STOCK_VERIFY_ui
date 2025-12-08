"""
Metrics Collector - Central metrics collection and reporting for evaluation framework.

Collects, aggregates, and reports evaluation metrics across all evaluation categories.
"""

import json
import statistics
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional


class MetricCategory(Enum):
    """Categories for evaluation metrics."""
    API_PERFORMANCE = "api_performance"
    BUSINESS_LOGIC = "business_logic"
    DATA_QUALITY = "data_quality"
    WORKFLOW = "workflow"
    SECURITY = "security"


class MetricStatus(Enum):
    """Status of a metric evaluation."""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    SKIPPED = "skipped"


@dataclass
class Metric:
    """Individual metric measurement."""
    name: str
    value: float
    unit: str
    category: MetricCategory
    threshold: Optional[float] = None
    threshold_type: str = "max"  # "max" or "min"
    status: MetricStatus = MetricStatus.PASSED
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def evaluate(self) -> MetricStatus:
        """Evaluate metric against threshold."""
        if self.threshold is None:
            return MetricStatus.PASSED

        if self.threshold_type == "max":
            if self.value > self.threshold:
                return MetricStatus.FAILED
            elif self.value > self.threshold * 0.8:
                return MetricStatus.WARNING
        elif self.threshold_type == "min":
            if self.value < self.threshold:
                return MetricStatus.FAILED
            elif self.value < self.threshold * 1.2:
                return MetricStatus.WARNING

        return MetricStatus.PASSED

    def to_dict(self) -> Dict[str, Any]:
        """Convert metric to dictionary."""
        return {
            "name": self.name,
            "value": self.value,
            "unit": self.unit,
            "category": self.category.value,
            "threshold": self.threshold,
            "threshold_type": self.threshold_type,
            "status": self.status.value,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
        }


@dataclass
class EvaluationReport:
    """Complete evaluation report with all metrics and summary."""
    metrics: List[Metric] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def duration_seconds(self) -> float:
        """Get evaluation duration in seconds."""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return 0.0

    @property
    def passed_count(self) -> int:
        """Count of passed metrics."""
        return sum(1 for m in self.metrics if m.status == MetricStatus.PASSED)

    @property
    def failed_count(self) -> int:
        """Count of failed metrics."""
        return sum(1 for m in self.metrics if m.status == MetricStatus.FAILED)

    @property
    def warning_count(self) -> int:
        """Count of warning metrics."""
        return sum(1 for m in self.metrics if m.status == MetricStatus.WARNING)

    @property
    def success_rate(self) -> float:
        """Calculate overall success rate."""
        total = len(self.metrics)
        if total == 0:
            return 1.0
        return self.passed_count / total

    def get_metrics_by_category(self, category: MetricCategory) -> List[Metric]:
        """Get metrics filtered by category."""
        return [m for m in self.metrics if m.category == category]

    def get_summary(self) -> Dict[str, Any]:
        """Get evaluation summary."""
        return {
            "total_metrics": len(self.metrics),
            "passed": self.passed_count,
            "failed": self.failed_count,
            "warnings": self.warning_count,
            "success_rate": f"{self.success_rate * 100:.1f}%",
            "duration_seconds": self.duration_seconds,
            "categories": {
                cat.value: len(self.get_metrics_by_category(cat))
                for cat in MetricCategory
            }
        }

    def to_dict(self) -> Dict[str, Any]:
        """Convert report to dictionary."""
        return {
            "summary": self.get_summary(),
            "metrics": [m.to_dict() for m in self.metrics],
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "metadata": self.metadata,
        }

    def to_json(self, indent: int = 2) -> str:
        """Convert report to JSON string."""
        return json.dumps(self.to_dict(), indent=indent)

    def save(self, path: Path) -> None:
        """Save report to file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            f.write(self.to_json())

    def print_summary(self) -> None:
        """Print human-readable summary to console."""
        print("\n" + "=" * 60)
        print("📊 EVALUATION REPORT SUMMARY")
        print("=" * 60)

        summary = self.get_summary()

        # Overall status
        if self.failed_count == 0:
            status_icon = "✅"
            status_text = "ALL PASSED"
        elif self.failed_count < len(self.metrics) * 0.2:
            status_icon = "⚠️"
            status_text = "MOSTLY PASSED"
        else:
            status_icon = "❌"
            status_text = "NEEDS ATTENTION"

        print(f"\n{status_icon} Overall Status: {status_text}")
        print(f"   Success Rate: {summary['success_rate']}")
        print(f"   Duration: {summary['duration_seconds']:.2f}s")

        print(f"\n📈 Metrics Breakdown:")
        print(f"   ✅ Passed:   {summary['passed']}")
        print(f"   ⚠️  Warnings: {summary['warnings']}")
        print(f"   ❌ Failed:   {summary['failed']}")

        print(f"\n📁 By Category:")
        for cat, count in summary['categories'].items():
            if count > 0:
                print(f"   {cat}: {count} metrics")

        # Show failed metrics
        if self.failed_count > 0:
            print(f"\n❌ Failed Metrics:")
            for m in self.metrics:
                if m.status == MetricStatus.FAILED:
                    threshold_info = f" (threshold: {m.threshold}{m.unit})" if m.threshold else ""
                    print(f"   - {m.name}: {m.value:.2f}{m.unit}{threshold_info}")

        print("\n" + "=" * 60)


class MetricsCollector:
    """
    Central collector for evaluation metrics.

    Usage:
        collector = MetricsCollector()
        collector.start_evaluation()

        # Record metrics
        collector.record_latency("login", 150.5, threshold=200.0)
        collector.record_success_rate("api_calls", 0.98, threshold=0.95)
        collector.record_accuracy("variance_calc", 0.995, threshold=0.99)

        # Generate report
        report = collector.finish_evaluation()
        report.print_summary()
        report.save(Path("evaluation_results.json"))
    """

    def __init__(self):
        self.metrics: List[Metric] = []
        self.start_time: Optional[datetime] = None
        self._timers: Dict[str, float] = {}

    def start_evaluation(self) -> None:
        """Start evaluation session."""
        self.metrics = []
        self.start_time = datetime.now()
        self._timers = {}

    def finish_evaluation(self, metadata: Optional[Dict[str, Any]] = None) -> EvaluationReport:
        """Finish evaluation and generate report."""
        report = EvaluationReport(
            metrics=self.metrics.copy(),
            start_time=self.start_time or datetime.now(),
            end_time=datetime.now(),
            metadata=metadata or {},
        )
        return report

    def start_timer(self, name: str) -> None:
        """Start a named timer."""
        self._timers[name] = time.time()

    def stop_timer(self, name: str) -> float:
        """Stop a named timer and return elapsed time in ms."""
        if name not in self._timers:
            return 0.0
        elapsed = (time.time() - self._timers[name]) * 1000
        del self._timers[name]
        return elapsed

    def record_metric(
        self,
        name: str,
        value: float,
        unit: str,
        category: MetricCategory,
        threshold: Optional[float] = None,
        threshold_type: str = "max",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record a generic metric."""
        metric = Metric(
            name=name,
            value=value,
            unit=unit,
            category=category,
            threshold=threshold,
            threshold_type=threshold_type,
            metadata=metadata or {},
        )
        metric.status = metric.evaluate()
        self.metrics.append(metric)

        # Log metric
        status_icon = {
            MetricStatus.PASSED: "✓",
            MetricStatus.FAILED: "✗",
            MetricStatus.WARNING: "⚠",
            MetricStatus.SKIPPED: "○",
        }[metric.status]

        threshold_info = f" (threshold: {threshold}{unit})" if threshold else ""
        print(f"  {status_icon} {name}: {value:.2f}{unit}{threshold_info}")

        return metric

    # =====================
    # API Performance Metrics
    # =====================

    def record_latency(
        self,
        endpoint: str,
        latency_ms: float,
        threshold: float = 200.0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record API endpoint latency."""
        return self.record_metric(
            name=f"{endpoint}_latency",
            value=latency_ms,
            unit="ms",
            category=MetricCategory.API_PERFORMANCE,
            threshold=threshold,
            threshold_type="max",
            metadata=metadata,
        )

    def record_throughput(
        self,
        name: str,
        requests_per_second: float,
        threshold: float = 10.0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record throughput metric."""
        return self.record_metric(
            name=f"{name}_throughput",
            value=requests_per_second,
            unit="req/s",
            category=MetricCategory.API_PERFORMANCE,
            threshold=threshold,
            threshold_type="min",
            metadata=metadata,
        )

    def record_success_rate(
        self,
        name: str,
        rate: float,
        threshold: float = 0.95,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record success rate (0.0 to 1.0)."""
        return self.record_metric(
            name=f"{name}_success_rate",
            value=rate * 100,
            unit="%",
            category=MetricCategory.API_PERFORMANCE,
            threshold=threshold * 100,
            threshold_type="min",
            metadata=metadata,
        )

    def record_error_rate(
        self,
        name: str,
        rate: float,
        threshold: float = 0.05,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record error rate (0.0 to 1.0)."""
        return self.record_metric(
            name=f"{name}_error_rate",
            value=rate * 100,
            unit="%",
            category=MetricCategory.API_PERFORMANCE,
            threshold=threshold * 100,
            threshold_type="max",
            metadata=metadata,
        )

    # =====================
    # Business Logic Metrics
    # =====================

    def record_accuracy(
        self,
        name: str,
        accuracy: float,
        threshold: float = 0.99,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record calculation accuracy (0.0 to 1.0)."""
        return self.record_metric(
            name=f"{name}_accuracy",
            value=accuracy * 100,
            unit="%",
            category=MetricCategory.BUSINESS_LOGIC,
            threshold=threshold * 100,
            threshold_type="min",
            metadata=metadata,
        )

    def record_variance_delta(
        self,
        expected: float,
        actual: float,
        threshold: float = 0.01,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record variance calculation delta."""
        delta = abs(expected - actual)
        return self.record_metric(
            name="variance_calculation_delta",
            value=delta,
            unit="",
            category=MetricCategory.BUSINESS_LOGIC,
            threshold=threshold,
            threshold_type="max",
            metadata={"expected": expected, "actual": actual, **(metadata or {})},
        )

    # =====================
    # Data Quality Metrics
    # =====================

    def record_consistency(
        self,
        name: str,
        consistency_rate: float,
        threshold: float = 0.99,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record data consistency rate."""
        return self.record_metric(
            name=f"{name}_consistency",
            value=consistency_rate * 100,
            unit="%",
            category=MetricCategory.DATA_QUALITY,
            threshold=threshold * 100,
            threshold_type="min",
            metadata=metadata,
        )

    def record_completeness(
        self,
        name: str,
        completeness_rate: float,
        threshold: float = 0.95,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record data completeness rate."""
        return self.record_metric(
            name=f"{name}_completeness",
            value=completeness_rate * 100,
            unit="%",
            category=MetricCategory.DATA_QUALITY,
            threshold=threshold * 100,
            threshold_type="min",
            metadata=metadata,
        )

    def record_sync_lag(
        self,
        lag_seconds: float,
        threshold: float = 60.0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record data sync lag time."""
        return self.record_metric(
            name="sync_lag",
            value=lag_seconds,
            unit="s",
            category=MetricCategory.DATA_QUALITY,
            threshold=threshold,
            threshold_type="max",
            metadata=metadata,
        )

    # =====================
    # Workflow Metrics
    # =====================

    def record_workflow_completion(
        self,
        workflow_name: str,
        completion_rate: float,
        threshold: float = 0.90,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record workflow completion rate."""
        return self.record_metric(
            name=f"{workflow_name}_completion",
            value=completion_rate * 100,
            unit="%",
            category=MetricCategory.WORKFLOW,
            threshold=threshold * 100,
            threshold_type="min",
            metadata=metadata,
        )

    def record_workflow_duration(
        self,
        workflow_name: str,
        duration_seconds: float,
        threshold: float = 30.0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Metric:
        """Record workflow duration."""
        return self.record_metric(
            name=f"{workflow_name}_duration",
            value=duration_seconds,
            unit="s",
            category=MetricCategory.WORKFLOW,
            threshold=threshold,
            threshold_type="max",
            metadata=metadata,
        )

    # =====================
    # Aggregate Metrics
    # =====================

    def record_latency_stats(
        self,
        name: str,
        latencies: List[float],
        p99_threshold: float = 500.0,
    ) -> Dict[str, Metric]:
        """Record latency statistics (mean, p50, p95, p99)."""
        if not latencies:
            return {}

        sorted_latencies = sorted(latencies)
        n = len(sorted_latencies)

        metrics = {}

        # Mean
        mean = statistics.mean(latencies)
        metrics["mean"] = self.record_latency(
            f"{name}_mean", mean, threshold=p99_threshold * 0.5
        )

        # P50 (median)
        p50 = sorted_latencies[int(n * 0.5)]
        metrics["p50"] = self.record_latency(
            f"{name}_p50", p50, threshold=p99_threshold * 0.6
        )

        # P95
        p95 = sorted_latencies[int(n * 0.95)]
        metrics["p95"] = self.record_latency(
            f"{name}_p95", p95, threshold=p99_threshold * 0.8
        )

        # P99
        p99 = sorted_latencies[int(n * 0.99)] if n >= 100 else sorted_latencies[-1]
        metrics["p99"] = self.record_latency(
            f"{name}_p99", p99, threshold=p99_threshold
        )

        return metrics
