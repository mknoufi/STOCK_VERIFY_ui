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
    "subcategory": "SubProductGroupID",  # Subcategory mapping
    "location": "WarehouseID",
    "item_id": "ProductID",
    "mrp": "SalePrice",  # MRP/Sale Price from Products or ProductBatches
    "warehouse": "WarehouseName",  # Warehouse name from join
    "floor": "Floor",  # Floor from Shelfs or Warehouses
    "rack": "Rack",  # Rack from Shelfs
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
        SELECT TOP 1
            P.ProductID as item_id,
            P.ProductCode as item_code,
            COALESCE(PB.RefItemName, P.ProductName) as item_name,
            CAST(PB.AutoBarcode AS VARCHAR(50)) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            W.WarehouseID as warehouse_id,
            COALESCE(W.WarehouseName, 'Main') as warehouse,
            COALESCE(PB.MRP, PB.StdSalesPrice, P.LastSalesRate, 0.0) as mrp,
            COALESCE(PG.GroupName, CAST(P.ProductGroupID AS NVARCHAR(50)), 'General') as category,
            COALESCE(SPG.SubGroupName, CAST(P.SubProductGroupID AS NVARCHAR(50)), '') as subcategory,
            COALESCE(S.Floor, W.Floor, '') as floor,
            COALESCE(S.Rack, S.ShelfName, '') as rack
        FROM dbo.Products P
        INNER JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.ProductBarcodes PBC ON PB.ProductBatchID = PBC.ProductBatchID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        LEFT JOIN dbo.ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID
        LEFT JOIN dbo.SubProductGroups SPG ON P.SubProductGroupID = SPG.SubProductGroupID
        LEFT JOIN dbo.Shelfs S ON PB.ShelfID = S.ShelfID
        WHERE CAST(PB.AutoBarcode AS VARCHAR(50)) = ?
           OR PB.MannualBarcode = ?
           OR PBC.Barcode = ?
           OR P.ProductCode = ?
        ORDER BY PB.Stock DESC
        -- Prioritizes: 1) AutoBarcode (primary), 2) Manual Barcode, 3) ProductBarcodes, 4) ProductCode
    """,
    "get_item_by_code": """
        SELECT DISTINCT
            P.ProductID as item_id,
            P.ProductCode as item_code,
            COALESCE(PB.RefItemName, P.ProductName) as item_name,
            CAST(PB.AutoBarcode AS VARCHAR(50)) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            W.WarehouseID as warehouse_id,
            COALESCE(W.WarehouseName, 'Main') as warehouse,
            COALESCE(PB.MRP, PB.StdSalesPrice, P.LastSalesRate, 0.0) as mrp,
            COALESCE(PG.GroupName, CAST(P.ProductGroupID AS NVARCHAR(50)), 'General') as category,
            COALESCE(SPG.SubGroupName, CAST(P.SubProductGroupID AS NVARCHAR(50)), '') as subcategory,
            COALESCE(S.Floor, W.Floor, '') as floor,
            COALESCE(S.Rack, S.ShelfName, '') as rack
        FROM dbo.Products P
        INNER JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        LEFT JOIN dbo.ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID
        LEFT JOIN dbo.SubProductGroups SPG ON P.SubProductGroupID = SPG.SubProductGroupID
        LEFT JOIN dbo.Shelfs S ON PB.ShelfID = S.ShelfID
        WHERE P.ProductCode = ?
    """,
    "get_all_items": """
        SELECT DISTINCT TOP 10000
            P.ProductID as item_id,
            P.ProductCode as item_code,
            COALESCE(PB.RefItemName, P.ProductName) as item_name,
            CAST(PB.AutoBarcode AS VARCHAR(50)) as barcode,
            PB.MannualBarcode as manual_barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            W.WarehouseID as warehouse_id,
            COALESCE(W.WarehouseName, 'Main') as warehouse,
            COALESCE(PB.MRP, PB.StdSalesPrice, P.LastSalesRate, 0.0) as mrp,
            COALESCE(PG.GroupName, CAST(P.ProductGroupID AS NVARCHAR(50)), 'General') as category,
            COALESCE(SPG.SubGroupName, CAST(P.SubProductGroupID AS NVARCHAR(50)), '') as subcategory,
            COALESCE(S.Floor, W.Floor, '') as floor,
            COALESCE(S.Rack, S.ShelfName, '') as rack,
            COALESCE(P.ModifiedDate, P.CreatedDate, GETDATE()) as last_modified
        FROM dbo.Products P
        INNER JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        LEFT JOIN dbo.ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID
        LEFT JOIN dbo.SubProductGroups SPG ON P.SubProductGroupID = SPG.SubProductGroupID
        LEFT JOIN dbo.Shelfs S ON PB.ShelfID = S.ShelfID
        WHERE P.IsActive = 1 AND PB.AutoBarcode IS NOT NULL
        ORDER BY COALESCE(PB.RefItemName, P.ProductName)
    """,
    "search_items": """
        SELECT TOP 100
            P.ProductID as item_id,
            P.ProductCode as item_code,
            COALESCE(PB.RefItemName, P.ProductName) as item_name,
            CAST(PB.AutoBarcode AS VARCHAR(50)) as barcode,
            PB.ProductBatchID as batch_id,
            PB.BatchNo as batch_no,
            PB.MfgDate as mfg_date,
            PB.ExpiryDate as expiry_date,
            PB.Stock as stock_qty,
            P.BasicUnitID as uom_id,
            UOM.UnitCode as uom_code,
            UOM.UnitName as uom_name,
            W.WarehouseID as warehouse_id,
            COALESCE(W.WarehouseName, 'Main') as warehouse,
            COALESCE(PB.MRP, PB.StdSalesPrice, P.LastSalesRate, 0.0) as mrp,
            COALESCE(PG.GroupName, CAST(P.ProductGroupID AS NVARCHAR(50)), 'General') as category,
            COALESCE(SPG.SubGroupName, CAST(P.SubProductGroupID AS NVARCHAR(50)), '') as subcategory,
            COALESCE(S.Floor, W.Floor, '') as floor,
            COALESCE(S.Rack, S.ShelfName, '') as rack,
            P.ProductName as sort_name,
            P.ProductCode as sort_code,
            P.ItemAlias as sort_alias
        FROM dbo.Products P
        LEFT JOIN dbo.ProductBatches PB ON P.ProductID = PB.ProductID
        LEFT JOIN dbo.ProductBarcodes PBC ON PB.ProductBatchID = PBC.ProductBatchID
        LEFT JOIN dbo.UnitOfMeasures UOM ON P.BasicUnitID = UOM.UnitID
        LEFT JOIN dbo.Warehouses W ON PB.WarehouseID = W.WarehouseID
        LEFT JOIN dbo.ProductGroups PG ON P.ProductGroupID = PG.ProductGroupID
        LEFT JOIN dbo.SubProductGroups SPG ON P.SubProductGroupID = SPG.SubProductGroupID
        LEFT JOIN dbo.Shelfs S ON PB.ShelfID = S.ShelfID
        WHERE (P.ProductName LIKE ?
           OR P.ProductCode LIKE ?
           OR P.ItemAlias LIKE ?
           OR PB.MannualBarcode LIKE ?
           OR PBC.Barcode LIKE ?
           OR CAST(PB.AutoBarcode AS VARCHAR(50)) LIKE ?
           OR PG.GroupName LIKE ?)
          AND P.IsActive = 1
        ORDER BY
            CASE
                WHEN P.ProductName LIKE ? THEN 1
                WHEN P.ProductCode LIKE ? THEN 2
                WHEN P.ItemAlias LIKE ? THEN 3
                ELSE 4
            END,
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
