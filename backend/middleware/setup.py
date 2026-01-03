import logging
import os

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from backend.config import settings

logger = logging.getLogger(__name__)


def _setup_gzip(app: FastAPI) -> None:
    """Add GZip compression middleware."""
    try:
        from fastapi.middleware.gzip import GZipMiddleware

        app.add_middleware(GZipMiddleware, minimum_size=1000)
        logger.info("✓ GZip middleware enabled")
    except ImportError:
        logger.warning("GZipMiddleware not available")


def _setup_trusted_hosts(app: FastAPI) -> None:
    """Add trusted host middleware."""
    try:
        from fastapi.middleware.trustedhost import TrustedHostMiddleware

        allowed_hosts = getattr(settings, "ALLOWED_HOSTS", None) or ["*"]
        if isinstance(allowed_hosts, str):
            allowed_hosts = [h.strip() for h in allowed_hosts.split(",")]

        app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)
        logger.info(f"✓ TrustedHost middleware enabled (hosts: {allowed_hosts})")
    except ImportError:
        logger.warning("TrustedHostMiddleware not available")


def _get_cors_origins() -> list[str]:
    """Determine allowed CORS origins based on environment."""
    if getattr(settings, "CORS_ALLOW_ORIGINS", None):
        return [o.strip() for o in (settings.CORS_ALLOW_ORIGINS or "").split(",") if o.strip()]

    _env = getattr(settings, "ENVIRONMENT", "development").lower()
    if _env == "development":
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "exp://localhost:8081",
        ]
        if getattr(settings, "CORS_DEV_ORIGINS", None):
            dev_origins = [
                o.strip() for o in (settings.CORS_DEV_ORIGINS or "").split(",") if o.strip()
            ]
            origins.extend(dev_origins)
        return origins

    logger.warning(
        "CORS_ALLOW_ORIGINS not configured for non-development environment; requests may be blocked"
    )
    return []


def _setup_cors(app: FastAPI) -> None:
    """Add CORS middleware."""
    _allowed_origins = _get_cors_origins()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-Request-ID",
        ],
    )
    logger.info(f"✓ CORS middleware enabled (origins: {len(_allowed_origins)} + regex)")


def _setup_security_headers(app: FastAPI) -> None:
    """Add security headers middleware."""
    try:
        from backend.middleware.security_headers import SecurityHeadersMiddleware

        strict_csp = os.getenv("STRICT_CSP", "false").lower() == "true"
        force_https = os.getenv("FORCE_HTTPS", "false").lower() == "true"

        app.add_middleware(
            SecurityHeadersMiddleware,
            STRICT_CSP=strict_csp,
            force_https=force_https,
        )
        logger.info("✓ Security headers middleware enabled")
    except ImportError as e:
        logger.warning(f"Security headers middleware not available: {str(e)}")
    except Exception as e:
        logger.warning(f"Failed to add SecurityHeadersMiddleware: {str(e)}")


def _setup_lan_enforcement(app: FastAPI) -> None:
    """Add LAN enforcement middleware."""
    try:
        from backend.middleware.lan_enforcement import LANEnforcementMiddleware

        app.add_middleware(LANEnforcementMiddleware)
        logger.info("✓ LAN enforcement middleware enabled")
    except ImportError as e:
        logger.warning(f"LAN enforcement middleware not available: {str(e)}")
    except Exception as e:
        logger.warning(f"Failed to add LANEnforcementMiddleware: {str(e)}")


def setup_middleware(app: FastAPI) -> None:
    """Configure all middleware for the application."""
    _setup_gzip(app)
    _setup_trusted_hosts(app)
    _setup_cors(app)
    _setup_security_headers(app)
    _setup_lan_enforcement(app)
