import sys
from pathlib import Path  # noqa: E402

# Add project root to path
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.config import settings  # noqa: E402
from backend.sql_server_connector import SQLServerConnector  # noqa: E402


def check_duplicates():
    sql_connector = SQLServerConnector()
    sql_connector.connect(
        host=settings.SQL_SERVER_HOST,
        port=settings.SQL_SERVER_PORT,
        database=settings.SQL_SERVER_DATABASE,
        user=settings.SQL_SERVER_USER,
        password=settings.SQL_SERVER_PASSWORD,
    )

    query = """
        SELECT
            COUNT(*) as total_rows,
            COUNT(DISTINCT P.ProductCode) as unique_item_codes,
            COUNT(DISTINCT CAST(PB.AutoBarcode AS VARCHAR(50))) as unique_barcodes
        FROM ProductBatches PB
        INNER JOIN Products P ON PB.ProductID = P.ProductID
        WHERE PB.AutoBarcode IS NOT NULL
          AND LEN(CAST(PB.AutoBarcode AS VARCHAR(50))) = 6
          AND ISNUMERIC(CAST(PB.AutoBarcode AS VARCHAR(50))) = 1
          AND P.IsActive = 1
          AND CAST(PB.AutoBarcode AS BIGINT) BETWEEN 510000 AND 5301000
    """

    cursor = sql_connector.connection.cursor()
    cursor.execute(query)
    row = cursor.fetchone()
    print(f"Total Rows: {row[0]}")
    print(f"Unique Item Codes: {row[1]}")
    print(f"Unique Barcodes: {row[2]}")


if __name__ == "__main__":
    check_duplicates()
