"""
Error Messages - Centralized error message definitions
Provides consistent, user-friendly error messages throughout the application
"""

from typing import Optional


# Error Categories
class ErrorCategory:
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    DATABASE = "database"
    NETWORK = "network"
    ERP = "erp"
    CONFIGURATION = "configuration"
    RESOURCE = "resource"
    SERVER = "server"
    UNKNOWN = "unknown"


# Error Messages Dictionary
ERROR_MESSAGES = {
    # Authentication Errors
    "AUTH_INVALID_CREDENTIALS": {
        "message": "Invalid username or password. Please check your credentials and try again.",
        "detail": "The username or password you entered is incorrect.",
        "code": "AUTH_001",
        "category": ErrorCategory.AUTHENTICATION,
        "status_code": 401,
    },
    "AUTH_USER_NOT_FOUND": {
        "message": "User account not found. Please register or contact administrator.",
        "detail": "No user exists with the provided username.",
        "code": "AUTH_002",
        "category": ErrorCategory.AUTHENTICATION,
        "status_code": 401,
    },
    "AUTH_TOKEN_EXPIRED": {
        "message": "Your session has expired. Please login again.",
        "detail": "The authentication token has expired. Please login to get a new token.",
        "code": "AUTH_003",
        "category": ErrorCategory.AUTHENTICATION,
        "status_code": 401,
    },
    "AUTH_TOKEN_INVALID": {
        "message": "Invalid session. Please login again.",
        "detail": "The authentication token is invalid or malformed.",
        "code": "AUTH_004",
        "category": ErrorCategory.AUTHENTICATION,
        "status_code": 401,
    },
    "AUTH_USERNAME_EXISTS": {
        "message": "Username already exists. Please choose a different username.",
        "detail": "A user with this username already exists in the system.",
        "code": "AUTH_005",
        "category": ErrorCategory.AUTHENTICATION,
        "status_code": 400,
    },
    # Authorization Errors
    "AUTHZ_INSUFFICIENT_PERMISSIONS": {
        "message": "You don't have permission to perform this action.",
        "detail": "Your account role does not have the required permissions.",
        "code": "AUTHZ_001",
        "category": ErrorCategory.AUTHORIZATION,
        "status_code": 403,
    },
    "AUTHZ_SUPERVISOR_ONLY": {
        "message": "This action requires supervisor privileges.",
        "detail": "Only supervisors can perform this action.",
        "code": "AUTHZ_002",
        "category": ErrorCategory.AUTHORIZATION,
        "status_code": 403,
    },
    # Validation Errors
    "VAL_INVALID_BARCODE": {
        "message": "Invalid barcode format. Barcodes are 6-digit numbers (e.g., 123456) or alphanumeric codes.",
        "detail": "Barcode must be a 6-digit number (will be auto-padded) or alphanumeric code.",
        "code": "VAL_001",
        "category": ErrorCategory.VALIDATION,
        "status_code": 400,
    },
    "VAL_INVALID_INPUT": {
        "message": "Invalid input. Please check your data and try again.",
        "detail": "One or more fields contain invalid data.",
        "code": "VAL_002",
        "category": ErrorCategory.VALIDATION,
        "status_code": 400,
    },
    "VAL_MISSING_FIELDS": {
        "message": "Required fields are missing. Please fill in all required fields.",
        "detail": "One or more required fields are missing or empty.",
        "code": "VAL_003",
        "category": ErrorCategory.VALIDATION,
        "status_code": 400,
    },
    # Database Errors
    "DB_CONNECTION_FAILED": {
        "message": "Database connection failed. Please try again later.",
        "detail": "Unable to connect to the database. The database may be temporarily unavailable.",
        "code": "DB_001",
        "category": ErrorCategory.DATABASE,
        "status_code": 503,
    },
    "DB_QUERY_FAILED": {
        "message": "Database query failed. Please try again.",
        "detail": "An error occurred while querying the database.",
        "code": "DB_002",
        "category": ErrorCategory.DATABASE,
        "status_code": 500,
    },
    "DB_ITEM_NOT_FOUND": {
        "message": "Item not found in database.",
        "detail": "The requested item does not exist in the database.",
        "code": "DB_003",
        "category": ErrorCategory.DATABASE,
        "status_code": 404,
    },
    # Network Errors
    "NET_CONNECTION_TIMEOUT": {
        "message": "Connection timeout. Please check your internet connection and try again.",
        "detail": "The request took too long to complete. Your connection may be slow or unstable.",
        "code": "NET_001",
        "category": ErrorCategory.NETWORK,
        "status_code": 0,
    },
    "NET_CONNECTION_REFUSED": {
        "message": "Cannot connect to server. Please check if the server is running.",
        "detail": "The server is not responding. It may be down or unreachable.",
        "code": "NET_002",
        "category": ErrorCategory.NETWORK,
        "status_code": 0,
    },
    "NET_SERVER_ERROR": {
        "message": "Server error. Please try again later.",
        "detail": "The server encountered an error while processing your request.",
        "code": "NET_003",
        "category": ErrorCategory.NETWORK,
        "status_code": 500,
    },
    # ERP/SQL Server Errors
    "ERP_CONNECTION_FAILED": {
        "message": "Cannot connect to ERP system. Please check ERP configuration or try again later.",
        "detail": "Unable to connect to SQL Server. The ERP system may be unavailable.",
        "code": "ERP_001",
        "category": ErrorCategory.ERP,
        "status_code": 503,
    },
    "ERP_ITEM_NOT_FOUND": {
        "message": "Item not found in ERP system. Please verify the barcode or item code.",
        "detail": "The requested item does not exist in the ERP database.",
        "code": "ERP_002",
        "category": ErrorCategory.ERP,
        "status_code": 404,
    },
    "ERP_QUERY_FAILED": {
        "message": "Error querying ERP system. Please try again.",
        "detail": "An error occurred while querying the ERP database.",
        "code": "ERP_003",
        "category": ErrorCategory.ERP,
        "status_code": 500,
    },
    "ERP_NOT_CONFIGURED": {
        "message": "ERP system is not configured. Using cached data.",
        "detail": "SQL Server connection is not configured. The system is using MongoDB cache.",
        "code": "ERP_004",
        "category": ErrorCategory.ERP,
        "status_code": 200,
    },
    # Configuration Errors
    "CONFIG_MISSING": {
        "message": "Configuration is missing. Please contact administrator.",
        "detail": "Required configuration is not set up.",
        "code": "CONFIG_001",
        "category": ErrorCategory.CONFIGURATION,
        "status_code": 500,
    },
    "CONFIG_INVALID": {
        "message": "Invalid configuration. Please contact administrator.",
        "detail": "The application configuration is invalid or corrupted.",
        "code": "CONFIG_002",
        "category": ErrorCategory.CONFIGURATION,
        "status_code": 500,
    },
    # Resource Errors
    "RES_NOT_FOUND": {
        "message": "Resource not found. Please check the URL or contact support.",
        "detail": "The requested resource does not exist.",
        "code": "RES_001",
        "category": ErrorCategory.RESOURCE,
        "status_code": 404,
    },
    "RES_SESSION_NOT_FOUND": {
        "message": "Session not found. The session may have been deleted or expired.",
        "detail": "The requested session does not exist in the database.",
        "code": "RES_002",
        "category": ErrorCategory.RESOURCE,
        "status_code": 404,
    },
    # Server Errors
    "SRV_INTERNAL_ERROR": {
        "message": "An internal server error occurred. Please try again later or contact support.",
        "detail": "An unexpected error occurred on the server.",
        "code": "SRV_001",
        "category": ErrorCategory.SERVER,
        "status_code": 500,
    },
    "SRV_RATE_LIMIT": {
        "message": "Too many requests. Please wait a moment and try again.",
        "detail": "You have exceeded the rate limit. Please wait before making more requests.",
        "code": "SRV_002",
        "category": ErrorCategory.SERVER,
        "status_code": 429,
    },
    # Unknown Errors
    "UNKNOWN_ERROR": {
        "message": "An unexpected error occurred. Please try again or contact support.",
        "detail": "An unknown error occurred. Please check the logs for more details.",
        "code": "UNK_001",
        "category": ErrorCategory.UNKNOWN,
        "status_code": 500,
    },
}


def get_error_message(error_key: str, context: Optional[dict] = None) -> dict:
    """
    Get formatted error message
    Args:
        error_key: Error key from ERROR_MESSAGES
        context: Additional context to include in error message
    Returns:
        Dictionary with error message, detail, code, category, and status_code
    """
    error = ERROR_MESSAGES.get(error_key, ERROR_MESSAGES["UNKNOWN_ERROR"])

    result = {
        "message": error["message"],
        "detail": error["detail"],
        "code": error["code"],
        "category": error["category"],
        "status_code": error["status_code"],
    }

    # Add context if provided
    if context:
        result["context"] = context
        # Enhance message with context if available
        if "item_code" in context:
            result["detail"] = str(result["detail"]) + f" Item code: {context['item_code']}"
        if "barcode" in context:
            result["detail"] = str(result["detail"]) + f" Barcode: {context['barcode']}"
        if "session_id" in context:
            result["detail"] = str(result["detail"]) + f" Session ID: {context['session_id']}"

    return result


def get_error_by_code(status_code: int, error_key: Optional[str] = None) -> dict:
    """
    Get error message by HTTP status code
    Args:
        status_code: HTTP status code
        error_key: Optional specific error key
    Returns:
        Error message dictionary
    """
    if error_key and error_key in ERROR_MESSAGES:
        return ERROR_MESSAGES[error_key]

    # Map status codes to error keys
    code_map = {
        400: "VAL_INVALID_INPUT",
        401: "AUTH_INVALID_CREDENTIALS",
        403: "AUTHZ_INSUFFICIENT_PERMISSIONS",
        404: "RES_NOT_FOUND",
        429: "SRV_RATE_LIMIT",
        500: "SRV_INTERNAL_ERROR",
        503: "DB_CONNECTION_FAILED",
    }

    error_key = code_map.get(status_code, "UNKNOWN_ERROR")
    return ERROR_MESSAGES.get(error_key, ERROR_MESSAGES["UNKNOWN_ERROR"])
