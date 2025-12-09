"""
Enterprise Observability Service
Structured logging, distributed tracing, and metrics collection
"""

import asyncio
import json
import logging
import time
import uuid
from contextvars import ContextVar
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# Context variables for request tracing
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
correlation_id_ctx: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)
span_id_ctx: ContextVar[Optional[str]] = ContextVar("span_id", default=None)
trace_id_ctx: ContextVar[Optional[str]] = ContextVar("trace_id", default=None)

logger = logging.getLogger(__name__)


class LogLevel(str, Enum):
    """Log levels"""

    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class StructuredLogEntry(BaseModel):
    """Structured log entry for enterprise logging"""

    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    level: str
    message: str

    # Tracing context
    request_id: Optional[str] = None
    correlation_id: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    parent_span_id: Optional[str] = None

    # Service context
    service: str = "stock-verify"
    environment: str = "development"
    version: str = "2.1.0"

    # Request context
    method: Optional[str] = None
    path: Optional[str] = None
    user_id: Optional[str] = None
    ip_address: Optional[str] = None

    # Performance
    duration_ms: Optional[float] = None

    # Additional data
    extra: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[Dict[str, Any]] = None


class StructuredLogger:
    """
    Enterprise structured logger with:
    - JSON output for log aggregation
    - Automatic context injection (request_id, trace_id, etc.)
    - Error tracking with stack traces
    - Performance timing
    """

    def __init__(
        self,
        service_name: str = "stock-verify",
        environment: str = "development",
        version: str = "2.1.0",
        output_json: bool = True,
    ):
        self.service_name = service_name
        self.environment = environment
        self.version = version
        self.output_json = output_json
        self._logger = logging.getLogger(service_name)

    def _get_context(self) -> Dict[str, Optional[str]]:
        """Get current tracing context"""
        return {
            "request_id": request_id_ctx.get(),
            "correlation_id": correlation_id_ctx.get(),
            "trace_id": trace_id_ctx.get(),
            "span_id": span_id_ctx.get(),
        }

    def _format_entry(
        self,
        level: str,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
        error: Optional[Exception] = None,
        **kwargs,
    ) -> str:
        """Format log entry"""
        context = self._get_context()

        entry = StructuredLogEntry(
            level=level,
            message=message,
            service=self.service_name,
            environment=self.environment,
            version=self.version,
            request_id=context.get("request_id"),
            correlation_id=context.get("correlation_id"),
            trace_id=context.get("trace_id"),
            span_id=context.get("span_id"),
            extra=extra or {},
            **kwargs,
        )

        if error:
            entry.error = {
                "type": type(error).__name__,
                "message": str(error),
                "traceback": self._get_traceback(error),
            }

        if self.output_json:
            return json.dumps(entry.model_dump(exclude_none=True))
        return f"[{entry.timestamp}] {entry.level.upper()} - {entry.message}"

    def _get_traceback(self, error: Exception) -> Optional[str]:
        """Get traceback string from exception"""
        import traceback

        try:
            return "".join(traceback.format_exception(type(error), error, error.__traceback__))
        except Exception:
            return str(error)

    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self._logger.debug(self._format_entry("debug", message, **kwargs))

    def info(self, message: str, **kwargs):
        """Log info message"""
        self._logger.info(self._format_entry("info", message, **kwargs))

    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self._logger.warning(self._format_entry("warning", message, **kwargs))

    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log error message"""
        self._logger.error(self._format_entry("error", message, error=error, **kwargs))

    def critical(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log critical message"""
        self._logger.critical(self._format_entry("critical", message, error=error, **kwargs))


class Span:
    """Distributed tracing span"""

    def __init__(
        self, name: str, trace_id: Optional[str] = None, parent_span_id: Optional[str] = None
    ):
        self.name = name
        self.trace_id = trace_id or trace_id_ctx.get() or str(uuid.uuid4())
        self.span_id = str(uuid.uuid4())[:16]
        self.parent_span_id = parent_span_id or span_id_ctx.get()
        self.start_time = time.time()
        self.end_time: Optional[float] = None
        self.status = "ok"
        self.attributes: Dict[str, Any] = {}
        self.events: List[Dict[str, Any]] = []
        self._token: Optional[Any] = None

    def set_attribute(self, key: str, value: Any):
        """Set span attribute"""
        self.attributes[key] = value

    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        """Add event to span"""
        self.events.append(
            {
                "name": name,
                "timestamp": datetime.utcnow().isoformat(),
                "attributes": attributes or {},
            }
        )

    def set_status(self, status: str, description: Optional[str] = None):
        """Set span status"""
        self.status = status
        if description:
            self.attributes["status_description"] = description

    def end(self):
        """End the span"""
        self.end_time = time.time()
        if self._token:
            span_id_ctx.reset(self._token)

    @property
    def duration_ms(self) -> float:
        """Get span duration in milliseconds"""
        end = self.end_time or time.time()
        return (end - self.start_time) * 1000

    def to_dict(self) -> Dict[str, Any]:
        """Convert span to dictionary"""
        return {
            "name": self.name,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "start_time": datetime.fromtimestamp(self.start_time).isoformat(),
            "end_time": (
                datetime.fromtimestamp(self.end_time).isoformat() if self.end_time else None
            ),
            "duration_ms": self.duration_ms,
            "status": self.status,
            "attributes": self.attributes,
            "events": self.events,
        }

    def __enter__(self):
        self._token = span_id_ctx.set(self.span_id)
        trace_id_ctx.set(self.trace_id)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.set_status("error", str(exc_val))
        self.end()


class Tracer:
    """Distributed tracing manager"""

    def __init__(self, service_name: str = "stock-verify"):
        self.service_name = service_name
        self._spans: List[Span] = []
        self._max_spans = 1000

    def start_span(
        self, name: str, trace_id: Optional[str] = None, parent_span_id: Optional[str] = None
    ) -> Span:
        """Start a new span"""
        span = Span(name, trace_id, parent_span_id)
        self._spans.append(span)

        # Limit stored spans
        if len(self._spans) > self._max_spans:
            self._spans = self._spans[-self._max_spans :]

        return span

    def get_current_trace_id(self) -> Optional[str]:
        """Get current trace ID"""
        return trace_id_ctx.get()

    def get_current_span_id(self) -> Optional[str]:
        """Get current span ID"""
        return span_id_ctx.get()


class MetricsCollector:
    """
    Metrics collector for application monitoring
    Prometheus-compatible format
    """

    def __init__(self, service_name: str = "stock-verify"):
        self.service_name = service_name
        self._counters: Dict[str, int] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = {}
        self._lock = asyncio.Lock()

    async def increment(self, name: str, value: int = 1, labels: Optional[Dict[str, str]] = None):
        """Increment a counter"""
        key = self._make_key(name, labels)
        async with self._lock:
            self._counters[key] = self._counters.get(key, 0) + value

    async def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Set a gauge value"""
        key = self._make_key(name, labels)
        async with self._lock:
            self._gauges[key] = value

    async def observe(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Record a histogram observation"""
        key = self._make_key(name, labels)
        async with self._lock:
            if key not in self._histograms:
                self._histograms[key] = []
            self._histograms[key].append(value)
            # Keep last 1000 observations
            if len(self._histograms[key]) > 1000:
                self._histograms[key] = self._histograms[key][-1000:]

    def _make_key(self, name: str, labels: Optional[Dict[str, str]]) -> str:
        """Create metric key from name and labels"""
        if not labels:
            return name
        label_str = ",".join(f'{k}="{v}"' for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"

    async def get_metrics(self) -> Dict[str, Any]:
        """Get all metrics"""
        async with self._lock:
            return {
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "histograms": {
                    k: {
                        "count": len(v),
                        "sum": sum(v),
                        "min": min(v) if v else 0,
                        "max": max(v) if v else 0,
                        "avg": sum(v) / len(v) if v else 0,
                    }
                    for k, v in self._histograms.items()
                },
            }

    def to_prometheus(self) -> str:
        """Export metrics in Prometheus format"""
        lines = []

        for name, value in self._counters.items():
            lines.append(f"{self._to_prometheus_name(name)} {value}")

        for name, value in self._gauges.items():
            lines.append(f"{self._to_prometheus_name(name)} {value}")

        for name, values in self._histograms.items():
            if values:
                prom_name = self._to_prometheus_name(name)
                lines.append(f"{prom_name}_count {len(values)}")
                lines.append(f"{prom_name}_sum {sum(values)}")

        return "\n".join(lines)

    def _to_prometheus_name(self, name: str) -> str:
        """Convert metric name to Prometheus format"""
        return name.replace(".", "_").replace("-", "_")


# Global instances
structured_logger = StructuredLogger()
tracer = Tracer()
metrics = MetricsCollector()


def generate_request_id() -> str:
    """Generate a unique request ID"""
    return str(uuid.uuid4())


def set_request_context(
    request_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    trace_id: Optional[str] = None,
):
    """Set request context for logging and tracing"""
    if request_id:
        request_id_ctx.set(request_id)
    if correlation_id:
        correlation_id_ctx.set(correlation_id)
    if trace_id:
        trace_id_ctx.set(trace_id)
