import base64
import hashlib
import logging
import re
from datetime import datetime
from typing import Any, Optional

import pyodbc
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth.dependencies import get_current_user
from backend.config import settings
from backend.db.runtime import get_db

router = APIRouter(prefix="/api/mapping", tags=["Database Mapping"])
logger = logging.getLogger(__name__)

# --- Models ---


class ConnectionParams(BaseModel):
    host: str
    port: int = 1433
    database: str
    user: Optional[str] = None
    password: Optional[str] = None
    schema_name: str = "dbo"


class ColumnMapping(BaseModel):
    app_field: str
    erp_column: str
    table_name: str
    is_required: bool


class MappingConfig(BaseModel):
    tables: dict[str, str]  # e.g. {"items": "ItemMaster"}
    columns: dict[str, ColumnMapping]
    query_options: dict[str, Any] = Field(default_factory=dict)


# --- Helper ---


def _require_mapping_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in {"admin", "supervisor"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user


def _enforce_configured_sql_target(host: str, database: str, port: int) -> None:
    """Reduce SSRF risk by enforcing configured SQL target when present."""
    env = getattr(settings, "ENVIRONMENT", "development").lower()
    if env not in {"production", "staging"}:
        return

    configured_host = getattr(settings, "SQL_SERVER_HOST", None)
    configured_database = getattr(settings, "SQL_SERVER_DATABASE", None)
    configured_port = getattr(settings, "SQL_SERVER_PORT", None)

    # If the app is configured with a target, do not allow overriding via API params.
    if configured_host and host != configured_host:
        raise HTTPException(status_code=400, detail="SQL Server host is not allowed")
    if configured_database and database != configured_database:
        raise HTTPException(status_code=400, detail="SQL Server database is not allowed")
    if (configured_host or configured_database) and configured_port and port != configured_port:
        raise HTTPException(status_code=400, detail="SQL Server port is not allowed")


def get_connection_string(host, port, database, user, password):
    driver = "{ODBC Driver 17 for SQL Server}"
    # Fallback to FreeTDS or other drivers if likely on Mac/Linux without official drivers
    # BUT for now assume standard ODBC string
    conn_str = f"DRIVER={driver};SERVER={host},{port};DATABASE={database};"
    if user and password:
        conn_str += f"UID={user};PWD={password}"
    else:
        conn_str += "Trusted_Connection=yes"
    return conn_str


def get_connection(conn_string):
    try:
        return pyodbc.connect(conn_string, timeout=5)
    except Exception as exc:
        logger.exception("Database connection failed")
        env = getattr(settings, "ENVIRONMENT", "development").lower()
        if env == "development":
            try:
                drivers = list(pyodbc.drivers())
            except Exception:
                drivers = []
            raise HTTPException(
                status_code=400,
                detail=f"Connection failed. Available drivers: {drivers}",
            ) from exc
        raise HTTPException(status_code=400, detail="Connection failed") from exc


# --- Endpoints ---


def _safe_identifier(name: str) -> str:
    """Validate and return a safe SQL identifier.

    Allows letters, numbers, underscores, and spaces (common in SQL Server).
    Rejects brackets to prevent injection when wrapped in [].
    Raises HTTPException(400) if invalid.
    """
    # Allow alphanumeric, underscore, and space. Must not be empty.
    # Must not contain brackets [] which are used for quoting.
    if not name or "]" in name or "[" in name:
        raise HTTPException(status_code=400, detail=f"Invalid identifier: {name}")

    # Check for other potentially dangerous characters if needed, but [] is the main concern for injection in [{name}]
    # Let's stick to a regex that allows spaces but is still restrictive enough
    if not re.fullmatch(r"[A-Za-z0-9_ ]+", name):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid identifier (only alphanumeric, space, underscore allowed): {name}",
        )

    return name


def _encrypt_erp_password(password: str) -> str:
    """Encrypt an ERP connection password for at-rest storage.

    Derives an encryption key from JWT_SECRET to avoid storing plaintext credentials in MongoDB.
    """
    try:
        from cryptography.fernet import Fernet
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Password encryption is unavailable (missing cryptography): {exc}",
        ) from exc

    secret = str(settings.JWT_SECRET or "")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET is required for encryption")

    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
    fernet = Fernet(key)
    return fernet.encrypt(password.encode("utf-8")).decode("utf-8")


@router.get("/tables")
async def get_tables(
    host: str,
    database: str,
    port: int = 1433,
    user: Optional[str] = None,
    password: Optional[str] = None,
    schema: str = "dbo",
    current_user: dict = Depends(_require_mapping_admin),
):
    _enforce_configured_sql_target(host, database, port)
    conn_str = get_connection_string(host, port, database, user, password)
    try:
        conn = get_connection(conn_str)
        cursor = conn.cursor()

        query = """
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
        """
        cursor.execute(query, (schema,))
        tables = [row[0] for row in cursor.fetchall()]

        conn.close()
        return {"tables": tables, "count": len(tables)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error fetching tables")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/columns")
async def get_columns(
    host: str,
    database: str,
    table_name: str,
    port: int = 1433,
    user: Optional[str] = None,
    password: Optional[str] = None,
    schema: str = "dbo",
    current_user: dict = Depends(_require_mapping_admin),
):
    _enforce_configured_sql_target(host, database, port)
    conn_str = get_connection_string(host, port, database, user, password)
    try:
        conn = get_connection(conn_str)
        cursor = conn.cursor()

        query = """
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
        ORDER BY ORDINAL_POSITION
        """
        cursor.execute(query, (table_name, schema))

        columns = []
        for row in cursor.fetchall():
            columns.append(
                {
                    "name": row[0],
                    "data_type": row[1],
                    "nullable": row[2] == "YES",
                    "max_length": row[3],
                }
            )

        conn.close()
        return {"columns": columns, "count": len(columns)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error fetching columns")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview")
async def preview_mapping(
    host: str,
    database: str,
    config: MappingConfig,
    port: int = 1433,
    user: Optional[str] = None,
    password: Optional[str] = None,
    current_user: dict = Depends(_require_mapping_admin),
):
    _enforce_configured_sql_target(host, database, port)
    conn_str = get_connection_string(host, port, database, user, password)
    try:
        conn = get_connection(conn_str)
        cursor = conn.cursor()

        # Construct dynamic query (validate identifiers to avoid injection)
        table_name = config.tables.get("items")
        if not table_name:
            raise HTTPException(status_code=400, detail="No 'items' table mapped")

        schema = config.query_options.get("schema_name", "dbo")
        schema = _safe_identifier(schema)
        table_name = _safe_identifier(table_name)

        select_fields = []
        for app_field, mapping in config.columns.items():
            erp_col = _safe_identifier(mapping.erp_column)
            app_alias = _safe_identifier(app_field)
            select_fields.append(f"[{erp_col}] AS [{app_alias}]")

        # Basic check to ensure at least one column
        if not select_fields:
            raise HTTPException(status_code=400, detail="No columns mapped")

        # Use TOP 5 to limit data
        query = f"SELECT TOP 5 {', '.join(select_fields)} FROM [{schema}].[{table_name}]"

        # Log a sanitized summary (omit full query text to reduce risk)
        logger.info(
            "Testing mapping query for table '%s' in schema '%s' with %d columns",
            table_name,
            schema,
            len(select_fields),
        )

        cursor.execute(query)
        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))

        conn.close()
        return {"success": True, "sample_data": results}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error testing mapping")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_mapping(
    data: dict[str, Any],
    current_user: dict = Depends(_require_mapping_admin),
    db=Depends(get_db),
):
    """
    Saves both connection parameters and mapping configuration.
    Expects data = { "connection": {...}, "mapping": {...} }
    """
    try:
        connection = data.get("connection", {})
        mapping = data.get("mapping", {})

        # Basic validation
        if not mapping:
            raise HTTPException(status_code=400, detail="Missing mapping configuration")

        set_data: dict[str, Any] = {
            "mapping": mapping,
            "updated_at": datetime.now(),
            "updated_by": current_user.get("username"),
        }

        # Only update connection if provided
        if connection:
            # Update nested fields (preserves existing secrets unless explicitly replaced)
            for key, value in connection.items():
                if key == "password":
                    continue
                set_data[f"connection.{key}"] = value

            if connection.get("password"):
                set_data["connection.password_encrypted"] = _encrypt_erp_password(
                    str(connection["password"])
                )
                set_data["connection.has_password"] = True

        # Save to 'erp_mapping' document in config collection
        update_op: dict[str, Any] = {"$set": set_data}
        if connection.get("password"):
            update_op["$unset"] = {"connection.password": ""}

        await db.config.update_one(
            {"_id": "erp_mapping"},
            update_op,
            upsert=True,
        )
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error saving mapping")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/current")
async def get_current_mapping(
    current_user: dict = Depends(_require_mapping_admin),
    db=Depends(get_db),
):
    try:
        doc = await db.config.find_one({"_id": "erp_mapping"})
        if not doc:
            return {"mapping": None, "connection": None}

        connection = doc.get("connection")
        if connection:
            connection = dict(connection)
            has_password = bool(connection.get("password_encrypted") or connection.get("password"))
            connection.pop("password", None)
            connection.pop("password_encrypted", None)
            connection["has_password"] = has_password

        result = {
            "mapping": doc.get("mapping"),
            "connection": connection,
        }
        return result
    except Exception as e:
        logger.exception("Error fetching current mapping")
        raise HTTPException(status_code=500, detail=str(e))
