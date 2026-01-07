"""
Structured Logging (2024/2025 Best Practice)
JSON-formatted logging for better observability
"""

import json
import logging
import sys
import traceback
from datetime import datetime
from typing import Any, Optional


class NonClosingStreamHandler(logging.StreamHandler):
    """StreamHandler variant that never closes the underlying stream."""

    def close(self) -> None:  # pragma: no cover - defensive
        try:
            self.flush()
        finally:
            # Intentionally avoid closing the stream to keep sys.stdout usable.
            self.acquire()
            try:
                self.stream = None
            finally:
                self.release()


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": (
                    traceback.format_exception(*record.exc_info) if record.exc_info else None
                ),
            }

        # Add extra fields
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)

        # Add request ID if present
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id

        return json.dumps(log_data, ensure_ascii=False)


def setup_structured_logging(
    log_level: str = "INFO", log_format: str = "json", log_file: Optional[str] = None
):
    """
    Setup structured logging

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: Log format ("json" or "text")
        log_file: Optional log file path
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Remove existing handlers
    root_logger.handlers = []

    # Console handler
    console_stream = getattr(sys, "__stdout__", sys.stdout)
    console_handler = NonClosingStreamHandler(console_stream)

    if log_format == "json":
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(
            logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        )

    root_logger.addHandler(console_handler)

    # File handler if specified
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(JSONFormatter())
        root_logger.addHandler(file_handler)

    return root_logger


class StructuredLogger:
    """Structured logger with additional context"""

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)

    def _log_with_context(
        self,
        level: int,
        message: str,
        extra_fields: dict[str, Optional[Any]] = None,
        request_id: Optional[str] = None,
        exc_info=None,
    ):
        """Log with additional context"""
        extra = {}
        if extra_fields:
            extra["extra_fields"] = extra_fields
        if request_id:
            extra["request_id"] = request_id

        self.logger.log(level, message, extra=extra if extra else None, exc_info=exc_info)

    def debug(
        self,
        message: str,
        extra_fields: dict[str, Optional[Any]] = None,
        request_id: Optional[str] = None,
    ):
        """Log debug message"""
        self._log_with_context(logging.DEBUG, message, extra_fields, request_id)

    def info(
        self,
        message: str,
        extra_fields: dict[str, Optional[Any]] = None,
        request_id: Optional[str] = None,
    ):
        """Log info message"""
        self._log_with_context(logging.INFO, message, extra_fields, request_id)

    def warning(
        self,
        message: str,
        extra_fields: dict[str, Optional[Any]] = None,
        request_id: Optional[str] = None,
    ):
        """Log warning message"""
        self._log_with_context(logging.WARNING, message, extra_fields, request_id)

    def error(
        self,
        message: str,
        extra_fields: dict[str, Optional[Any]] = None,
        request_id: Optional[str] = None,
        exc_info=None,
    ):
        """Log error message"""
        self._log_with_context(logging.ERROR, message, extra_fields, request_id, exc_info)

    def critical(
        self,
        message: str,
        extra_fields: dict[str, Optional[Any]] = None,
        request_id: Optional[str] = None,
        exc_info=None,
    ):
        """Log critical message"""
        self._log_with_context(logging.CRITICAL, message, extra_fields, request_id, exc_info)
