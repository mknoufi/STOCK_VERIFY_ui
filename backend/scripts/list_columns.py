import os
import sys
from pathlib import Path  # noqa: E402

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, os.getcwd())

from config import settings  # noqa: E402
from sql_server_connector import SQLServerConnector  # noqa: E402


def list_columns():
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

        for table in ["Products", "ProductBatches"]:
            print(f"\nColumns in {table}:")
            cursor.execute(f"SELECT TOP 0 * FROM {table}")  # nosec
            columns = [column[0] for column in cursor.description]
            print(", ".join(columns))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        connector.disconnect()


if __name__ == "__main__":
    list_columns()
