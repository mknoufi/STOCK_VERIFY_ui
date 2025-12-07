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
    "item_code": "Mfr ID",
    "item_name": "Product",
    "barcode": "Mannual Barcode",  # Default to Mannual Barcode
    "stock_qty": "Stock",
    "uom_code": "Unit",
    "uom_name": "Unit",
    "category": "Category",
    "subcategory": "Sub Category",
    "location": "Department",
    "item_id": "Si No",
    # Purchase-related field mappings
    "last_purchase_price": "Last Purchase Price",
    "gst_percentage": "GST%",
    "hsn_code": "HSN Code",
    "last_purchase_type": "Last Purchase Type",
    "supplier_name": "Supplier Name",
    "last_purchase_qty": "Last Purchase Qty",
    "last_purchase_date": "Last Purchase Date",
    "voucher_number": "Voucher Number",
}

# Column mappings for ProductBatches table
BATCH_COLUMN_MAP = {
    "batch_id": "Si No",
    "item_code": "Mfr ID",
    "batch_no": "Batch Criteria",
    "barcode": "Mannual Barcode",
    "auto_barcode": "Autobarcode",
    "mfg_date": "MfgDate",
    "expiry_date": "ExpiryDate",
    "stock_qty": "Stock",
    "opening_stock": "OpeningStock",
    "warehouse_id": "Department",
    "shelf_id": "ShelfID",
}

# SQL Query Templates
# Note: Using bracketed identifiers for columns with spaces as per Excel reference
SQL_TEMPLATES = {
    "get_item_by_barcode": """
        SELECT DISTINCT
            P.[Si No] as item_id,
            P.[Mfr ID] as item_code,
            P.[Product] as item_name,
            COALESCE(P.[Mannual Barcode], P.[Autobarcode]) as barcode,
            P.[Si No] as batch_id,
            P.[Batch Criteria] as batch_no,
            NULL as mfg_date,
            NULL as expiry_date,
            P.[Stock] as stock_qty,
            P.[Unit] as uom_id,
            P.[Unit] as uom_code,
            P.[Unit] as uom_name,
            P.[Department] as warehouse_id,
            P.[Department] as location,
            P.[Category] as category,
            P.[Sub Category] as subcategory,
            P.[Last Purchase Price] as last_purchase_price,
            P.[GST%] as gst_percentage,
            P.[HSN Code] as hsn_code,
            P.[Last Purchase Type] as last_purchase_type,
            P.[Supplier Name] as supplier_name,
            P.[Last Purchase Qty] as last_purchase_qty,
            P.[Last Purchase Date] as last_purchase_date,
            P.[Voucher Number] as voucher_number
        FROM dbo.Products P
        WHERE P.[Mannual Barcode] = ?
           OR P.[Autobarcode] = ?
           OR P.[Mfr ID] = ?
           OR P.[PLU Code] = ?
    """,
    "get_item_by_code": """
        SELECT DISTINCT
            P.[Si No] as item_id,
            P.[Mfr ID] as item_code,
            P.[Product] as item_name,
            COALESCE(P.[Mannual Barcode], P.[Autobarcode]) as barcode,
            P.[Si No] as batch_id,
            P.[Batch Criteria] as batch_no,
            NULL as mfg_date,
            NULL as expiry_date,
            P.[Stock] as stock_qty,
            P.[Unit] as uom_id,
            P.[Unit] as uom_code,
            P.[Unit] as uom_name,
            P.[Department] as warehouse_id,
            P.[Department] as location,
            P.[Category] as category,
            P.[Sub Category] as subcategory,
            P.[Last Purchase Price] as last_purchase_price,
            P.[GST%] as gst_percentage,
            P.[HSN Code] as hsn_code,
            P.[Last Purchase Type] as last_purchase_type,
            P.[Supplier Name] as supplier_name,
            P.[Last Purchase Qty] as last_purchase_qty,
            P.[Last Purchase Date] as last_purchase_date,
            P.[Voucher Number] as voucher_number
        FROM dbo.Products P
        WHERE P.[Mfr ID] = ?
    """,
    "get_all_items": """
        SELECT DISTINCT TOP 1000
            P.[Si No] as item_id,
            P.[Mfr ID] as item_code,
            P.[Product] as item_name,
            COALESCE(P.[Mannual Barcode], P.[Autobarcode]) as barcode,
            P.[Si No] as batch_id,
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
        LEFT JOIN dbo.ProductBarcodes PBC ON PB.ProductBatchID = PBC.ProductBatchID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        LEFT JOIN dbo.ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID
        WHERE (P.ProductName LIKE ?
           OR P.ProductCode LIKE ?
           OR P.ItemAlias LIKE ?
           OR PB.MannualBarcode LIKE ?
           OR PBC.Barcode LIKE ?
           OR CAST(PB.AutoBarcode AS VARCHAR(50)) LIKE ?
           OR PG.GroupName LIKE ?)
          AND P.IsActive = 1
        ORDER BY
           CASE WHEN P.ProductName LIKE ? THEN 1
                WHEN P.ProductCode LIKE ? THEN 2
                WHEN P.ItemAlias LIKE ? THEN 3
                ELSE 4 END,
           P.ProductName
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
        WHERE P.ProductID = ? OR P.ProductCode = ?
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
