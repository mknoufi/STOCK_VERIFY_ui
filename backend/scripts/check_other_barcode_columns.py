import os
import sys
from pathlib import Path  # noqa: E402

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, os.getcwd())

from config import settings  # noqa: E402
from sql_server_connector import SQLServerConnector  # noqa: E402


def check_other_columns():
    connector = SQLServerConnector()
    try:
        connector.connect(
            settings.SQL_SERVER_HOST,
            settings.SQL_SERVER_PORT,
            settings.SQL_SERVER_DATABASE,
            settings.SQL_SERVER_USER,
            settings.SQL_SERVER_PASSWORD,
        )

        # Check Products table for Barcode column
        query_products = """
        SELECT TOP 10 Barcode
        FROM Products
        WHERE Barcode IS NOT NULL AND Barcode != ''
        """
        cursor = connector.connection.cursor()
        cursor.execute(query_products)
        rows = cursor.fetchall()
        if rows:
            print(
                f"Found barcodes in Products.Barcode (sample): {[r[0] for r in rows]}"
            )

            query_count = "SELECT COUNT(*) FROM Products WHERE Barcode IS NOT NULL AND Barcode != ''"
            cursor.execute(query_count)
            print(f"Total barcodes in Products.Barcode: {cursor.fetchone()[0]}")
        else:
            print("No barcodes found in Products.Barcode column.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        connector.disconnect()


if __name__ == "__main__":
    check_other_columns()
