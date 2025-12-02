"""
Structured Logging Configuration
Provides JSON and text-based logging with different levels
"""

import logging
import json
import sys
from datetime import datetime
from pathlib import Path


class NonClosingStreamHandler(logging.StreamHandler):
    """Stream handler that avoids closing or replacing the underlying stream."""

    def __init__(self, stream=None):
        base_stream = stream or getattr(sys, "__stdout__", sys.stdout)
        super().__init__(base_stream)

    def close(self) -> None:  # pragma: no cover
        try:
            self.flush()
        finally:
            self.acquire()
            try:
                self.stream = None
            finally:
                self.release()


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""

    def format(self, record: logging.LogRecord) -> str:
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
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "extra_data"):
            log_data["extra"] = record.extra_data

        return json.dumps(log_data, ensure_ascii=False)


def setup_logging(
    log_level: str = "INFO",
    log_format: str = "text",
    log_file: str = None,
    app_name: str = "stock_count",
) -> logging.Logger:
    """
    Setup application logging

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: Format type (json or text)
        log_file: Optional log file path
        app_name: Application name for logger

    Returns:
        Configured logger instance
    """
    # Get root logger
    logger = logging.getLogger(app_name)

    # Set level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    logger.setLevel(numeric_level)

    # Remove existing handlers
    logger.handlers = []

    # Console handler
    console_handler = NonClosingStreamHandler()
    console_handler.setLevel(numeric_level)

    if log_format == "json":
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler (if specified)
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    # Prevent propagation to root logger
    logger.propagate = False

    return logger
