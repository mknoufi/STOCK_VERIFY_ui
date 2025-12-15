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
    "categories": "ProductGroups",
    "subcategories": "ProductCategory",
    "gst_categories": "GSTCategory",
    "departments": "Departments",
}

# Column mappings for Products table
PRODUCTS_COLUMN_MAP = {
    "item_code": "ProductCode",
    "item_name": "ProductName",
    "barcode": "ProductCode",  # Default to ProductCode, will be enhanced with ProductBarcodes
    "stock_qty": "Stock",
    "uom_code": "BasicUnitID",
    "uom_name": "UnitName",  # From UnitOfMeasures join
    "category": "ProductGroupID",  # FK to ProductGroups
    "subcategory": "ProductCategoryID",  # FK to ProductCategory
    "hsn_code": "HSNCode",
    "gst_category_id": "GSTTaxCategoryID",  # FK to GSTCategory
    "location": "WarehouseID",
    "item_id": "ProductID",
}

# Column mappings for ProductBatches table
BATCH_COLUMN_MAP = {
    "batch_id": "ProductBatchID",
    "item_code": "ProductID",
    "batch_no": "BatchNo",
    "barcode": "AutoBarcode",  # Use AutoBarcode (6-digit) as primary barcode
    # "manual_barcode": "MannualBarcode",  # Removed - not used
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
            CAST(PB.AutoBarcode AS VARCHAR(50)) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            PB.MRP as mrp,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            PG.GroupName as category,
            PC.ProductCategoryName as subcategory,
            P.HSNCode as hsn_code,
            GST.GSTCategoryName as gst_category,
            COALESCE(GST.Sales_SGSTPerc, 0) + COALESCE(GST.Sales_CGSTPerc, 0) as gst_percent,
            GST.Sales_SGSTPerc as sgst_percent,
            GST.Sales_CGSTPerc as cgst_percent,
            GST.Sales_IGSTPerc as igst_percent,
            W.WarehouseID as warehouse_id,
            W.WarehouseName as location
        FROM dbo.Products P
        LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID
        LEFT JOIN dbo.ProductCategory PC ON P.ProductCategoryID = PC.ProductCategoryID
        LEFT JOIN dbo.GSTCategory GST ON P.GSTTaxCategoryID = GST.GSTCategoryID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        WHERE CAST(PB.AutoBarcode AS VARCHAR(50)) = %s
          AND LEN(CAST(PB.AutoBarcode AS VARCHAR(50))) = 6
          AND ISNUMERIC(CAST(PB.AutoBarcode AS VARCHAR(50))) = 1
    """,
    "get_item_by_code": """
        SELECT DISTINCT
            P.ProductID as item_id,
            P.ProductCode as item_code,
            P.ProductName as item_name,
            CAST(PB.AutoBarcode AS VARCHAR(50)) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            PB.MRP as mrp,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            PG.GroupName as category,
            PC.ProductCategoryName as subcategory,
            P.HSNCode as hsn_code,
            GST.GSTCategoryName as gst_category,
            COALESCE(GST.Sales_SGSTPerc, 0) + COALESCE(GST.Sales_CGSTPerc, 0) as gst_percent,
            GST.Sales_SGSTPerc as sgst_percent,
            GST.Sales_CGSTPerc as cgst_percent,
            GST.Sales_IGSTPerc as igst_percent,
            W.WarehouseID as warehouse_id,
            W.WarehouseName as location
        FROM dbo.Products P
        LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID
        LEFT JOIN dbo.ProductCategory PC ON P.ProductCategoryID = PC.ProductCategoryID
        LEFT JOIN dbo.GSTCategory GST ON P.GSTTaxCategoryID = GST.GSTCategoryID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        WHERE P.ProductCode = %s
          AND PB.AutoBarcode IS NOT NULL
          AND LEN(CAST(PB.AutoBarcode AS VARCHAR(50))) = 6
    """,
    "get_all_items": """
        SELECT DISTINCT TOP 1000
            P.ProductID as item_id,
            P.ProductCode as item_code,
            P.ProductName as item_name,
            CAST(PB.AutoBarcode AS VARCHAR(50)) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            PB.MRP as mrp,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            PG.GroupName as category,
            PC.ProductCategoryName as subcategory,
            P.HSNCode as hsn_code,
            GST.GSTCategoryName as gst_category,
            COALESCE(GST.Sales_SGSTPerc, 0) + COALESCE(GST.Sales_CGSTPerc, 0) as gst_percent,
            GST.Sales_SGSTPerc as sgst_percent,
            GST.Sales_CGSTPerc as cgst_percent,
            GST.Sales_IGSTPerc as igst_percent,
            W.WarehouseID as warehouse_id,
            W.WarehouseName as location
        FROM dbo.Products P
        LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID
        LEFT JOIN dbo.ProductCategory PC ON P.ProductCategoryID = PC.ProductCategoryID
        LEFT JOIN dbo.GSTCategory GST ON P.GSTTaxCategoryID = GST.GSTCategoryID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        WHERE P.IsActive = 1
          AND PB.AutoBarcode IS NOT NULL
          AND LEN(CAST(PB.AutoBarcode AS VARCHAR(50))) = 6
          AND ISNUMERIC(CAST(PB.AutoBarcode AS VARCHAR(50))) = 1
        ORDER BY P.ProductName
    """,
    "search_items": """
        SELECT DISTINCT TOP 50
            P.ProductID as item_id,
            P.ProductCode as item_code,
            P.ProductName as item_name,
            CAST(PB.AutoBarcode AS VARCHAR(50)) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            PB.MRP as mrp,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            PG.GroupName as category,
            PC.ProductCategoryName as subcategory,
            P.HSNCode as hsn_code,
            GST.GSTCategoryName as gst_category,
            COALESCE(GST.Sales_SGSTPerc, 0) + COALESCE(GST.Sales_CGSTPerc, 0) as gst_percent,
            GST.Sales_SGSTPerc as sgst_percent,
            GST.Sales_CGSTPerc as cgst_percent,
            GST.Sales_IGSTPerc as igst_percent,
            W.WarehouseID as warehouse_id,
            W.WarehouseName as location
        FROM dbo.Products P
        LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID
        LEFT JOIN dbo.ProductCategory PC ON P.ProductCategoryID = PC.ProductCategoryID
        LEFT JOIN dbo.GSTCategory GST ON P.GSTTaxCategoryID = GST.GSTCategoryID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        WHERE (P.ProductName LIKE %s
           OR P.ProductCode LIKE %s
           OR CAST(PB.AutoBarcode AS VARCHAR(50)) LIKE %s)
          AND P.IsActive = 1
          AND PB.AutoBarcode IS NOT NULL
          AND LEN(CAST(PB.AutoBarcode AS VARCHAR(50))) = 6
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
