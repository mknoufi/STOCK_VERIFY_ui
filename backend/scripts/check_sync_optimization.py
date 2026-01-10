import os
import sys
from pathlib import Path  # noqa: E402

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, os.getcwd())

from config import settings  # noqa: E402
from sql_server_connector import SQLServerConnector  # noqa: E402


def check_optimization():
    connector = SQLServerConnector()
    try:
        connector.connect(
            settings.SQL_SERVER_HOST,
            settings.SQL_SERVER_PORT,
            settings.SQL_SERVER_DATABASE,
            settings.SQL_SERVER_USER,
            settings.SQL_SERVER_PASSWORD,
        )

        cursor = connector.connection.cursor()

        # 1. Check ProductBatchID range and type
        print("Checking ProductBatchID...")
        cursor.execute(
            "SELECT MIN(ProductBatchID), MAX(ProductBatchID), COUNT(*) FROM ProductBatches"
        )
        row = cursor.fetchone()
        print(f"ProductBatchID - Min: {row[0]}, Max: {row[1]}, Total: {row[2]}")

        # 2. Check ModifiedDate for incremental sync
        print("\nChecking ModifiedDate...")
        cursor.execute(
            "SELECT COUNT(*) FROM ProductBatches WHERE ModifiedDate IS NOT NULL"
        )
        count = cursor.fetchone()[0]
        print(f"Items with ModifiedDate: {count} / {row[2]}")

        if count > 0:
            cursor.execute("SELECT MAX(ModifiedDate) FROM ProductBatches")
            print(f"Latest ModifiedDate: {cursor.fetchone()[0]}")

        # 3. Check for items with multiple barcodes
        print("\nChecking for items with multiple barcodes...")
        query_multi = """
        SELECT TOP 5 ProductBatchID, AutoBarcode, MannualBarcode, Unit2AutoBarcode
        FROM ProductBatches
        WHERE (AutoBarcode IS NOT NULL AND AutoBarcode != '')
        AND (MannualBarcode IS NOT NULL AND MannualBarcode != '')
        """
        cursor.execute(query_multi)
        rows = cursor.fetchall()
        for r in rows:
            print(f"ID: {r[0]} | Auto: {r[1]} | Manual: {r[2]} | Unit2: {r[3]}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        connector.disconnect()


if __name__ == "__main__":
    check_optimization()
