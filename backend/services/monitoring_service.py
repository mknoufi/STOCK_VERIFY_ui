"""
Monitoring Service - Application metrics and health monitoring
Tracks performance, errors, and system health
Provides Prometheus-compatible metrics
"""

import logging
import threading
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, cast

logger = logging.getLogger(__name__)


class MonitoringService:
    """
    Monitoring service for application metrics
    Tracks requests, errors, performance, and system health
    """

    def __init__(self, history_size: int = 1000):
        self.history_size = history_size

        # Metrics
        self._request_count = 0
        self._error_count = 0
        self._total_response_time = 0.0
        self._request_times: deque = deque(maxlen=history_size)

        # Per-endpoint metrics
        self._endpoint_metrics: Dict[str, Dict[str, Any]] = defaultdict(
            lambda: {
                "count": 0,
                "errors": 0,
                "total_time": 0.0,
                "avg_time": 0.0,
            }
        )

        # Error tracking
        self._recent_errors: deque = deque(maxlen=100)

        # System health
        self._health_status: Dict[str, Any] = {
            "status": "healthy",
            "last_check": datetime.utcnow().isoformat(),
            "uptime": 0,
            "start_time": datetime.utcnow(),
        }

        self._lock = threading.Lock()

    def track_request(
        self,
        endpoint: str,
        method: str = "GET",
        status_code: int = 200,
        duration: float = 0.0,
    ):
        """Track API request"""
        with self._lock:
            self._request_count += 1
            self._total_response_time += duration
            self._request_times.append(
                {
                    "endpoint": endpoint,
                    "method": method,
                    "status_code": status_code,
                    "duration": duration,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

            # Update endpoint metrics
            endpoint_key = f"{method} {endpoint}"
            metrics = self._endpoint_metrics[endpoint_key]
            metrics["count"] += 1
            metrics["total_time"] += duration
            metrics["avg_time"] = metrics["total_time"] / metrics["count"]

            if status_code >= 400:
                metrics["errors"] += 1
                self._error_count += 1

    def track_error(
        self, endpoint: str, error: Exception, context: Optional[Dict[str, Any]] = None
    ):
        """Track error occurrence"""
        with self._lock:
            self._error_count += 1

            error_info = {
                "endpoint": endpoint,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "context": context or {},
                "timestamp": datetime.utcnow().isoformat(),
            }

            self._recent_errors.append(error_info)

            # Update endpoint error count
            endpoint_key = f"ERROR {endpoint}"
            if endpoint_key not in self._endpoint_metrics:
                self._endpoint_metrics[endpoint_key] = {
                    "count": 0,
                    "errors": 0,
                    "total_time": 0.0,
                    "avg_time": 0.0,
                }
            self._endpoint_metrics[endpoint_key]["errors"] += 1

    def get_endpoint_metrics(self, endpoint: str) -> Dict[str, Any]:
        """Get metrics for a specific endpoint"""
        with self._lock:
            # Try exact match first
            for key, metrics in self._endpoint_metrics.items():
                if f"GET {endpoint}" == key:
                    return dict(metrics)

            # Fallback to aggregation if multiple methods
            aggregated: Dict[str, Any] = {
                "count": 0,
                "errors": 0,
                "total_time": 0.0,
                "avg_time": 0.0,
            }

            found = False
            for key, metrics in self._endpoint_metrics.items():
                if key.endswith(f" {endpoint}"):
                    found = True
                    aggregated["count"] += metrics["count"]
                    aggregated["errors"] += metrics["errors"]
                    aggregated["total_time"] += metrics["total_time"]

            if found and aggregated["count"] > 0:
                aggregated["avg_time"] = aggregated["total_time"] / aggregated["count"]
                return aggregated

            return {}

    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        with self._lock:
            start_time = cast(datetime, self._health_status["start_time"])
            uptime = (datetime.utcnow() - start_time).total_seconds()
            avg_response_time = (
                self._total_response_time / self._request_count if self._request_count > 0 else 0.0
            )

            # Calculate p50, p95, p99 response times
            if self._request_times:
                sorted_times = sorted([r["duration"] for r in self._request_times], reverse=True)
                p50_idx = int(len(sorted_times) * 0.5)
                p95_idx = int(len(sorted_times) * 0.95)
                p99_idx = int(len(sorted_times) * 0.99)

                p50 = sorted_times[p50_idx] if p50_idx < len(sorted_times) else 0
                p95 = sorted_times[p95_idx] if p95_idx < len(sorted_times) else 0
                p99 = sorted_times[p99_idx] if p99_idx < len(sorted_times) else 0
            else:
                p50 = p95 = p99 = 0

            error_rate = (
                (self._error_count / self._request_count) * 100 if self._request_count > 0 else 0.0
            )

            return {
                "requests": {
                    "total": self._request_count,
                    "errors": self._error_count,
                    "success_rate": 100.0 - error_rate,
                    "error_rate": error_rate,
                },
                "performance": {
                    "avg_response_time": avg_response_time,
                    "p50": p50,
                    "p95": p95,
                    "p99": p99,
                },
                "uptime": {
                    "seconds": uptime,
                    "formatted": str(timedelta(seconds=int(uptime))),
                },
                "endpoints": dict(self._endpoint_metrics),
                "recent_errors": list(self._recent_errors)[-10:],  # Last 10 errors
            }

    def get_health(self) -> Dict[str, Any]:
        """Get health status"""
        with self._lock:
            start_time = cast(datetime, self._health_status["start_time"])
            uptime = (datetime.utcnow() - start_time).total_seconds()

            # Determine health status
            error_rate = (
                (self._error_count / self._request_count) * 100 if self._request_count > 0 else 0.0
            )

            if error_rate > 10:
                status = "degraded"
            elif error_rate > 5:
                status = "warning"
            else:
                status = "healthy"

            return {
                "status": status,
                "uptime": uptime,
                "start_time": start_time.isoformat(),
                "last_check": datetime.utcnow().isoformat(),
                "metrics": {
                    "total_requests": self._request_count,
                    "total_errors": self._error_count,
                    "error_rate": error_rate,
                },
            }

    def reset(self):
        """Reset all metrics"""
        with self._lock:
            self._request_count = 0
            self._error_count = 0
            self._total_response_time = 0.0
            self._request_times.clear()
            self._endpoint_metrics.clear()
            self._recent_errors.clear()

    def get_prometheus_metrics(self) -> str:
        """
        Get metrics in Prometheus text format
        https://prometheus.io/docs/instrumenting/exposition_formats/
        """
        with self._lock:
            lines = []

            # Request count
            lines.append("# HELP http_requests_total Total number of HTTP requests")
            lines.append("# TYPE http_requests_total counter")
            lines.append(f"http_requests_total {self._request_count}")
            lines.append("")

            # Error count
            lines.append("# HELP http_requests_errors_total Total number of HTTP errors")
            lines.append("# TYPE http_requests_errors_total counter")
            lines.append(f"http_requests_errors_total {self._error_count}")
            lines.append("")

            # Average response time
            avg_time = (
                self._total_response_time / self._request_count if self._request_count > 0 else 0.0
            )
            lines.append("# HELP http_request_duration_seconds Average HTTP request duration")
            lines.append("# TYPE http_request_duration_seconds gauge")
            lines.append(f"http_request_duration_seconds {avg_time:.6f}")
            lines.append("")

            # Per-endpoint metrics
            lines.append("# HELP http_requests_by_endpoint_total Requests by endpoint")
            lines.append("# TYPE http_requests_by_endpoint_total counter")
            for endpoint, metrics in self._endpoint_metrics.items():
                # Escape labels
                safe_endpoint = endpoint.replace('"', '\\"')
                lines.append(
                    f'http_requests_by_endpoint_total{{endpoint="{safe_endpoint}"}} {metrics["count"]}'
                )
            lines.append("")

            lines.append(
                "# HELP http_request_duration_by_endpoint_seconds Average duration by endpoint"
            )
            lines.append("# TYPE http_request_duration_by_endpoint_seconds gauge")
            for endpoint, metrics in self._endpoint_metrics.items():
                safe_endpoint = endpoint.replace('"', '\\"')
                lines.append(
                    f'http_request_duration_by_endpoint_seconds{{endpoint="{safe_endpoint}"}} {metrics["avg_time"]:.6f}'
                )
            lines.append("")

            # Uptime
            start_time = cast(datetime, self._health_status["start_time"])
            uptime = (datetime.utcnow() - start_time).total_seconds()
            lines.append("# HELP app_uptime_seconds Application uptime in seconds")
            lines.append("# TYPE app_uptime_seconds counter")
            lines.append(f"app_uptime_seconds {uptime:.0f}")
            lines.append("")

            # Error rate
            error_rate = (
                (self._error_count / self._request_count) if self._request_count > 0 else 0.0
            )
            lines.append("# HELP http_error_rate Error rate (errors/requests)")
            lines.append("# TYPE http_error_rate gauge")
            lines.append(f"http_error_rate {error_rate:.6f}")
            lines.append("")

            return "\n".join(lines)
