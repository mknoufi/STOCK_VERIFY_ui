"""ERP Full Sync Script - Synchronizes items from SQL Server to MongoDB.

This script performs a complete synchronization of product data from the ERP
system (SQL Server) to the local MongoDB database. It includes proper error
handling, logging, and type annotations.
"""

import asyncio
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import pyodbc
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import PyMongoError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Configuration
SQL_CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=192.168.1.109,1433;"
    "DATABASE=E_MART_KITCHEN_CARE;"
    "UID=stockapp;"
    "PWD=StockApp@2025!;"
    "TrustServerCertificate=yes;"
)
MONGO_CONNECTION_STRING = "mongodb://localhost:27017"
MONGO_DATABASE = "stock_verification"
BATCH_LOG_INTERVAL = 5000


def conv(val: Any) -> Optional[Any]:
    """Convert SQL Server data types to MongoDB-compatible types.

    Args:
        val: Value from SQL Server query result

    Returns:
        Converted value suitable for MongoDB storage
    """
    if val is None:
        return None
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat() if hasattr(val, "isoformat") else str(val)
    return val


async def sync() -> None:
    """Main synchronization function.

    Synchronizes all active products from SQL Server ERP to MongoDB.
    Handles connection management, error handling, and progress logging.

    Raises:
        pyodbc.Error: If SQL Server connection or query fails
        PyMongoError: If MongoDB operations fail
    """
    conn: Optional[pyodbc.Connection] = None
    cursor: Optional[pyodbc.Cursor] = None
    client: Optional[AsyncIOMotorClient] = None

    try:
        # Connect to SQL Server
        logger.info("Connecting to SQL Server ERP...")
        conn = pyodbc.connect(SQL_CONNECTION_STRING)
        cursor = conn.cursor()
        logger.info("SQL Server connection established")

        logger.info("Syncing to stock_verification...")
        # Execute query to fetch all active products
        logger.info("Executing ERP product query...")
        cursor.execute("""
            WITH LastPurchase AS (
                SELECT ITD.ProductBatchID, ITM.VoucherType as last_purchase_type, ITM.TransactionDate as last_purchase_date, ITD.Quantity as last_purchase_qty, Pa.PartyName as last_purchase_supplier,
                       ROW_NUMBER() OVER (PARTITION BY ITD.ProductBatchID ORDER BY ITM.TransactionDate DESC, ITM.InvTransactionMasterID DESC) as rn
                FROM InvTransactionDetails ITD
                LEFT JOIN InvTransactionMaster ITM ON ITD.InvTransactionMasterID = ITM.InvTransactionMasterID
                LEFT JOIN Parties Pa ON ITM.LedgerID = Pa.LedgerID WHERE ITM.VoucherType IN ('PI', 'PE'))
            SELECT P.ProductID as item_id, P.ProductCode as item_code, CAST(PB.AutoBarcode AS VARCHAR(50)) as barcode, P.ProductName as item_name,
                UOM.UnitName as uom_name, UOM.UnitCode as uom_code, PB.Stock as stock_qty, PB.MRP as mrp, PB.StdSalesPrice as sale_price,
                PB.LastPurchaseRate as last_purchase_price, PB.LastPurchaseCost as last_purchase_cost,
                COALESCE(GST.Sales_SGSTPerc, 0) + COALESCE(GST.Sales_CGSTPerc, 0) as gst_percent, GST.Sales_SGSTPerc as sgst_percent,
                GST.Sales_CGSTPerc as cgst_percent, GST.Sales_IGSTPerc as igst_percent, P.HSNCode as hsn_code, PG.GroupName as category,
                PC.ProductCategoryName as subcategory, LP.last_purchase_supplier, LP.last_purchase_type as purchase_type, PB.BatchNo as batch_no,
                PB.ProductBatchID as batch_id, B.BrandName as brand_name, LP.last_purchase_date, LP.last_purchase_qty, PB.MfgDate as mfg_date,
                PB.ExpiryDate as expiry_date, S.ShelfName as rack, Z.ZoneName as floor, W.WarehouseName as location, W.WarehouseID as warehouse_id
            FROM ProductBatches PB LEFT JOIN Products P ON PB.ProductID = P.ProductID LEFT JOIN UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
            LEFT JOIN ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID LEFT JOIN ProductCategory PC ON P.ProductCategoryID = PC.ProductCategoryID
            LEFT JOIN GSTCategory GST ON P.GSTTaxCategoryID = GST.GSTCategoryID LEFT JOIN Brands B ON PB.BrandID = B.BrandID
            LEFT JOIN Shelfs S ON PB.ShelfID = S.ShelfID LEFT JOIN Zone Z ON S.ZoneID = Z.ZoneID LEFT JOIN Warehouses W ON PB.WarehouseID = W.WarehouseID
            LEFT JOIN LastPurchase LP ON PB.ProductBatchID = LP.ProductBatchID AND LP.rn = 1
            WHERE PB.AutoBarcode IS NOT NULL AND LEN(CAST(PB.AutoBarcode AS VARCHAR(50))) = 6 AND ISNUMERIC(CAST(PB.AutoBarcode AS VARCHAR(50))) = 1 AND P.IsActive = 1
        """)

        # Get column names and rows
        cols: List[str] = [d[0] for d in cursor.description]
        rows = cursor.fetchall()  # Type: pyodbc.Row list
        logger.info(f"Found {len(rows)} items to sync")

        # Connect to MongoDB
        logger.info("Connecting to MongoDB...")
        client = AsyncIOMotorClient(MONGO_CONNECTION_STRING)
        db = client[MONGO_DATABASE]
        logger.info("MongoDB connection established")

        # Sync items to MongoDB
        logger.info("Starting item synchronization...")
        synced: int = 0
        errors: int = 0

        for row in rows:
            try:
                # Convert row to dictionary with proper type conversion
                item: Dict[str, Any] = dict(zip(cols, [conv(v) for v in row]))
                item["synced_at"] = datetime.utcnow().isoformat()
                item["synced_from_erp"] = True

                # Upsert item to MongoDB
                await db.erp_items.update_one(
                    {"barcode": item["barcode"]}, {"$set": item}, upsert=True
                )
                synced += 1

                # Log progress
                if synced % BATCH_LOG_INTERVAL == 0:
                    logger.info(f"Progress: {synced}/{len(rows)} items synced")

            except PyMongoError as e:
                errors += 1
                logger.error(f"Failed to sync item {item.get('barcode', 'unknown')}: {e}")
                continue

        logger.info(f"Synchronization complete: {synced} items synced, {errors} errors")

        # Verify sync with sample item
        logger.info("Verifying synchronization...")
        samsung: Optional[Dict[str, Any]] = await db.erp_items.find_one({"barcode": "524375"})
        if samsung:
            logger.info("Sample verification (Samsung 524375):")
            logger.info(f"  brand_name: {samsung.get('brand_name')}")
            logger.info(f"  last_purchase_supplier: {samsung.get('last_purchase_supplier')}")
            logger.info(f"  purchase_type: {samsung.get('purchase_type')}")
            logger.info(f"  gst_percent: {samsung.get('gst_percent')}")
            logger.info(f"  hsn_code: {samsung.get('hsn_code')}")
        else:
            logger.warning("Verification failed: Sample item 524375 not found")

    except pyodbc.Error as e:
        logger.error(f"SQL Server error: {e}")
        raise
    except PyMongoError as e:
        logger.error(f"MongoDB error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during sync: {e}")
        raise
    finally:
        # Clean up resources
        logger.info("Cleaning up connections...")
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        if client:
            client.close()
        logger.info("Connections closed")


if __name__ == "__main__":
    try:
        asyncio.run(sync())
    except KeyboardInterrupt:
        logger.info("Sync interrupted by user")
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        raise
