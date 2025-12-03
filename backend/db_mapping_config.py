"""
Database Mapping Configuration for E_MART_KITCHEN_CARE SQL Server
Maps ERP database tables and columns to Stock Verification app schema
"""

# Table name mappings
TABLE_MAPPINGS = {
    "items": "Products",
    "item_batches": "ProductBatches",
    "item_barcodes": "ProductBarcodes",
    "warehouses": "Warehouses",
    "uom": "UnitOfMeasures",
    "stock_flow": "StockFlow",
}

# Column mappings for Products table
PRODUCTS_COLUMN_MAP = {
    "item_code": "ProductCode",
    "item_name": "ProductName",
    "barcode": "ProductCode",  # Default to ProductCode, will be enhanced with ProductBarcodes
    "stock_qty": "Stock",
    "uom_code": "BasicUnitID",
    "uom_name": "UnitName",  # From UnitOfMeasures join
    "category": "ProductGroupID",
    "location": "WarehouseID",
    "item_id": "ProductID",
}

# Column mappings for ProductBatches table
BATCH_COLUMN_MAP = {
    "batch_id": "ProductBatchID",
    "item_code": "ProductID",
    "batch_no": "BatchNo",
    "barcode": "MannualBarcode",
    "auto_barcode": "AutoBarcode",
    "mfg_date": "MfgDate",
    "expiry_date": "ExpiryDate",
    "stock_qty": "Stock",
    "opening_stock": "OpeningStock",
    "warehouse_id": "WarehouseID",
    "shelf_id": "ShelfID",
}

# SQL Query Templates
SQL_TEMPLATES = {
    "get_item_by_barcode": """
        SELECT DISTINCT
            P.ProductID as item_id,
            P.ProductCode as item_code,
            P.ProductName as item_name,
            COALESCE(PB.MannualBarcode, P.ProductCode) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            W.WarehouseID as warehouse_id,
            W.WarehouseName as location
        FROM dbo.Products P
        LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.ProductBarcodes PBC ON PB.ProductBatchID = PBC.ProductBatchID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        WHERE PBC.Barcode = %s
           OR PB.MannualBarcode = %s
           OR P.ProductCode = %s
           OR CAST(PB.AutoBarcode AS VARCHAR(50)) = %s
    """,
    "get_item_by_code": """
        SELECT DISTINCT
            P.ProductID as item_id,
            P.ProductCode as item_code,
            P.ProductName as item_name,
            COALESCE(PB.MannualBarcode, P.ProductCode) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            W.WarehouseID as warehouse_id,
            W.WarehouseName as location
        FROM dbo.Products P
        LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        WHERE P.ProductCode = %s
    """,
    "get_all_items": """
        SELECT DISTINCT TOP 1000
            P.ProductID as item_id,
            P.ProductCode as item_code,
            P.ProductName as item_name,
            COALESCE(PB.MannualBarcode, P.ProductCode) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            W.WarehouseID as warehouse_id,
            W.WarehouseName as location
        FROM dbo.Products P
        LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        WHERE P.IsActive = 1
        ORDER BY P.ProductName
    """,
    "search_items": """
        SELECT DISTINCT TOP 50
            P.ProductID as item_id,
            P.ProductCode as item_code,
            P.ProductName as item_name,
            COALESCE(PB.MannualBarcode, P.ProductCode) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            W.WarehouseID as warehouse_id,
            W.WarehouseName as location
        FROM dbo.Products P
        LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        WHERE (P.ProductName LIKE %s
           OR P.ProductCode LIKE %s
           OR P.ItemAlias LIKE %s)
          AND P.IsActive = 1
    """,
    "get_item_batches": """
        SELECT
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MannualBarcode as barcode,
            PB.AutoBarcode as auto_barcode,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            PB.OpeningStock as opening_stock,
            W.WarehouseID as warehouse_id,
            W.WarehouseName as warehouse_name,
            S.ShelfID as shelf_id,
            S.ShelfName as shelf_name,
            P.ProductCode as item_code,
            P.ProductName as item_name
        FROM dbo.ProductBatches PB
        INNER JOIN dbo.Products P ON PB.ProductID = P.ProductID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        LEFT JOIN dbo.Shelfs S ON PB.ShelfID = S.ShelfID
        WHERE P.ProductID = %s OR P.ProductCode = %s
        ORDER BY PB.ExpiryDate, PB.BatchNo
    """,
}

# Data type mappings
DATA_TYPE_MAPPINGS = {
    "bigint": "integer",
    "int": "integer",
    "nvarchar": "string",
    "varchar": "string",
    "decimal": "float",
    "numeric": "float",
    "datetime": "datetime",
    "date": "date",
    "bit": "boolean",
}

# Field validations
FIELD_VALIDATIONS = {
    "item_code": {"required": True, "max_length": 50},
    "item_name": {"required": True, "max_length": 100},
    "barcode": {"required": False, "max_length": 50},
    "batch_no": {"required": False, "max_length": 50},
    "stock_qty": {"required": True, "min_value": 0, "type": "decimal"},
    "uom_code": {"required": True, "max_length": 20},
    "mfg_date": {"required": False, "type": "date"},
    "expiry_date": {"required": False, "type": "date"},
}


def get_active_mapping():
    """Get the active database mapping configuration"""
    return {
        "tables": TABLE_MAPPINGS,
        "items_columns": PRODUCTS_COLUMN_MAP,
        "batch_columns": BATCH_COLUMN_MAP,
        "query_options": {
            "schema_name": "dbo",
            "join_tables": [],
            "where_clause_additions": "AND P.IsActive = 1",
        },
    }
