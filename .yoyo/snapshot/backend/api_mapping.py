"""
API endpoints for database mapping configuration
Allows users to discover and configure table/column mappings
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging
import pyodbc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mapping", tags=["mapping"])


class ColumnMapping(BaseModel):
    """Column mapping model"""

    app_field: str
    erp_column: str
    table_name: str
    is_required: bool = False


class TableMapping(BaseModel):
    """Table mapping model"""

    app_table: str
    erp_table: str
    db_schema: str = "dbo"  # Renamed from 'schema' to avoid shadowing BaseModel attribute


class MappingConfig(BaseModel):
    """Complete mapping configuration"""

    tables: Dict[str, str]
    columns: Dict[str, ColumnMapping]
    query_options: Optional[Dict[str, Any]] = None


async def get_sql_connection(
    host: str,
    port: int,
    database: str,
    user: Optional[str] = None,
    password: Optional[str] = None,
):
    """Get SQL Server connection"""
    try:
        server = f"{host},{port}" if port else host

        if user and password:
            conn_str = (
                f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                f"SERVER={server};"
                f"DATABASE={database};"
                f"UID={user};"
                f"PWD={password};"
                f"TrustServerCertificate=yes;"
            )
        else:
            conn_str = (
                f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                f"SERVER={server};"
                f"DATABASE={database};"
                f"Trusted_Connection=yes;"
                f"TrustServerCertificate=yes;"
            )

        conn = pyodbc.connect(conn_str, timeout=10)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to SQL Server: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to connect: {str(e)}")


@router.get("/tables")
async def get_available_tables(
    host: str,
    port: int,
    database: str,
    user: Optional[str] = None,
    password: Optional[str] = None,
    schema: str = "dbo",
):
    """
    Get list of available tables from SQL Server
    """
    conn = None
    try:
        conn = await get_sql_connection(host, port, database, user, password)
        cursor = conn.cursor()

        # Get tables from specified schema
        query = """
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """
        cursor.execute(query, (schema,))
        rows = cursor.fetchall()

        tables = [row[0] for row in rows]
        cursor.close()

        return {"tables": tables, "schema": schema, "count": len(tables)}
    except Exception as e:
        logger.error(f"Error fetching tables: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch tables: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.get("/columns")
async def get_table_columns(
    host: str,
    port: int,
    database: str,
    table_name: str,
    user: Optional[str] = None,
    password: Optional[str] = None,
    schema: str = "dbo",
):
    """
    Get columns for a specific table
    """
    conn = None
    try:
        conn = await get_sql_connection(host, port, database, user, password)
        cursor = conn.cursor()

        # Get column information
        query = """
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                CHARACTER_MAXIMUM_LENGTH,
                NUMERIC_PRECISION,
                NUMERIC_SCALE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        """
        cursor.execute(query, (schema, table_name))
        rows = cursor.fetchall()

        columns = []
        for row in rows:
            columns.append(
                {
                    "name": row[0],
                    "data_type": row[1],
                    "nullable": row[2] == "YES",
                    "max_length": row[3],
                    "precision": row[4],
                    "scale": row[5],
                    "default_value": row[6],
                }
            )

        cursor.close()

        return {
            "table": table_name,
            "schema": schema,
            "columns": columns,
            "count": len(columns),
        }
    except Exception as e:
        logger.error(f"Error fetching columns: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch columns: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.get("/current")
async def get_current_mapping():
    """
    Get current mapping configuration
    """
    try:
        from db_mapping_config import get_active_mapping

        mapping = get_active_mapping()

        return {"mapping": mapping, "status": "active"}
    except Exception as e:
        logger.error(f"Error fetching current mapping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch mapping: {str(e)}")


@router.post("/test")
async def test_mapping(
    config: MappingConfig,
    host: str,
    port: int,
    database: str,
    user: Optional[str] = None,
    password: Optional[str] = None,
):
    """
    Test a mapping configuration by running a sample query
    """
    conn = None
    try:
        conn = await get_sql_connection(host, port, database, user, password)
        cursor = conn.cursor()

        # Build a test query using the mapping
        test_table = list(config.tables.values())[0] if config.tables else None
        if not test_table:
            raise HTTPException(status_code=400, detail="No tables configured")

        # Build column list from mapping
        columns = []
        for app_field, col_mapping in config.columns.items():
            if col_mapping.table_name == test_table:
                columns.append(f"{col_mapping.erp_column} as {app_field}")

        if not columns:
            raise HTTPException(status_code=400, detail="No columns configured")

        query = f"SELECT TOP 1 {', '.join(columns)} FROM dbo.{test_table}"

        cursor.execute(query)
        row = cursor.fetchone()

        # Read cursor.description before closing cursor (driver-specific safety)
        column_names = [desc[0] for desc in cursor.description] if cursor.description else []

        cursor.close()

        if row:
            # Convert to dict
            result = dict(zip(column_names, row))

            return {
                "success": True,
                "test_query": query,
                "sample_data": result,
                "message": "Mapping test successful",
            }
        else:
            return {
                "success": True,
                "test_query": query,
                "sample_data": None,
                "message": "Query executed but returned no data",
            }
    except Exception as e:
        logger.error(f"Error testing mapping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Mapping test failed: {str(e)}")
    finally:
        if conn:
            conn.close()


@router.post("/save")
async def save_mapping(config: MappingConfig):
    """
    Save mapping configuration (supervisor only)
    Saves to MongoDB erp_config collection
    Note: Auth will be added via dependency injection when integrated with server
    """
    try:
        if not config.tables:
            raise HTTPException(status_code=400, detail="No tables configured")

        if not config.columns:
            raise HTTPException(status_code=400, detail="No columns configured")

        # Convert Pydantic models to dict
        mapping_dict = {
            "tables": config.tables,
            "columns": {k: v.model_dump() for k, v in config.columns.items()},
            "query_options": config.query_options or {},
        }

        # Note: To save to MongoDB, inject db via dependency or pass as parameter
        # This endpoint will be integrated with server.py's db instance

        return {
            "success": True,
            "message": "Mapping configuration validated successfully",
            "config": mapping_dict,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving mapping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save mapping: {str(e)}")
