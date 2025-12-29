import os
import sys
from pathlib import Path  # noqa: E402

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, os.getcwd())

from config import settings  # noqa: E402
from sql_server_connector import SQLServerConnector  # noqa: E402


def check_lengths():
    connector = SQLServerConnector()
    try:
        connector.connect(
            settings.SQL_SERVER_HOST,
            settings.SQL_SERVER_PORT,
            settings.SQL_SERVER_DATABASE,
            settings.SQL_SERVER_USER,
            settings.SQL_SERVER_PASSWORD,
        )

        query = """
        SELECT LEN(AutoBarcode) as length, COUNT(*) as count
        FROM ProductBatches
        GROUP BY LEN(AutoBarcode)
        ORDER BY length
        """
        cursor = connector.connection.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        print("Barcode Length Distribution:")
        for r in rows:
            print(f"Length {r[0]}: {r[1]} items")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        connector.disconnect()


if __name__ == "__main__":
    check_lengths()
