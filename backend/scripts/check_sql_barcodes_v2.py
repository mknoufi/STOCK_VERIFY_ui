import logging
import sys
from pathlib import Path  # noqa: E402

# Add project root to path
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.config import settings  # noqa: E402
from backend.sql_server_connector import SQLServerConnector  # noqa: E402

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("check_sql_barcodes")


def check_sql_barcodes():
    sql_connector = SQLServerConnector()
    try:
        sql_connector.connect(
            host=settings.SQL_SERVER_HOST,
            port=settings.SQL_SERVER_PORT,
            database=settings.SQL_SERVER_DATABASE,
            user=settings.SQL_SERVER_USER,
            password=settings.SQL_SERVER_PASSWORD,
        )

        # Query to get min, max and count of barcodes in the requested range
        # Using the EXACT filters from the sync query
        query = """
            SELECT
                MIN(CAST(PB.AutoBarcode AS BIGINT)) as min_bc,
                MAX(CAST(PB.AutoBarcode AS BIGINT)) as max_bc,
                COUNT(*) as total_count
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
        columns = [column[0] for column in cursor.description]
        result = [dict(zip(columns, row)) for row in cursor.fetchall()]

        if result:
            row = result[0]
            print("\nSQL Server Barcode Stats (Range 510000 - 5301000):")
            print(f"  Min Barcode: {row['min_bc']}")
            print(f"  Max Barcode: {row['max_bc']}")
            print(f"  Total Count: {row['total_count']}")

            if row["min_bc"] and row["max_bc"]:
                span = row["max_bc"] - row["min_bc"] + 1
                gaps = span - row["total_count"]
                print(f"  Theoretical Span: {span}")
                print(f"  Missing in SQL (with sync filters): {gaps}")

        cursor.close()

    except Exception as e:
        logger.error(f"Error: {e}")


if __name__ == "__main__":
    check_sql_barcodes()
