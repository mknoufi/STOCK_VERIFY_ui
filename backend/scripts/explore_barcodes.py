import os
import sys
from pathlib import Path  # noqa: E402

# Add project root to path
# Since we are in backend/, the root is ..
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Also add current dir to path for backend imports
sys.path.insert(0, os.getcwd())

from config import settings  # noqa: E402
from sql_server_connector import SQLServerConnector  # noqa: E402


def explore():
    connector = SQLServerConnector()
    try:
        connector.connect(
            settings.SQL_SERVER_HOST,
            settings.SQL_SERVER_PORT,
            settings.SQL_SERVER_DATABASE,
            settings.SQL_SERVER_USER,
            settings.SQL_SERVER_PASSWORD,
        )

        # 1. Get Min/Max of all barcodes
        query_min_max = """
        SELECT MIN(CAST(AutoBarcode AS BIGINT)) as min_bc, MAX(CAST(AutoBarcode AS BIGINT)) as max_bc, COUNT(*) as total
        FROM ProductBatches
        WHERE ISNUMERIC(AutoBarcode) = 1
        """
        cursor = connector.connection.cursor()
        cursor.execute(query_min_max)
        row = cursor.fetchone()
        print(f"Numeric Barcodes - Min: {row[0]}, Max: {row[1]}, Total: {row[2]}")

        # 2. Check for non-numeric barcodes
        query_non_numeric = """
        SELECT TOP 10 AutoBarcode
        FROM ProductBatches
        WHERE ISNUMERIC(AutoBarcode) = 0
        """
        cursor.execute(query_non_numeric)
        non_numeric = cursor.fetchall()
        if non_numeric:
            print(f"Found non-numeric barcodes (sample): {[r[0] for r in non_numeric]}")
        else:
            print("No non-numeric barcodes found.")

        # 3. Check for barcodes outside the 510000-5301000 range
        query_outside = """
        SELECT MIN(CAST(AutoBarcode AS BIGINT)) as min_bc, MAX(CAST(AutoBarcode AS BIGINT)) as max_bc, COUNT(*) as total
        FROM ProductBatches
        WHERE ISNUMERIC(AutoBarcode) = 1
        AND (CAST(AutoBarcode AS BIGINT) < 510000 OR CAST(AutoBarcode AS BIGINT) > 5301000)
        """
        cursor.execute(query_outside)
        row = cursor.fetchone()
        if row[2] > 0:
            print(
                f"Barcodes OUTSIDE 510000-5301000 - Min: {row[0]}, Max: {row[1]}, Total: {row[2]}"
            )
        else:
            print("No numeric barcodes found outside the 510000-5301000 range.")

        # 4. Group by first two digits to see "series"
        query_series = """
        SELECT LEFT(AutoBarcode, 2) as series, COUNT(*) as count
        FROM ProductBatches
        WHERE ISNUMERIC(AutoBarcode) = 1
        GROUP BY LEFT(AutoBarcode, 2)
        ORDER BY series
        """
        cursor.execute(query_series)
        series = cursor.fetchall()
        print("\nBarcode Series Distribution (First 2 digits):")
        for s in series:
            print(f"Series {s[0]}: {s[1]} items")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        connector.disconnect()


if __name__ == "__main__":
    explore()
