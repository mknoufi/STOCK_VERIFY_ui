"""
SQL Server Connection Management API
"""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

# from backend.sql_server_connector import SQLServerConnector


def _default_user() -> Dict[str, Any]:
    return {"role": "admin", "username": "admin"}


try:
    from backend.auth.jwt import get_current_user
except ImportError:
    try:
        from auth.jwt import get_current_user
    except ImportError:
        get_current_user = _default_user  # type: ignore

logger = logging.getLogger(__name__)

sql_connection_router = APIRouter(prefix="/api/admin/sql", tags=["SQL Server"])


def require_admin(current_user: dict = Depends(get_current_user)):
    """Require admin role"""
    if isinstance(current_user, dict):
        user_role = current_user.get("role")
    else:
        user_role = getattr(current_user, "role", None)

    if user_role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return (
        current_user if isinstance(current_user, dict) else {"role": "admin", "username": "admin"}
    )


class SQLConnectionConfig(BaseModel):
    host: Optional[str] = Field(None, description="SQL Server host")
    port: int = Field(1433, ge=1, le=65535, description="SQL Server port")
    database: Optional[str] = Field(None, description="SQL Server database")
    username: Optional[str] = Field(None, description="SQL Server username")
    password: Optional[str] = Field(None, description="SQL Server password")
    use_ssl: bool = Field(False, description="Use SSL/TLS")
    connection_timeout: int = Field(30, ge=1, le=300, description="Connection timeout in seconds")
    pool_size: int = Field(5, ge=1, le=20, description="Connection pool size")


@sql_connection_router.get("/status")
async def get_sql_status(current_user: dict = Depends(require_admin)):
    """Get current SQL Server connection status and configuration"""
    return {
        "success": True,
        "data": {
            "configured": False,
            "connected": False,
            "config": {},
            "error": "SQL Server integration is disabled.",
            "last_check": datetime.now().isoformat(),
        },
    }


@sql_connection_router.post("/test")
async def test_sql_connection(
    config: SQLConnectionConfig, current_user: dict = Depends(require_admin)
):
    """Test SQL Server connection with provided configuration"""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="SQL Server integration is disabled.",
    )


@sql_connection_router.post("/configure")
async def configure_sql_connection(
    config: SQLConnectionConfig, current_user: dict = Depends(require_admin)
):
    """Save SQL Server connection configuration"""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="SQL Server integration is disabled.",
    )


@sql_connection_router.get("/history")
async def get_connection_history(current_user: dict = Depends(require_admin)):
    """Get SQL Server connection history"""
    return {
        "success": True,
        "data": {
            "history": [],
            "count": 0,
        },
    }
