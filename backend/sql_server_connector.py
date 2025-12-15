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
        self.optional_columns_clause = ""
        self.optional_joins_clause = ""
        self._dynamic_sql_ready = False
        self._available_tables: Dict[str, str] = {}
        self._table_columns: Dict[str, Dict[str, str]] = {}
        self._enabled_optional_fields: List[str] = []

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
            optional_columns=self.optional_columns_clause,
            optional_joins=self.optional_joins_clause,
            **kwargs,
        )

        return query

    def _reset_dynamic_metadata(self) -> None:
        """Reset cached optional select/join fragments."""
        self.optional_columns_clause = ""
        self.optional_joins_clause = ""
        self._dynamic_sql_ready = False
        self._available_tables = {}
        self._table_columns = {}
        self._enabled_optional_fields = []

    def _ensure_dynamic_sql_fragments(self) -> None:
        """Detect optional tables/columns once per connection for richer item metadata."""
        if self._dynamic_sql_ready or not self.connection:
            return

        try:
            self._load_schema_metadata()
            columns_clause, joins_clause, enabled_fields = self._build_optional_selects_and_joins()
            self.optional_columns_clause = columns_clause
            self.optional_joins_clause = joins_clause
            self._enabled_optional_fields = enabled_fields
            self._dynamic_sql_ready = True

            if enabled_fields:
                logger.info(
                    "Enriched ERP queries with optional fields: %s",
                    ", ".join(sorted(set(enabled_fields))),
                )
        except Exception as exc:
            logger.debug(f"Dynamic SQL preparation failed: {str(exc)[:120]}")
            # Avoid blocking queries – continue without optional columns
            self.optional_columns_clause = ""
            self.optional_joins_clause = ""
            self._dynamic_sql_ready = True

    def _load_schema_metadata(self) -> None:
        """Snapshot available tables for optional joins."""
        if not self.connection:
            return

        cursor = self.connection.cursor()
        cursor.execute(
            """
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'dbo'
            """
        )
        self._available_tables = {row[0].lower(): row[0] for row in cursor.fetchall()}
        cursor.close()
        self._table_columns = {}

    def _get_table_columns(self, table_name: Optional[str]) -> Dict[str, str]:
        """Return column map for table (lowercase -> actual)."""
        if not table_name or not self.connection:
            return {}

        if table_name in self._table_columns:
            return self._table_columns[table_name]

        cursor = self.connection.cursor()
        cursor.execute(
            """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = ?
            """,
            (table_name,),
        )
        columns = {row[0].lower(): row[0] for row in cursor.fetchall()}
        cursor.close()
        self._table_columns[table_name] = columns
        return columns

    def _resolve_table_name(self, candidates: List[str]) -> Optional[str]:
        for candidate in candidates:
            if not candidate:
                continue
            actual = self._available_tables.get(candidate.lower())
            if actual:
                return actual
        return None

    def _resolve_column_name(self, columns: Dict[str, str], candidates: List[str]) -> Optional[str]:
        for candidate in candidates:
            if not candidate:
                continue
            column = columns.get(candidate.lower())
            if column:
                return column
        return None

    def _get_column_reference(
        self, alias: str, columns: Dict[str, str], candidates: List[str]
    ) -> Optional[str]:
        column = self._resolve_column_name(columns, candidates)
        if column:
            return f"{alias}.{column}"
        return None

    def _build_coalesce_expression(self, expressions: List[str], default: str = "0") -> str:
        values = [expr for expr in expressions if expr]
        if not values:
            return default
        if default:
            values.append(default)
        return f"COALESCE({', '.join(values)})"

    def _build_optional_selects_and_joins(self) -> tuple[str, str, List[str]]:
        """Build optional metadata selects/joins (sales, purchase, supplier, brand)."""
        if not self.mapping:
            return "", "", []

        optional_columns: List[str] = []
        optional_joins: List[str] = []
        enabled_fields: List[str] = []

        items_table = self.mapping.get("tables", {}).get("items")
        batches_table = self.mapping.get("tables", {}).get("item_batches")

        product_columns = self._get_table_columns(items_table)
        batch_columns = self._get_table_columns(batches_table)

        if not product_columns:
            return "", "", []

        # --- Sales price / rate metadata ---
        sales_sources: List[str] = []
        batch_sales = self._get_column_reference("PB", batch_columns, ["stdsalesprice", "stdsalesrate"])
        if batch_sales:
            sales_sources.append(batch_sales)

        product_sales = self._get_column_reference("P", product_columns, ["stdsalesprice", "stdsalesrate"])
        if product_sales:
            sales_sources.append(product_sales)

        product_last_sales = self._get_column_reference("P", product_columns, ["lastsalesrate", "salesrate"])
        if product_last_sales:
            sales_sources.append(product_last_sales)

        if sales_sources:
            coalesced_sales = self._build_coalesce_expression(sales_sources, "0")
            optional_columns.append(f"{coalesced_sales} as sales_price")
            optional_columns.append(f"{coalesced_sales} as sale_price")
            enabled_fields.extend(["sales_price", "sale_price"])

        if product_last_sales:
            optional_columns.append(f"{product_last_sales} as standard_rate")
            enabled_fields.append("standard_rate")

        last_purchase_rate = self._get_column_reference("P", product_columns, ["lastpurchaserate"])
        if last_purchase_rate:
            optional_columns.append(f"{last_purchase_rate} as last_purchase_rate")
            enabled_fields.append("last_purchase_rate")

        # --- Brand metadata ---
        brand_table = self._resolve_table_name(["brands", "productbrands", "brandmaster", "brand"])
        if brand_table:
            brand_columns = self._get_table_columns(brand_table)
            brand_fk = self._resolve_column_name(product_columns, ["brandid", "brand_id", "brandcode"])
            brand_pk = self._resolve_column_name(brand_columns, ["brandid", "brand_id", "id"])
            if brand_fk and brand_pk:
                optional_joins.append(
                    f"LEFT JOIN dbo.{brand_table} BR ON P.{brand_fk} = BR.{brand_pk}"
                )
                enabled_fields.append("brand")
                optional_columns.append(f"BR.{brand_pk} as brand_id")
                brand_name_col = self._resolve_column_name(
                    brand_columns, ["brandname", "name", "brand"]
                )
                if brand_name_col:
                    optional_columns.append(f"BR.{brand_name_col} as brand_name")
                brand_code_col = self._resolve_column_name(brand_columns, ["brandcode", "code"])
                if brand_code_col:
                    optional_columns.append(f"BR.{brand_code_col} as brand_code")

        # --- Purchase / supplier metadata ---
        purchase_detail_table = self._resolve_table_name(
            [
                "purchaseinvoicedetails",
                "purchaseinvoicedetail",
                "purchaseinvoiceitems",
                "purchaseitems",
            ]
        )
        purchase_invoice_table = self._resolve_table_name(
            ["purchaseinvoices", "purchaseinvoice", "purchaseinvoicemaster"]
        )
        product_pk = self._resolve_column_name(product_columns, ["productid", "itemid", "id"])

        if purchase_detail_table and purchase_invoice_table and product_pk:
            pid_columns = self._get_table_columns(purchase_detail_table)
            pi_columns = self._get_table_columns(purchase_invoice_table)

            pid_product_fk = self._resolve_column_name(pid_columns, ["productid", "itemid"])
            pid_invoice_fk = self._resolve_column_name(
                pid_columns, ["purchaseinvoiceid", "invoiceid", "purchaseinvoicemasterid"]
            )
            pid_pk = self._resolve_column_name(
                pid_columns, ["purchaseinvoicedetailid", "purchaseinvoicedetailsid", "id"]
            )
            pi_pk = self._resolve_column_name(pi_columns, ["purchaseinvoiceid", "invoiceid", "id"])

            if pid_product_fk and pid_invoice_fk and pi_pk:
                purchase_select_parts: List[tuple[str, str]] = []

                def _add_purchase_part(expr: Optional[str], alias: str) -> None:
                    if expr and alias not in {a for _, a in purchase_select_parts}:
                        purchase_select_parts.append((expr, alias))

                purchase_rate_expr = self._get_column_reference(
                    "PID", pid_columns, ["purchaserate", "rate", "unitrate"]
                )
                _add_purchase_part(purchase_rate_expr, "purchase_price")
                _add_purchase_part(purchase_rate_expr, "last_purchase_price")

                purchase_qty_expr = self._get_column_reference(
                    "PID", pid_columns, ["qty", "quantity", "purchaseqty"]
                )
                _add_purchase_part(purchase_qty_expr, "purchase_qty")
                _add_purchase_part(purchase_qty_expr, "last_purchase_qty")
                _add_purchase_part(
                    self._get_column_reference(
                        "PID",
                        pid_columns,
                        ["amount", "lineamount", "netamount", "totalamount", "purchaseamount"],
                    ),
                    "last_purchase_cost",
                )
                invoice_no = self._get_column_reference(
                    "PI", pi_columns, ["invoiceno", "invoicenumber", "documentno"]
                )
                _add_purchase_part(invoice_no, "purchase_invoice_no")
                _add_purchase_part(
                    self._get_column_reference(
                        "PI", pi_columns, ["referenceno", "supplierinvoiceno", "supplierrefno"]
                    ),
                    "purchase_reference",
                )
                purchase_date_col = self._get_column_reference(
                    "PI", pi_columns, ["docdate", "postingdate", "invoicedate", "createddate"]
                )
                _add_purchase_part(purchase_date_col, "last_purchase_date")
                voucher_expr = self._get_column_reference(
                    "PI",
                    pi_columns,
                    [
                        "vouchertype",
                        "voucher",
                        "documenttype",
                        "vouchercode",
                        "doctype",
                        "transactiontype",
                    ],
                )
                _add_purchase_part(voucher_expr, "purchase_voucher_type")
                _add_purchase_part(voucher_expr, "purchase_type")

                pi_supplier_fk = self._resolve_column_name(pi_columns, ["supplierid", "vendorid"])
                supplier_join_clause = ""
                supplier_table = self._resolve_table_name(
                    ["suppliers", "supplier", "vendormaster", "vendors", "vendor"]
                )
                if supplier_table and pi_supplier_fk:
                    supplier_columns = self._get_table_columns(supplier_table)
                    supplier_pk = self._resolve_column_name(
                        supplier_columns, ["supplierid", "vendorid", "id"]
                    )
                    if supplier_pk:
                        supplier_join_clause = (
                            f"            LEFT JOIN dbo.{supplier_table} SUP "
                            f"ON PI.{pi_supplier_fk} = SUP.{supplier_pk}\n"
                        )
                        _add_purchase_part(f"SUP.{supplier_pk}", "supplier_id")
                        _add_purchase_part(
                            self._get_column_reference(
                                "SUP", supplier_columns, ["suppliercode", "vendorcode", "code"]
                            ),
                            "supplier_code",
                        )
                        supplier_name_expr = self._get_column_reference(
                            "SUP", supplier_columns, ["suppliername", "vendorname", "name"]
                        )
                        _add_purchase_part(supplier_name_expr, "supplier_name")
                        _add_purchase_part(supplier_name_expr, "last_purchase_supplier")
                        _add_purchase_part(
                            self._get_column_reference(
                                "SUP", supplier_columns, ["phone", "phoneno", "mobile", "contact"]
                            ),
                            "supplier_phone",
                        )
                        _add_purchase_part(
                            self._get_column_reference("SUP", supplier_columns, ["city", "town"]),
                            "supplier_city",
                        )
                        _add_purchase_part(
                            self._get_column_reference("SUP", supplier_columns, ["state", "province"]),
                            "supplier_state",
                        )
                        _add_purchase_part(
                            self._get_column_reference(
                                "SUP", supplier_columns, ["gstnumber", "gstno", "gstin", "taxnumber"]
                            ),
                            "supplier_gst",
                        )

                if purchase_select_parts:
                    select_sql = ",\n                ".join(
                        f"{expr} as {alias}" for expr, alias in purchase_select_parts if expr
                    )
                    order_terms: List[str] = []
                    if purchase_date_col:
                        order_terms.append(f"{purchase_date_col} DESC")
                    if pid_pk:
                        order_terms.append(f"PID.{pid_pk} DESC")
                    order_clause = ", ".join(order_terms) or f"PID.{pid_product_fk} DESC"

                    purchase_join_sql = (
                        "OUTER APPLY (\n"
                        "            SELECT TOP 1\n"
                        f"                {select_sql}\n"
                        f"            FROM dbo.{purchase_detail_table} PID\n"
                        f"            INNER JOIN dbo.{purchase_invoice_table} PI ON PID.{pid_invoice_fk} = PI.{pi_pk}\n"
                    )
                    if supplier_join_clause:
                        purchase_join_sql += supplier_join_clause
                    purchase_join_sql += (
                        f"            WHERE PID.{pid_product_fk} = P.{product_pk}\n"
                        f"            ORDER BY {order_clause}\n"
                        "        ) PurchaseInfo"
                    )
                    optional_joins.append(purchase_join_sql)
                    optional_columns.extend(
                        [f"PurchaseInfo.{alias} as {alias}" for _, alias in purchase_select_parts]
                    )
                    enabled_fields.extend(
                        [alias for _, alias in purchase_select_parts if alias not in enabled_fields]
                    )

        columns_clause = ""
        if optional_columns:
            columns_clause = ",\n            " + ",\n            ".join(optional_columns)

        joins_clause = ""
        if optional_joins:
            joins_clause = "\n        " + "\n        ".join(optional_joins)

        return columns_clause, joins_clause, enabled_fields

    def _apply_optional_sections(self, template: str) -> str:
        try:
            return template.format(
                optional_columns=self.optional_columns_clause,
                optional_joins=self.optional_joins_clause,
            )
        except KeyError:
            return template

    def _get_formatted_query(self, template_name: str) -> str:
        self._ensure_dynamic_sql_fragments()
        template = SQL_TEMPLATES[template_name]
        return self._apply_optional_sections(template)

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
        self, host: str, port: int, database: str, user: Optional[str], password: Optional[str]
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
        self, host_variants: List[str], port: int, database: str, user: str, password: str
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
        self, host_variants: List[str], port: int, database: str
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
            self._reset_dynamic_metadata()
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
        self._reset_dynamic_metadata()

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

            # Use the predefined query template with optional metadata
            query = self._get_formatted_query("get_item_by_barcode")

            logger.info(f"Searching for barcode: {barcode}")

            # Execute with barcode - query template has single %s placeholder
            cursor.execute(query, (barcode,))
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
            query = self._get_formatted_query("get_all_items")

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
            query = self._get_formatted_query("search_items")
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
            query = self._get_formatted_query("get_item_batches")

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
            query = self._get_formatted_query("get_item_by_code")

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
