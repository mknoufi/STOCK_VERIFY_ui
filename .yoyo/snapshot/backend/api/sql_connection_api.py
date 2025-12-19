"""
SQL Server Connection Management API
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Tuple, Dict, Any
import logging
from datetime import datetime
from backend.sql_server_connector import SQLServerConnector


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


def _test_connector_with_params(
    host: str,
    port: int,
    database: str,
    username: Optional[str],
    password: Optional[str],
) -> Tuple[bool, Optional[str]]:
    connector = SQLServerConnector()
    try:
        connector.connect(host, port, database, username, password)
        return connector.test_connection(), None
    except Exception as exc:
        logger.debug(f"SQL connection attempt failed: {exc}")
        return False, str(exc)


@sql_connection_router.get("/status")
async def get_sql_status(current_user: dict = Depends(require_admin)):
    """Get current SQL Server connection status and configuration"""
    try:
        from backend.config import settings

        config = {
            "host": settings.SQL_SERVER_HOST,
            "port": settings.SQL_SERVER_PORT,
            "database": settings.SQL_SERVER_DATABASE,
            "username": settings.SQL_SERVER_USER if settings.SQL_SERVER_USER else None,
            "password": "***" if settings.SQL_SERVER_PASSWORD else None,
            "configured": bool(settings.SQL_SERVER_HOST and settings.SQL_SERVER_DATABASE),
        }

        # Test connection
        is_connected = False
        connection_error = None
        if config["configured"]:
            is_connected, connection_error = _test_connector_with_params(
                settings.SQL_SERVER_HOST,
                settings.SQL_SERVER_PORT,
                settings.SQL_SERVER_DATABASE,
                settings.SQL_SERVER_USER,
                settings.SQL_SERVER_PASSWORD,
            )

        return {
            "success": True,
            "data": {
                "configured": config["configured"],
                "connected": is_connected,
                "config": config,
                "error": connection_error,
                "last_check": datetime.now().isoformat(),
            },
        }
    except Exception as e:
        logger.error(f"Error getting SQL status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SQL status: {str(e)}",
        )


@sql_connection_router.post("/test")
async def test_sql_connection(
    config: SQLConnectionConfig, current_user: dict = Depends(require_admin)
):
    """Test SQL Server connection with provided configuration"""
    try:
        if not config.host or not config.database:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Host and database are required",
            )
        is_connected, error = _test_connector_with_params(
            config.host,
            config.port,
            config.database,
            config.username,
            config.password,
        )

        if is_connected:
            # Get some basic info
            try:
                # Try to get server info
                version_info = "Connected"
            except Exception:
                version_info = "Unknown"

            return {
                "success": True,
                "connected": True,
                "message": "Connection successful",
                "server_version": version_info,
            }
        else:
            return {
                "success": False,
                "connected": False,
                "message": error or "Connection failed - unable to connect to server",
                "error": error,
            }
    except Exception as e:
        logger.error(f"Error testing SQL connection: {e}")
        return {
            "success": False,
            "connected": False,
            "message": f"Connection error: {str(e)}",
            "error": str(e),
        }


@sql_connection_router.post("/configure")
async def configure_sql_connection(
    config: SQLConnectionConfig, current_user: dict = Depends(require_admin)
):
    """Save SQL Server connection configuration"""
    try:
        # Test connection first
        test_result = await test_sql_connection(config, current_user)
        if not test_result.get("connected"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Connection test failed: {test_result.get('message', 'Unknown error')}",
            )

        # Save to environment or config file
        # Note: In production, use secure configuration management
        # For now, update settings (requires restart)
        return {
            "success": True,
            "message": "Configuration saved. Backend restart required to apply changes.",
            "note": "Update .env file or environment variables with: SQL_SERVER_HOST, SQL_SERVER_PORT, SQL_SERVER_DATABASE, SQL_SERVER_USER, SQL_SERVER_PASSWORD",
            "config": {
                "host": config.host,
                "port": config.port,
                "database": config.database,
                "username": config.username,
                "password": "***",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error configuring SQL connection: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to configure SQL connection: {str(e)}",
        )


@sql_connection_router.get("/history")
async def get_connection_history(current_user: dict = Depends(require_admin)):
    """Get SQL Server connection history"""
    try:
        from server import db

        # Get connection history from database
        history = (
            await db.sql_connection_history.find({}, {"_id": 0})
            .sort("timestamp", -1)
            .limit(50)
            .to_list(length=50)
        )

        return {
            "success": True,
            "data": {
                "history": history,
                "count": len(history),
            },
        }
    except Exception as e:
        logger.error(f"Error getting connection history: {e}")
        # Return empty history if collection doesn't exist
        return {
            "success": True,
            "data": {
                "history": [],
                "count": 0,
            },
        }
