# ruff: noqa: E402
import sys
from pathlib import Path

# Add project root to path for direct execution (debugging)
# This allows the file to be run directly for testing/debugging
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

import logging  # noqa: E402
from typing import Any, Dict, List, Optional  # noqa: E402

import pyodbc  # noqa: E402

from backend.db_mapping_config import SQL_TEMPLATES, get_active_mapping  # noqa: E402
from backend.utils.db_connection import SQLServerConnectionBuilder  # noqa: E402

logger = logging.getLogger(__name__)


class DatabaseConnectionError(Exception):
    """Raised when database connection fails after all retry attempts."""

    pass


class DatabaseQueryError(Exception):
    """Raised when database query execution fails."""

    pass


class ItemNotFoundError(Exception):
    """Raised when requested item is not found in database."""

    pass


# Constants
DB_NOT_CONNECTED_MSG = "Not connected to database"


class SQLServerConnector:
    def __init__(self):
        self.connection = None
        self.config = None
        self.mapping = get_active_mapping()
        self.connection_methods = []  # Store tested connection methods

    def _build_column_list(self) -> str:
        """Build SELECT column list with proper aliases"""
        mapping = self.mapping["items_columns"]
        columns = []
        for our_field, erp_column in mapping.items():
            columns.append(f"{erp_column} as {our_field}")
        return ", ".join(columns)

    def _build_query(self, template_name: str, **kwargs) -> str:
        """Build SQL query from template with mappings"""
        template = SQL_TEMPLATES[template_name]
        mapping = self.mapping

        # Get configuration
        table_name = mapping["tables"]["items"]
        schema = mapping["query_options"].get("schema_name", "dbo")
        joins = "\n".join(mapping["query_options"].get("join_tables", []))
        additional_where = mapping["query_options"].get("where_clause_additions", "")

        # Build column list
        columns = self._build_column_list()

        # Build query
        query = template.format(
            columns=columns,
            schema=schema,
            table=table_name,
            alias="I" if joins else "",
            joins=joins,
            barcode_column=mapping["items_columns"]["barcode"],
            code_column=mapping["items_columns"]["item_code"],
            warehouse_column=mapping["items_columns"]["warehouse"],
            additional_where=additional_where,
            **kwargs,
        )

        return query

    def connect(
        self,
        host: str,
        port: int,
        database: str,
        user: Optional[str] = None,
        password: Optional[str] = None,
    ) -> bool:
        """
        Connect to SQL Server (Polosys ERP)
        Supports both Windows Authentication and SQL Server Authentication
        Automatically tries multiple connection methods if initial attempt fails
        """
        methods_to_try = self._build_connection_methods(host, port, database, user, password)

        # Try each method
        last_error = None
        for method in methods_to_try:
            if self._attempt_connection_method(method):
                return True
            last_error = self._get_last_error_from_method(method)

        # Log all attempted methods
        error_msg = f"All {len(methods_to_try)} connection methods failed. Last error: {last_error or 'Unknown error'}"
        logger.error(error_msg)
        raise DatabaseConnectionError(error_msg)

    def _build_connection_methods(
        self,
        host: str,
        port: int,
        database: str,
        user: Optional[str],
        password: Optional[str],
    ) -> List[Dict[str, Any]]:
        """Build list of connection methods to try"""
        host_variants = [host, host.upper(), host.lower(), host.capitalize()]
        methods_to_try = []

        if user and password:
            methods_to_try.extend(
                self._build_sql_auth_methods(host_variants, port, database, user, password)
            )
        else:
            methods_to_try.extend(self._build_windows_auth_methods(host_variants, port, database))

        return methods_to_try

    def _build_sql_auth_methods(
        self,
        host_variants: List[str],
        port: int,
        database: str,
        user: str,
        password: str,
    ) -> List[Dict[str, Any]]:
        """Build SQL Server Authentication methods"""
        methods = []
        for h in set(host_variants):
            methods.append(
                {
                    "host": h,
                    "port": port,
                    "database": database,
                    "user": user,
                    "password": password,
                    "auth": "sql",
                    "name": f"SQL Auth: {h}:{port}",
                }
            )
            methods.append(
                {
                    "host": h,
                    "port": None,
                    "database": database,
                    "user": user,
                    "password": password,
                    "auth": "sql",
                    "name": f"SQL Auth: {h} (no port)",
                }
            )
        return methods

    def _build_windows_auth_methods(
        self,
        host_variants: List[str],
        port: int,
        database: str,
    ) -> List[Dict[str, Any]]:
        """Build Windows Authentication methods"""
        methods = []
        for h in set(host_variants):
            methods.append(
                {
                    "host": h,
                    "port": port,
                    "database": database,
                    "user": None,
                    "password": None,
                    "auth": "windows",
                    "name": f"Windows Auth: {h}:{port}",
                }
            )
            methods.append(
                {
                    "host": h,
                    "port": None,
                    "database": database,
                    "user": None,
                    "password": None,
                    "auth": "windows",
                    "name": f"Windows Auth: {h} (no port)",
                }
            )
        return methods

    def _attempt_connection_method(self, method: Dict[str, Any]) -> bool:
        """Attempt connection using a specific method"""
        try:
            port_param = self._normalize_port_value(method.get("port"))

            self.connection = SQLServerConnectionBuilder.create_optimized_connection(
                host=str(method["host"]),
                database=str(method["database"]),
                port=port_param,
                user=str(method["user"]) if method.get("user") else None,
                password=str(method["password"]) if method.get("password") else None,
                timeout=15,
            )

            # Verify connection using shared utility
            if not SQLServerConnectionBuilder.is_connection_valid(self.connection):
                raise pyodbc.Error("Connection validation failed")

            # Success - store config and log
            self._store_successful_config(method)
            return True

        except Exception as e:
            logger.debug(f"❌ {method['name']} failed: {str(e)[:100]}")
            self.connection_methods.append(
                {"success": False, "method": method["name"], "error": str(e)}
            )
            return False

    def _normalize_port_value(self, port_value: Any) -> Optional[int]:
        """Normalize port value to proper type"""
        if port_value is None:
            return None
        elif isinstance(port_value, int):
            return port_value
        elif isinstance(port_value, str) and port_value.isdigit():
            return int(port_value)
        else:
            return None

    def _store_successful_config(self, method: Dict[str, Any]) -> None:
        """Store successful connection configuration"""
        self.config = {
            "host": method["host"],
            "port": method.get("port"),
            "database": method["database"],
            "auth": method["auth"],
            "method_used": method["name"],
        }
        if method["user"]:
            self.config["user"] = method["user"]
            self.config["password"] = method["password"]

        logger.info(f"✅ Successfully connected using {method['name']}")
        self.connection_methods.append(
            {
                "success": True,
                "method": method["name"],
                "config": {k: v for k, v in self.config.items() if k != "password"},
            }
        )

    def _get_last_error_from_method(self, method: Dict[str, Any]) -> Optional[str]:
        """Get last error from connection methods history"""
        for conn_method in reversed(self.connection_methods):
            if conn_method.get("method") == method["name"] and not conn_method.get("success"):
                error = conn_method.get("error")
                return str(error) if error is not None else None
        return None

    def disconnect(self):
        if self.connection:
            self.connection.close()
            self.connection = None
            logger.info("Disconnected from SQL Server")

    def test_connection(self) -> bool:
        """Test if connection is alive, reconnect if needed"""
        if not self.connection:
            logger.debug("No SQL Server connection available")
            return self._attempt_auto_reconnect()

        if self._validate_connection():
            return True

        # Connection lost, try to reconnect
        logger.debug("Connection test failed")
        return self._attempt_reconnect_on_failure()

    def _attempt_auto_reconnect(self) -> bool:
        """Attempt to auto-reconnect using saved config"""
        if not self.config:
            return False

        try:
            logger.info("Attempting to establish SQL Server connection from saved config...")
            return self._reconnect_with_config()
        except Exception as e:
            logger.debug(f"Auto-reconnect failed: {str(e)[:100]}")
            return False

    def _validate_connection(self) -> bool:
        """Validate if current connection is working"""
        if not self.connection:
            return False
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            return True
        except Exception:
            return False

    def _attempt_reconnect_on_failure(self) -> bool:
        """Attempt to reconnect when connection validation fails"""
        if not self.config:
            return False

        try:
            logger.warning("Connection lost, attempting to reconnect...")
            return self._reconnect_with_config()
        except DatabaseConnectionError as reconnect_error:
            logger.error(f"Reconnect failed: {str(reconnect_error)[:100]}")
            return False
        except Exception as reconnect_error:
            logger.error(f"Unexpected reconnect error: {str(reconnect_error)[:100]}")
            return False

    def _reconnect_with_config(self) -> bool:
        """Reconnect using saved configuration"""
        if not self.config or not isinstance(self.config, dict):
            return False

        host = str(self.config["host"])
        port = int(self.config.get("port", 1433))
        database = str(self.config["database"])
        user = self.config.get("user")
        password = self.config.get("password")
        self.connect(host, port, database, user, password)
        return True

    def _cursor_to_dict(self, cursor, row) -> Dict[str, Any]:
        """Convert pyodbc row to dictionary"""
        if not cursor.description or not row:
            return {}
        columns = [column[0] for column in cursor.description]
        result = dict(zip(columns, row))

        # Synthesize image URL if item_name exists
        if "item_name" in result and result["item_name"]:
            # Use placehold.co for dynamic placeholder
            safe_name = result["item_name"].replace(" ", "+")
            result["image_url"] = f"https://placehold.co/400x400/e2e8f0/1e293b?text={safe_name}"

        return result

    def get_item_by_barcode(self, barcode: str) -> Optional[Dict[str, Any]]:
        """
        Fetch item from E_MART_KITCHEN_CARE ERP by barcode
        Searches in ProductBarcodes, ProductBatches, and Products tables
        """
        if not self.connection:
            raise DatabaseConnectionError(DB_NOT_CONNECTED_MSG)

        try:
            cursor = self.connection.cursor()

            # Use the predefined query template
            query = SQL_TEMPLATES["get_item_by_barcode"]

            logger.info(f"Searching for barcode: {barcode}")

            # Execute with barcode - query checks multiple barcode fields
            # Query prioritizes AutoBarcode first
            # Parameters: AutoBarcode(WHERE), MannualBarcode(WHERE), ProductBarcode(WHERE), ProductCode(WHERE)
            cursor.execute(query, (barcode, barcode, barcode, barcode))
            row = cursor.fetchone()

            if row:
                result = self._cursor_to_dict(cursor, row)
                cursor.close()
                logger.info(f"Found item: {result.get('item_name')}")
                return result
            else:
                cursor.close()
                logger.warning(f"No item found for barcode: {barcode}")
                return None

        except Exception as e:
            logger.error(f"Error fetching item by barcode: {str(e)}")
            raise DatabaseQueryError(f"Failed to fetch item by barcode: {str(e)}")

    def get_all_items(self) -> List[Dict[str, Any]]:
        """
        Fetch all active items from E_MART_KITCHEN_CARE ERP
        Limited to 1000 items for performance
        """
        if not self.connection:
            raise DatabaseConnectionError(DB_NOT_CONNECTED_MSG)

        try:
            cursor = self.connection.cursor()
            query = SQL_TEMPLATES["get_all_items"]

            cursor.execute(query)
            rows = cursor.fetchall()

            # Convert rows to dictionaries (before closing cursor)
            results = [self._cursor_to_dict(cursor, row) for row in rows]
            cursor.close()

            logger.info(f"Retrieved {len(results)} items from ERP")
            return results

        except Exception as e:
            logger.error(f"Error fetching all items: {str(e)}")
            raise DatabaseQueryError(f"Failed to fetch all items: {str(e)}")

    def search_items(self, search_term: str) -> List[Dict[str, Any]]:
        """
        Search items by name, code, or alias
        Returns top 50 matching items
        """
        if not self.connection:
            raise DatabaseConnectionError(DB_NOT_CONNECTED_MSG)

        try:
            cursor = self.connection.cursor()

            # Get the query template
            query = SQL_TEMPLATES["search_items"]
            search_pattern = f"%{search_term}%"

            # Execute with all 10 parameters:
            # - 7 for WHERE clause
            # - 3 for ORDER BY CASE expressions
            cursor.execute(
                query,
                (
                    search_pattern,  # WHERE: ProductName LIKE
                    search_pattern,  # WHERE: ProductCode LIKE
                    search_pattern,  # WHERE: ItemAlias LIKE
                    search_pattern,  # WHERE: MannualBarcode LIKE
                    search_pattern,  # WHERE: PBC.Barcode LIKE
                    search_pattern,  # WHERE: AutoBarcode LIKE
                    search_pattern,  # WHERE: GroupName LIKE
                    search_pattern,  # ORDER BY: ProductName LIKE
                    search_pattern,  # ORDER BY: ProductCode LIKE
                    search_pattern,  # ORDER BY: ItemAlias LIKE
                ),
            )
            rows = cursor.fetchall()

            # Convert rows to dictionaries (before closing cursor)
            results = [self._cursor_to_dict(cursor, row) for row in rows]
            cursor.close()

            logger.info(f"Found {len(results)} items matching '{search_term}'")
            return results

        except Exception as e:
            logger.error(f"Error searching items: {str(e)}")
            raise DatabaseQueryError(f"Failed to search items: {str(e)}")

    def get_item_batches(self, item_identifier: str) -> List[Dict[str, Any]]:
        """
        Get all batches for a specific item
        Useful for items with different MRPs, expiry dates, or locations
        """
        if not self.connection:
            raise DatabaseConnectionError(DB_NOT_CONNECTED_MSG)

        try:
            cursor = self.connection.cursor()
            query = SQL_TEMPLATES["get_item_batches"]

            cursor.execute(query, (item_identifier, item_identifier))
            rows = cursor.fetchall()

            # Convert rows to dictionaries (before closing cursor)
            results = [self._cursor_to_dict(cursor, row) for row in rows]
            cursor.close()

            logger.info(f"Found {len(results)} batches for item '{item_identifier}'")
            return results

        except Exception as e:
            logger.error(f"Error fetching item batches: {str(e)}")
            raise DatabaseQueryError(f"Failed to fetch item batches: {str(e)}")

    def get_item_by_code(self, item_code: str) -> Optional[Dict[str, Any]]:
        """
        Fetch item by item code using SQL template
        """
        if not self.connection:
            raise DatabaseConnectionError(DB_NOT_CONNECTED_MSG)

        try:
            cursor = self.connection.cursor()

            # Use the predefined query template
            query = SQL_TEMPLATES["get_item_by_code"]

            logger.info(f"Searching for item code: {item_code}")

            cursor.execute(query, (item_code,))
            row = cursor.fetchone()

            if row:
                result = self._cursor_to_dict(cursor, row)
                cursor.close()
                logger.info(f"Found item: {result.get('item_name')}")
                return result
            else:
                cursor.close()
                logger.warning(f"No item found for item code: {item_code}")
                return None

        except Exception as e:
            logger.error(f"Error fetching item by code: {str(e)}")
            raise DatabaseQueryError(f"Failed to fetch item by code: {str(e)}")


# Global connector instance
sql_connector = SQLServerConnector()
