import os
import sys
from pathlib import Path  # noqa: E402

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, os.getcwd())

from config import settings  # noqa: E402
from sql_server_connector import SQLServerConnector  # noqa: E402


def check_other_barcodes():
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

        columns = ["MannualBarcode", "UPCCode", "UnitMBarCode", "Unit2AutoBarcode"]

        for col in columns:
            query = f"SELECT COUNT(*) FROM ProductBatches WHERE {col} IS NOT NULL AND {col} != ''"
            cursor.execute(query)
            count = cursor.fetchone()[0]
            print(f"Total in {col}: {count}")

            if count > 0:
                query_sample = f"SELECT TOP 5 {col} FROM ProductBatches WHERE {col} IS NOT NULL AND {col} != ''"
                cursor.execute(query_sample)
                samples = [r[0] for r in cursor.fetchall()]
                print(f"  Sample {col}: {samples}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        connector.disconnect()


if __name__ == "__main__":
    check_other_barcodes()
