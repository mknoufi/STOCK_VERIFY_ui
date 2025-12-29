"""
# cSpell:ignore redef behaviour lavanya emart dotenv
Application Configuration Management
Type-safe configuration with validation using Pydantic
"""

import logging
import os
from typing import Optional

try:
    from pydantic_settings import BaseSettings as PydanticBaseSettings  # type: ignore[no-redef]
    from pydantic_settings import SettingsConfigDict

    HAS_PYDANTIC_V2 = True
except ImportError:
    HAS_PYDANTIC_V2 = False
    try:
        from pydantic import BaseSettings as PydanticBaseSettingsFallback
    except (
        ImportError
    ) as exc:  # pragma: no cover - configuration import should succeed in production
        raise ImportError(
            "Please install pydantic or pydantic-settings before running the backend"
        ) from exc
    SettingsConfigDict = dict  # type: ignore[assignment,misc]
    PydanticBaseSettings = PydanticBaseSettingsFallback  # type: ignore[assignment,misc]

from pathlib import Path

from pydantic import Field, validator

ROOT_DIR = Path(__file__).parent

# Setup logger for configuration warnings
logger = logging.getLogger(__name__)


class Settings(PydanticBaseSettings):
    """Application settings with validation"""

    if HAS_PYDANTIC_V2:
        model_config = SettingsConfigDict(
            env_file=str(ROOT_DIR / ".env"),
            env_file_encoding="utf-8",
            case_sensitive=True,
            extra="ignore",
        )
    else:  # pragma: no cover - legacy pydantic v1 behavior

        class Config:
            env_file = str(ROOT_DIR / ".env")
            env_file_encoding = "utf-8"
            case_sensitive = True
            extra = "ignore"

    # Application
    APP_NAME: str = "Stock Count Application"
    APP_VERSION: str = "1.0.0"
    MIN_CLIENT_VERSION: str = Field(
        default="1.0.0",
        description="Minimum required client/app version for compatibility",
    )
    DEBUG: bool = False
    ENVIRONMENT: str = Field(
        default="development",
        description="Environment: development, staging, production",
    )

    @validator("MIN_CLIENT_VERSION")
    def validate_min_client_version(cls, v):
        """Validate MIN_CLIENT_VERSION is a valid semver-like string"""
        import re

        if v is None:
            raise ValueError("MIN_CLIENT_VERSION cannot be None")
        v_str = str(v).strip()
        if not v_str:
            raise ValueError("MIN_CLIENT_VERSION cannot be empty")
        # Allow formats like '1', '1.2', '1.2.3', optionally with suffix '-beta' or '+meta'
        if not re.match(r"^\d+(\.\d+){0,2}([-+][\w.]+)?$", v_str):
            raise ValueError("MIN_CLIENT_VERSION must be a semantic version like '1.2.3'")
        return v_str

    # MongoDB (with dynamic port detection)
    # Note: we support multiple common env var names for developer convenience:
    # - MONGO_URL (preferred)
    # - MONGODB_URI / MONGODB_URL (common in many deploy setups)
    MONGO_URL: str = Field(default="mongodb://localhost:27017")
    DB_NAME: str = "stock_verification"

    @validator("MONGO_URL", pre=True, always=True)
    def validate_and_detect_mongo_url(cls, v):
        """Resolve MongoDB URL from env aliases and auto-detect local port when needed."""

        # 1) Accept common environment aliases.
        # Prefer explicit MONGO_URL, then MONGODB_URI, then MONGODB_URL.
        env_mongo_url = os.getenv("MONGO_URL")
        env_mongodb_uri = os.getenv("MONGODB_URI")
        env_mongodb_url = os.getenv("MONGODB_URL")

        if env_mongo_url:
            v = env_mongo_url
        elif env_mongodb_uri:
            v = env_mongodb_uri
        elif env_mongodb_url:
            v = env_mongodb_url

        # 2) If still default, try auto-detection.
        if not v:
            v = "mongodb://localhost:27017"

        if v == "mongodb://localhost:27017":
            try:
                from backend.utils.port_detector import PortDetector

                v = PortDetector.get_mongo_url()
                logger.info(f"Auto-detected MongoDB URL: {v}")
            except Exception as e:
                logger.warning(f"MongoDB port detection failed, using default: {e}")

        # 3) Validate
        if not v:
            raise ValueError("MONGO_URL is required")
        return str(v).strip()

    @validator("DB_NAME")
    def validate_db_name(cls, v):
        if not v:
            raise ValueError("DB_NAME is required")
        return v

    # SQL Server (Optional - app works without it)
    SQL_SERVER_HOST: Optional[str] = Field(None, description="SQL Server host (optional)")
    SQL_SERVER_PORT: int = 1433
    SQL_SERVER_DATABASE: Optional[str] = Field(None, description="SQL Server database (optional)")
    SQL_SERVER_USER: Optional[str] = None
    SQL_SERVER_PASSWORD: Optional[str] = None

    @validator("SQL_SERVER_PORT")
    def validate_sql_port(cls, v):
        if v and not (1 <= v <= 65535):
            raise ValueError("SQL_SERVER_PORT must be between 1 and 65535")
        return v

    # Security
    # CRITICAL: These MUST be set via environment variables - no defaults allowed
    # Generate secure secrets using: python -c "import secrets; print(secrets.token_urlsafe(32))"
    JWT_SECRET: Optional[str] = Field(
        default=None, description="JWT secret key (recommended to use env var)"
    )
    JWT_REFRESH_SECRET: Optional[str] = Field(
        default=None,
        description="JWT refresh token secret - must be set via JWT_REFRESH_SECRET env var",
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(15, ge=1)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(30, ge=1)

    # Session Management
    SESSION_TIMEOUT_MINUTES: int = Field(480, ge=1)  # 8 hours
    AUTO_LOGOUT_ENABLED: bool = True

    @validator("JWT_SECRET", pre=True, always=True)
    def validate_jwt_secret(cls, v):
        # Check environment variable first
        env_value = os.getenv("JWT_SECRET")
        if env_value:
            v = env_value
        elif v is None:
            raise ValueError(
                "JWT_SECRET is required and must be set via JWT_SECRET environment variable"
            )

        if not v:
            raise ValueError("JWT_SECRET cannot be empty")
        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        # Check for known insecure defaults
        insecure_secrets = {
            "lavanya-emart-secret-key-2025-change-in-production",
            "REPLACE_WITH_A_SECURE_64_CHAR_SECRET",
            "your-secret-key-here",
            "change-me-in-production",
        }
        if v in insecure_secrets:
            raise ValueError(
                "SECURITY ERROR: JWT_SECRET contains a known insecure default value. "
                "Generate a secure secret using: python scripts/generate_secrets.py"
            )
        return v

    @validator("JWT_REFRESH_SECRET", pre=True, always=True)
    def validate_jwt_refresh_secret(cls, v):
        # Check environment variable first
        env_value = os.getenv("JWT_REFRESH_SECRET")
        if env_value:
            v = env_value
        elif v is None:
            raise ValueError(
                "JWT_REFRESH_SECRET is required and must be set via JWT_REFRESH_SECRET environment variable"
            )

        if not v:
            raise ValueError("JWT_REFRESH_SECRET cannot be empty")
        if len(v) < 32:
            raise ValueError("JWT_REFRESH_SECRET must be at least 32 characters long")
        # Check for known insecure defaults
        insecure_secrets = {
            "lavanya-emart-refresh-secret-key-2025-change-in-production",
            "REPLACE_WITH_A_SECURE_64_CHAR_REFRESH_SECRET",
            "your-refresh-secret-key-here",
            "change-me-in-production",
        }
        if v in insecure_secrets:
            raise ValueError(
                "SECURITY ERROR: JWT_REFRESH_SECRET contains a known insecure default value. "
                "Generate a secure secret using: python scripts/generate_secrets.py"
            )
        return v

    # Caching
    REDIS_URL: Optional[str] = None
    CACHE_TTL: int = Field(3600, ge=0)

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(100, ge=1)
    RATE_LIMIT_BURST: int = Field(20, ge=1)
    MAX_CONCURRENT: int = Field(50, ge=1)
    QUEUE_SIZE: int = Field(100, ge=1, description="Queue size for concurrent request handler")
    RATE_LIMIT_MAX_ATTEMPTS: int = Field(5, ge=1)
    RATE_LIMIT_TTL_SECONDS: int = Field(300, ge=1)

    # Sync Services
    ERP_SYNC_ENABLED: bool = True
    ERP_SYNC_INTERVAL: int = Field(3600, ge=60)  # 1 hour
    CHANGE_DETECTION_SYNC_ENABLED: bool = True
    CHANGE_DETECTION_INTERVAL: int = Field(300, ge=60)  # 5 minutes

    @validator("ERP_SYNC_INTERVAL", "CHANGE_DETECTION_INTERVAL")
    def validate_sync_interval(cls, v):
        if v < 60:
            raise ValueError("Sync interval must be at least 60 seconds")
        return v

    # Connection Pool
    USE_CONNECTION_POOL: bool = True
    POOL_SIZE: int = Field(10, ge=1)
    MAX_OVERFLOW: int = Field(5, ge=0)

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json or text
    LOG_FILE: Optional[str] = None

    # Security
    FORCE_HTTPS: bool = False  # Enable HSTS
    BLOCK_SANITIZATION_VIOLATIONS: bool = True

    @validator("LOG_LEVEL")
    def validate_log_level(cls, v):
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"LOG_LEVEL must be one of: {', '.join(valid_levels)}")
        return v.upper()

    # Server
    CORS_ALLOW_ORIGINS: Optional[str] = None
    CORS_DEV_ORIGINS: Optional[str] = Field(
        None,
        description="Additional CORS origins for development (comma-separated). Defaults include localhost variants.",
    )
    HOST: str = "0.0.0.0"
    PORT: int = Field(8001, ge=1, le=65535)
    WORKERS: int = Field(1, ge=1)

    @validator("PORT")
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError("PORT must be between 1 and 65535")
        return v

    # Monitoring
    METRICS_ENABLED: bool = True
    METRICS_HISTORY_SIZE: int = Field(1000, ge=0)

    # Enhanced Connection Pool Settings
    CONNECTION_RETRY_ATTEMPTS: int = Field(
        3, ge=1, le=10, description="Number of retry attempts for connection creation"
    )
    CONNECTION_RETRY_DELAY: float = Field(
        1.0,
        ge=0.1,
        le=10.0,
        description="Initial retry delay in seconds (exponential backoff)",
    )
    CONNECTION_HEALTH_CHECK_INTERVAL: int = Field(
        60, ge=10, le=3600, description="Health check interval in seconds"
    )


# Global settings instance
# Initialize settings with fallback
try:
    settings = Settings()  # type: ignore[call-arg]
except Exception as e:
    import warnings

    warnings.warn(
        f"Configuration Error: {e}. Using environment variables with defaults.",
        stacklevel=2,
    )
    # Create a simple settings object from environment variables
    from dotenv import load_dotenv

    load_dotenv()

    class FallbackSettings:
        def __init__(self):
            # Keep behavior consistent with Settings: support env aliases + auto-detect
            mongo_url = (
                os.getenv("MONGO_URL")
                or os.getenv("MONGODB_URI")
                or os.getenv("MONGODB_URL")
                or "mongodb://localhost:27017"
            )
            if mongo_url == "mongodb://localhost:27017":
                try:
                    from backend.utils.port_detector import PortDetector

                    mongo_url = PortDetector.get_mongo_url()
                except Exception:
                    pass
            self.MONGO_URL = mongo_url
            self.DB_NAME = os.getenv("DB_NAME", "stock_count")
            self.SQL_SERVER_HOST = os.getenv("SQL_SERVER_HOST")
            self.SQL_SERVER_PORT = int(os.getenv("SQL_SERVER_PORT", 1433))
            self.SQL_SERVER_DATABASE = os.getenv("SQL_SERVER_DATABASE", "")
            self.SQL_SERVER_USER = os.getenv("SQL_SERVER_USER", "readonly_user")
            self.SQL_SERVER_PASSWORD = os.getenv("SQL_SERVER_PASSWORD")
            jwt_secret = os.getenv("JWT_SECRET")
            if not jwt_secret:
                raise ValueError("JWT_SECRET environment variable is required")
            self.JWT_SECRET = jwt_secret

            jwt_refresh_secret = os.getenv("JWT_REFRESH_SECRET")
            if not jwt_refresh_secret:
                raise ValueError("JWT_REFRESH_SECRET environment variable is required")
            self.JWT_REFRESH_SECRET = jwt_refresh_secret
            self.JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
            self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
            self.LOG_FORMAT = os.getenv(
                "LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            self.LOG_FILE = os.getenv("LOG_FILE", "app.log")
            self.USE_CONNECTION_POOL = os.getenv("USE_CONNECTION_POOL", "true").lower() == "true"
            self.POOL_SIZE = int(os.getenv("POOL_SIZE", 10))
            self.MAX_OVERFLOW = int(os.getenv("MAX_OVERFLOW", 5))
            self.REDIS_URL = os.getenv("REDIS_URL")
            self.CACHE_TTL = int(os.getenv("CACHE_TTL", 3600))
            self.RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", 100))
            self.RATE_LIMIT_BURST = int(os.getenv("RATE_LIMIT_BURST", 20))
            self.MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", 50))
            self.METRICS_HISTORY_SIZE = int(os.getenv("METRICS_HISTORY_SIZE", 1000))
            self.ERP_SYNC_ENABLED = os.getenv("ERP_SYNC_ENABLED", "true").lower() == "true"
            self.ERP_SYNC_INTERVAL = int(os.getenv("ERP_SYNC_INTERVAL", 3600))
            self.CHANGE_DETECTION_SYNC_ENABLED = (
                os.getenv("CHANGE_DETECTION_SYNC_ENABLED", "true").lower() == "true"
            )
            self.CHANGE_DETECTION_INTERVAL = int(os.getenv("CHANGE_DETECTION_INTERVAL", 300))
            # New settings for rate limiting and CORS
            self.RATE_LIMIT_MAX_ATTEMPTS = int(os.getenv("RATE_LIMIT_MAX_ATTEMPTS", 5))
            self.RATE_LIMIT_TTL_SECONDS = int(os.getenv("RATE_LIMIT_TTL_SECONDS", 300))
            self.CORS_ALLOW_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS")
            self.APP_NAME = os.getenv("APP_NAME", "Stock Count API")
            self.APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
            # Normalize MIN_CLIENT_VERSION: use default when env var is missing or empty, and strip whitespace
            self.MIN_CLIENT_VERSION = (os.getenv("MIN_CLIENT_VERSION") or "1.0.0").strip()

    settings = FallbackSettings()  # type: ignore[assignment]


# SECURITY CHECKS (fail-fast in non-debug environments)
def _validate_secret(secret_name, secret_value, placeholders, env_name):
    if not secret_value or secret_value in placeholders:
        raise RuntimeError(
            f"SECURITY ERROR: Insecure {secret_name} in {env_name}! "
            f"Set ENVIRONMENT={env_name} and provide secure {secret_name} via environment variable. "
            "Run `python backend/utils/secret_generator.py --write` to generate secure secrets."
        )


def perform_security_checks(settings_obj):
    try:
        debug_mode = getattr(settings_obj, "DEBUG", False)
        jwt_secret = getattr(settings_obj, "JWT_SECRET", None)
        jwt_refresh = getattr(settings_obj, "JWT_REFRESH_SECRET", None)

        placeholders = {
            "REPLACE_WITH_A_SECURE_64_CHAR_SECRET",
            "REPLACE_WITH_A_SECURE_64_CHAR_REFRESH_SECRET",
            "your-secret-key-here",
            "your-refresh-secret-key-here",
            "change-me-in-production",
        }

        environment = getattr(
            settings_obj, "ENVIRONMENT", os.getenv("ENVIRONMENT", "development")
        ).lower()
        is_production = environment == "production"
        is_staging = environment == "staging"

        if (is_production or is_staging) and not debug_mode:
            _validate_secret("JWT_SECRET", jwt_secret, placeholders, environment)
            _validate_secret("JWT_REFRESH_SECRET", jwt_refresh, placeholders, environment)
            logger.info(f"✅ {environment.capitalize()} mode: Security checks passed")
        else:
            # Development mode - just warn
            if jwt_secret in placeholders:
                logger.warning("⚠️  DEVELOPMENT: Using default JWT_SECRET. Change for production!")
            if jwt_refresh in placeholders:
                logger.warning(
                    "⚠️  DEVELOPMENT: Using default JWT_REFRESH_SECRET. Change for production!"
                )

    except Exception as e:
        if str(getattr(settings_obj, "DEBUG", False)).lower() not in ("1", "true"):
            logger.warning(f"Security check warning: {e}")


perform_security_checks(settings)
