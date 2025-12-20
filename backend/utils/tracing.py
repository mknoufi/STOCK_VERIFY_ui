"""Tracing utilities for the backend.

This module wires OpenTelemetry tracing to FastAPI and exposes a simple
`init_tracing` entrypoint that is safe to call on startup. Tracing is
no-op unless explicitly enabled via environment variables and OpenTelemetry
packages being installed. Missing OTEL packages should never break imports
or tests.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def _is_tracing_enabled() -> bool:
    """Return True if tracing should be enabled based on env settings."""

    # Explicit opt-out
    if os.getenv("STOCK_VERIFY_TRACING_DISABLED", "").lower() in {"1", "true", "yes"}:
        return False

    # Opt-in flag or presence of OTLP endpoint
    if os.getenv("STOCK_VERIFY_TRACING_ENABLED"):
        return True

    if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") or os.getenv(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"
    ):
        return True

    # Default: disabled to avoid surprises in production
    return False


def init_tracing(service_name: str | None = None) -> None:
    """Initialize OpenTelemetry tracing for the FastAPI app.

    This sets a global TracerProvider with an OTLP HTTP exporter pointing to
    the local AI Toolkit / OTLP collector by default.

    It is safe to call multiple times; subsequent calls will simply
    reconfigure the provider.
    """

    if not _is_tracing_enabled():
        logger.info(
            "Tracing is disabled (set STOCK_VERIFY_TRACING_ENABLED=1 to enable)"
        )
        return

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter,
        )
        from opentelemetry.sdk.resources import SERVICE_NAME, Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ModuleNotFoundError:
        logger.info("OpenTelemetry packages not installed; tracing disabled")
        return
    except Exception:
        logger.exception("Unexpected error importing OpenTelemetry; tracing disabled")
        return

    service: str = (
        service_name
        or os.getenv("STOCK_VERIFY_SERVICE_NAME", "stock-verify-backend")
        or "stock-verify-backend"
    )

    resource = Resource(attributes={SERVICE_NAME: service})
    provider = TracerProvider(resource=resource)

    # OTLP endpoint defaults to AI Toolkit collector running locally
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT") or os.getenv(
        "OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318/v1/traces"
    )

    span_exporter = OTLPSpanExporter(endpoint=endpoint)
    span_processor = BatchSpanProcessor(span_exporter)
    provider.add_span_processor(span_processor)

    trace.set_tracer_provider(provider)

    logger.info(
        "Tracing initialized with OTLP endpoint %s and service name %s",
        endpoint,
        service,
    )


def instrument_fastapi_app(app) -> None:
    """Instrument a FastAPI app instance with OpenTelemetry.

    This attaches middleware/route instrumentation so incoming requests are
    traced automatically. Safe to call even when tracing is disabled.
    """

    if not _is_tracing_enabled():
        return

    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    except ModuleNotFoundError:
        logger.info("OpenTelemetry FastAPI instrumentation not installed; skipping")
        return
    except Exception:
        logger.exception("Unexpected error importing FastAPI instrumentation; skipping")
        return

    try:
        FastAPIInstrumentor.instrument_app(app)
        logger.info("FastAPI app instrumented for OpenTelemetry tracing")
    except Exception:
        # Tracing should never break app startup
        logger.exception("Failed to instrument FastAPI app for tracing")
