"""
Auto-Diagnosis Service for Error Handling (2024/2025 Best Practice)
Self-diagnosing, self-healing error detection and resolution
"""

import asyncio
import logging
import re
import traceback
from collections import defaultdict, deque
from collections.abc import Callable
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.utils.result_types import Result

logger = logging.getLogger(__name__)


class ErrorCategory(Enum):
    """Error categories for classification"""

    DATABASE = "database"
    NETWORK = "network"
    AUTHENTICATION = "authentication"
    VALIDATION = "validation"
    BUSINESS_LOGIC = "business_logic"
    EXTERNAL_API = "external_api"
    CONFIGURATION = "configuration"
    RESOURCE = "resource"
    UNKNOWN = "unknown"


class ErrorSeverity(Enum):
    """Error severity levels"""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class DiagnosisResult:
    """Self-diagnosis result"""

    def __init__(
        self,
        error: Exception,
        category: ErrorCategory,
        severity: ErrorSeverity,
        root_cause: str,
        suggestions: list[str],
        auto_fixable: bool = False,
        auto_fix: Optional[Callable] = None,
        confidence: float = 0.0,
    ):
        self.error = error
        self.category = category
        self.severity = severity
        self.root_cause = root_cause
        self.suggestions = suggestions
        self.auto_fixable = auto_fixable
        self.auto_fix = auto_fix
        self.confidence = confidence
        self.timestamp = datetime.utcnow()

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary"""
        return {
            "error_type": type(self.error).__name__,
            "error_message": str(self.error),
            "category": self.category.value,
            "severity": self.severity.value,
            "root_cause": self.root_cause,
            "suggestions": self.suggestions,
            "auto_fixable": self.auto_fixable,
            "confidence": self.confidence,
            "timestamp": self.timestamp.isoformat(),
        }


class AutoDiagnosisService:
    """
    Self-diagnosing error handling service
    Automatically detects, analyzes, and fixes common errors
    """

    def __init__(self, mongo_db: AsyncIOMotorDatabase = None):
        self.mongo_db = mongo_db
        self._error_patterns: dict[str, dict[str, Any]] = self._load_error_patterns()
        self._error_history: deque[dict[str, Any]] = deque(maxlen=1000)  # Last 1000 errors
        self._diagnosis_cache: dict[str, DiagnosisResult] = {}
        self._auto_fix_registry: dict[str, Callable] = self._register_auto_fixes()
        self._health_checks: list[Callable] = []

        # Error pattern recognition
        self._pattern_recognizers: dict[ErrorCategory, Callable] = {
            ErrorCategory.DATABASE: self._diagnose_database_error,
            ErrorCategory.NETWORK: self._diagnose_network_error,
            ErrorCategory.AUTHENTICATION: self._diagnose_auth_error,
            ErrorCategory.VALIDATION: self._diagnose_validation_error,
            ErrorCategory.RESOURCE: self._diagnose_resource_error,
            ErrorCategory.CONFIGURATION: self._diagnose_config_error,
        }

    def _load_error_patterns(self) -> dict[str, dict[str, Any]]:
        """Load error pattern database"""
        return {
            # Database errors
            "connection": {
                "patterns": [
                    r"could not connect",
                    r"connection refused",
                    r"connection timeout",
                    r"connection pool",
                    r"too many connections",
                ],
                "category": ErrorCategory.DATABASE,
                "severity": ErrorSeverity.HIGH,
                "suggestions": [
                    "Check database server status",
                    "Verify connection pool size",
                    "Check network connectivity",
                    "Review connection string configuration",
                ],
            },
            "query_timeout": {
                "patterns": [
                    r"query timeout",
                    r"operation timed out",
                    r"slow query",
                    r"execution timeout",
                ],
                "category": ErrorCategory.DATABASE,
                "severity": ErrorSeverity.MEDIUM,
                "suggestions": [
                    "Optimize query performance",
                    "Add database indexes",
                    "Check query complexity",
                    "Consider query result caching",
                ],
            },
            "authentication": {
                "patterns": [
                    r"authentication failed",
                    r"invalid credentials",
                    r"token expired",
                    r"unauthorized",
                    r"invalid token",
                ],
                "category": ErrorCategory.AUTHENTICATION,
                "severity": ErrorSeverity.HIGH,
                "suggestions": [
                    "Verify credentials",
                    "Check token expiration",
                    "Refresh authentication token",
                    "Review authentication configuration",
                ],
            },
            "validation": {
                "patterns": [
                    r"validation error",
                    r"invalid input",
                    r"missing required field",
                    r"type error",
                    r"value error",
                ],
                "category": ErrorCategory.VALIDATION,
                "severity": ErrorSeverity.LOW,
                "suggestions": [
                    "Validate input data",
                    "Check required fields",
                    "Verify data types",
                    "Review input validation rules",
                ],
            },
            "network": {
                "patterns": [
                    r"network error",
                    r"connection reset",
                    r"dns resolution",
                    r"host unreachable",
                    r"socket error",
                ],
                "category": ErrorCategory.NETWORK,
                "severity": ErrorSeverity.HIGH,
                "suggestions": [
                    "Check network connectivity",
                    "Verify host and port",
                    "Check firewall settings",
                    "Review DNS configuration",
                ],
            },
            "resource": {
                "patterns": [
                    r"memory error",
                    r"out of memory",
                    r"too many open files",
                    r"resource exhausted",
                    r"connection limit",
                ],
                "category": ErrorCategory.RESOURCE,
                "severity": ErrorSeverity.CRITICAL,
                "suggestions": [
                    "Increase resource limits",
                    "Check memory usage",
                    "Review connection pooling",
                    "Optimize resource usage",
                ],
            },
            "configuration": {
                "patterns": [
                    r"configuration error",
                    r"missing configuration",
                    r"invalid configuration",
                    r"environment variable",
                    r"config not found",
                ],
                "category": ErrorCategory.CONFIGURATION,
                "severity": ErrorSeverity.MEDIUM,
                "suggestions": [
                    "Check configuration files",
                    "Verify environment variables",
                    "Review configuration schema",
                    "Validate configuration values",
                ],
            },
        }

    async def diagnose_error(
        self, error: Exception, context: dict[str, Optional[Any]] = None
    ) -> DiagnosisResult:
        """
        Automatically diagnose error and provide solutions
        """
        context = context or {}

        # Check cache first
        error_key = f"{type(error).__name__}:{str(error)[:100]}"
        if error_key in self._diagnosis_cache:
            cached = self._diagnosis_cache[error_key]
            # Update timestamp
            cached.timestamp = datetime.utcnow()
            return cached

        # Classify error
        category, severity = self._classify_error(error)

        # Pattern recognition
        root_cause, suggestions = self._recognize_pattern(error, category)

        # Check if auto-fixable
        auto_fixable, auto_fix_func = self._check_auto_fixable(error, category)

        # Calculate confidence
        confidence = self._calculate_confidence(error, category, root_cause)

        # Create diagnosis result
        diagnosis = DiagnosisResult(
            error=error,
            category=category,
            severity=severity,
            root_cause=root_cause,
            suggestions=suggestions,
            auto_fixable=auto_fixable,
            auto_fix=auto_fix_func,
            confidence=confidence,
        )

        # Cache result
        self._diagnosis_cache[error_key] = diagnosis

        # Store in history
        self._error_history.append(
            {
                "timestamp": datetime.utcnow(),
                "error": error,
                "diagnosis": diagnosis.to_dict(),
                "context": context,
            }
        )

        # Log diagnosis
        logger.info(
            f"Auto-diagnosis: {category.value} error ({severity.value}) - {root_cause} "
            f"[confidence: {confidence:.1%}]"
        )

        return diagnosis

    def _classify_error(self, error: Exception) -> tuple[ErrorCategory, ErrorSeverity]:
        """Classify error into category and severity"""
        error_str = str(error).lower()
        error_type = type(error).__name__

        # Check patterns
        for _pattern_name, pattern_data in self._error_patterns.items():
            for pattern in pattern_data["patterns"]:
                if re.search(pattern, error_str, re.IGNORECASE):
                    return pattern_data["category"], pattern_data["severity"]

        # Default classification by type
        type_classifications = {
            "ConnectionError": (ErrorCategory.NETWORK, ErrorSeverity.HIGH),
            "TimeoutError": (ErrorCategory.NETWORK, ErrorSeverity.MEDIUM),
            "ValueError": (ErrorCategory.VALIDATION, ErrorSeverity.LOW),
            "TypeError": (ErrorCategory.VALIDATION, ErrorSeverity.LOW),
            "KeyError": (ErrorCategory.VALIDATION, ErrorSeverity.LOW),
            "AttributeError": (ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM),
            "PermissionError": (ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH),
            "MemoryError": (ErrorCategory.RESOURCE, ErrorSeverity.CRITICAL),
            "OSError": (ErrorCategory.RESOURCE, ErrorSeverity.MEDIUM),
        }

        return type_classifications.get(error_type, (ErrorCategory.UNKNOWN, ErrorSeverity.MEDIUM))

    def _recognize_pattern(
        self, error: Exception, category: ErrorCategory
    ) -> tuple[str, list[str]]:
        """Recognize error pattern and suggest solutions"""
        error_str = str(error).lower()
        traceback_str = traceback.format_exc().lower()

        # Use category-specific recognizer if available
        if category in self._pattern_recognizers:
            root_cause, suggestions = self._pattern_recognizers[category](
                error, error_str, traceback_str
            )
            if root_cause:
                return root_cause, suggestions

        # Generic pattern matching
        for pattern_name, pattern_data in self._error_patterns.items():
            if pattern_data["category"] == category:
                for pattern in pattern_data["patterns"]:
                    if re.search(pattern, error_str, re.IGNORECASE) or re.search(
                        pattern, traceback_str, re.IGNORECASE
                    ):
                        root_cause = f"{pattern_name.replace('_', ' ').title()} detected"
                        return root_cause, pattern_data["suggestions"]

        # Default
        return f"Unknown {category.value} error", ["Review error logs for details"]

    def _diagnose_database_error(
        self, error: Exception, error_str: str, traceback_str: str
    ) -> tuple[str, list[str]]:
        """Diagnose database-specific errors"""
        if "connection" in error_str:
            return (
                "Database connection failure",
                [
                    "Check database server is running",
                    "Verify connection string is correct",
                    "Check network connectivity",
                    "Review connection pool configuration",
                    "Check firewall settings",
                ],
            )
        elif "timeout" in error_str:
            return (
                "Database query timeout",
                [
                    "Optimize slow queries",
                    "Add database indexes",
                    "Increase query timeout",
                    "Review query complexity",
                    "Consider query caching",
                ],
            )
        elif "duplicate key" in error_str or "unique constraint" in error_str:
            return (
                "Duplicate key violation",
                [
                    "Check for existing record",
                    "Use upsert operation",
                    "Verify unique constraint",
                    "Handle duplicate gracefully",
                ],
            )

        return "", []

    def _diagnose_network_error(
        self, error: Exception, error_str: str, traceback_str: str
    ) -> tuple[str, list[str]]:
        """Diagnose network-specific errors"""
        if "connection refused" in error_str:
            return (
                "Connection refused - service not available",
                [
                    "Verify target service is running",
                    "Check service port",
                    "Review firewall rules",
                    "Verify host configuration",
                ],
            )
        elif "timeout" in error_str:
            return (
                "Network timeout",
                [
                    "Check network connectivity",
                    "Increase timeout value",
                    "Review network configuration",
                    "Check DNS resolution",
                ],
            )

        return "", []

    def _diagnose_auth_error(
        self, error: Exception, error_str: str, traceback_str: str
    ) -> tuple[str, list[str]]:
        """Diagnose authentication errors"""
        if "expired" in error_str or "token" in error_str:
            return (
                "Authentication token expired",
                [
                    "Refresh authentication token",
                    "Check token expiration time",
                    "Review token generation",
                    "Verify token validation logic",
                ],
            )
        elif "invalid" in error_str or "credentials" in error_str:
            return (
                "Invalid authentication credentials",
                [
                    "Verify user credentials",
                    "Check password hashing",
                    "Review authentication flow",
                    "Validate user permissions",
                ],
            )

        return "", []

    def _diagnose_validation_error(
        self, error: Exception, error_str: str, traceback_str: str
    ) -> tuple[str, list[str]]:
        """Diagnose validation errors"""
        return (
            "Input validation failed",
            [
                "Validate input data before processing",
                "Check required fields",
                "Verify data types",
                "Review validation rules",
                "Provide clear error messages",
            ],
        )

    def _diagnose_resource_error(
        self, error: Exception, error_str: str, traceback_str: str
    ) -> tuple[str, list[str]]:
        """Diagnose resource exhaustion errors"""
        if "memory" in error_str:
            return (
                "Memory exhaustion",
                [
                    "Check memory usage",
                    "Optimize memory-intensive operations",
                    "Increase memory limits",
                    "Review data structures",
                    "Consider pagination",
                ],
            )
        elif "connection" in error_str and "limit" in error_str:
            return (
                "Connection limit reached",
                [
                    "Review connection pooling",
                    "Close unused connections",
                    "Increase connection limits",
                    "Optimize connection usage",
                ],
            )

        return "", []

    def _diagnose_config_error(
        self, error: Exception, error_str: str, traceback_str: str
    ) -> tuple[str, list[str]]:
        """Diagnose configuration errors"""
        return (
            "Configuration error detected",
            [
                "Check configuration files",
                "Verify environment variables",
                "Review configuration schema",
                "Validate configuration values",
                "Check for missing required config",
            ],
        )

    def _check_auto_fixable(
        self, error: Exception, category: ErrorCategory
    ) -> tuple[bool, Optional[Callable]]:
        """Check if error can be auto-fixed"""
        error_str = str(error).lower()
        error_type = type(error).__name__

        # Check auto-fix registry
        fix_key = f"{error_type}:{category.value}"
        if fix_key in self._auto_fix_registry:
            return True, self._auto_fix_registry[fix_key]

        # Pattern-based auto-fix detection
        auto_fixable_patterns = {
            "token expired": self._auto_fix_token_refresh,
            "connection timeout": self._auto_fix_connection_retry,
            "missing index": self._auto_fix_missing_index,
        }

        for pattern, fix_func in auto_fixable_patterns.items():
            if pattern in error_str:
                return True, fix_func

        return False, None

    def _register_auto_fixes(self) -> dict[str, Callable]:
        """Register auto-fix functions"""
        return {
            "ExpiredSignatureError:authentication": self._auto_fix_token_refresh,
            "TokenExpiredError:authentication": self._auto_fix_token_refresh,
            "ConnectionError:database": self._auto_fix_connection_retry,
            "TimeoutError:network": self._auto_fix_connection_retry,
        }

    def _auto_fix_token_refresh(
        self, error: Exception, context: dict[str, Any]
    ) -> Result[Any, Exception]:
        """Auto-fix: Refresh expired token"""
        # Implementation would refresh token
        return Result.error(error, "Token refresh not implemented in context")

    def _auto_fix_connection_retry(
        self, error: Exception, context: dict[str, Any]
    ) -> Result[Any, Exception]:
        """Auto-fix: Retry connection with backoff"""
        # Implementation would retry connection
        return Result.error(error, "Connection retry not implemented in context")

    def _auto_fix_missing_index(
        self, error: Exception, context: dict[str, Any]
    ) -> Result[Any, Exception]:
        """Auto-fix: Create missing database index"""
        # Implementation would create index
        return Result.error(error, "Index creation not implemented in context")

    def _calculate_confidence(
        self, error: Exception, category: ErrorCategory, root_cause: str
    ) -> float:
        """Calculate diagnosis confidence"""
        confidence = 0.5  # Base confidence

        # Increase confidence based on pattern matches
        error_str = str(error).lower()
        for _pattern_name, pattern_data in self._error_patterns.items():
            if pattern_data["category"] == category:
                for pattern in pattern_data["patterns"]:
                    if re.search(pattern, error_str, re.IGNORECASE):
                        confidence += 0.2
                        break

        # Increase if specific root cause found
        if root_cause and root_cause != f"Unknown {category.value} error":
            confidence += 0.2

        # Increase if error type is known
        known_types = ["ConnectionError", "TimeoutError", "ValueError", "KeyError"]
        if type(error).__name__ in known_types:
            confidence += 0.1

        return min(confidence, 1.0)  # Cap at 1.0

    async def auto_fix_error(
        self, diagnosis: DiagnosisResult, context: dict[str, Optional[Any]] = None
    ) -> Result[Any, Exception]:
        """Attempt to auto-fix error"""
        if not diagnosis.auto_fixable or not diagnosis.auto_fix:
            return Result.error(
                ValueError("Error not auto-fixable"),
                "No auto-fix available for this error",
            )

        try:
            context = context or {}
            result = await asyncio.to_thread(diagnosis.auto_fix, diagnosis.error, context)
            if isinstance(result, Result):
                return result
            return Result.success(result)
        except Exception as e:
            logger.error(f"Auto-fix failed: {str(e)}")
            return Result.error(e, f"Auto-fix execution failed: {str(e)}")

    async def get_error_statistics(self, time_window: Optional[timedelta] = None) -> dict[str, Any]:
        """Get error statistics for analysis"""
        time_window = time_window or timedelta(hours=24)
        cutoff_time = datetime.utcnow() - time_window

        # Filter recent errors
        recent_errors = [e for e in self._error_history if e["timestamp"] >= cutoff_time]

        # Calculate statistics
        total_errors = len(recent_errors)
        if total_errors == 0:
            return {
                "total_errors": 0,
                "time_window": str(time_window),
                "categories": {},
                "severities": {},
                "auto_fixable_rate": 0.0,
                "common_errors": [],
            }

        # Category breakdown
        categories: dict[str, int] = defaultdict(int)
        severities: dict[str, int] = defaultdict(int)
        auto_fixable_count = 0

        for error_entry in recent_errors:
            diagnosis = error_entry["diagnosis"]
            categories[diagnosis["category"]] += 1
            severities[diagnosis["severity"]] += 1
            if diagnosis["auto_fixable"]:
                auto_fixable_count += 1

        # Common errors
        error_counts: dict[str, int] = defaultdict(int)
        for error_entry in recent_errors:
            error_type = type(error_entry["error"]).__name__
            error_counts[error_type] += 1

        common_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            "total_errors": total_errors,
            "time_window": str(time_window),
            "categories": dict(categories),
            "severities": dict(severities),
            "auto_fixable_rate": auto_fixable_count / total_errors,
            "auto_fixable_count": auto_fixable_count,
            "common_errors": [{"type": k, "count": v} for k, v in common_errors],
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def health_check(self) -> dict[str, Any]:
        """Comprehensive health check with auto-diagnosis"""
        health_report: dict[str, Any] = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {},
            "diagnoses": [],
            "recommendations": [],
        }

        # Run all registered health checks
        for check_func in self._health_checks:
            try:
                check_result = await check_func()
                health_report["checks"][check_func.__name__] = check_result
            except Exception as e:
                diagnosis = await self.diagnose_error(e)
                health_report["diagnoses"].append(diagnosis.to_dict())
                health_report["status"] = "degraded"

        # Generate recommendations
        error_stats = await self.get_error_statistics(timedelta(hours=1))
        if error_stats["total_errors"] > 10:
            health_report["recommendations"].append(
                f"High error rate detected: {error_stats['total_errors']} errors in last hour"
            )

        if error_stats.get("auto_fixable_rate", 0) > 0.5:
            health_report["recommendations"].append(
                f"High auto-fixable error rate: {error_stats['auto_fixable_rate']:.1%}. "
                "Consider enabling automatic fixes"
            )

        return health_report

    def register_health_check(self, check_func: Callable):
        """Register a health check function"""
        self._health_checks.append(check_func)


async def run_nightly_diagnosis():
    """Run nightly diagnosis and health check"""
    logger.info(f"Starting nightly diagnosis at {datetime.utcnow().isoformat()}")
    service = AutoDiagnosisService()

    # Add some basic health checks
    async def check_db():
        # Placeholder for actual DB check
        return "connected"

    service.register_health_check(check_db)

    report = await service.health_check()
    logger.info(f"Health Report: {report}")

    # Here you would typically send this report to an admin or log it
    if report["status"] != "healthy":
        logger.warning("System health is degraded!")
        for diagnosis in report["diagnoses"]:
            logger.warning(f" - {diagnosis['category']}: {diagnosis['root_cause']}")


if __name__ == "__main__":
    asyncio.run(run_nightly_diagnosis())
