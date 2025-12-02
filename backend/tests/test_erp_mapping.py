from backend.utils.erp_utils import _map_erp_item_to_schema


def test_map_erp_item_to_schema_with_manual_barcode():
    """Test mapping ERP item with manual barcode"""
    erp_item = {
        "item_code": "TEST001",
        "item_name": "Test Item",
        "barcode": "AUTO123",
        "manual_barcode": "MANUAL123",
        "stock_qty": 10.0,
        "mrp": 100.0,
        "category": "General",
        "subcategory": "Sub",
        "warehouse": "Main",
        "uom_code": "PCS",
        "uom_name": "Pieces",
        "floor": "1",
        "rack": "A",
    }

    mapped_item = _map_erp_item_to_schema(erp_item)

    assert mapped_item["item_code"] == "TEST001"
    assert mapped_item["item_name"] == "Test Item"
    assert mapped_item["barcode"] == "AUTO123"
    assert mapped_item["manual_barcode"] == "MANUAL123"
    assert mapped_item["stock_qty"] == 10.0
    assert mapped_item["mrp"] == 100.0
    assert mapped_item["category"] == "General"
    assert mapped_item["subcategory"] == "Sub"
    assert mapped_item["warehouse"] == "Main"
    assert mapped_item["uom_code"] == "PCS"
    assert mapped_item["uom_name"] == "Pieces"
    assert mapped_item["floor"] == "1"
    assert mapped_item["rack"] == "A"


def test_map_erp_item_to_schema_without_manual_barcode():
    """Test mapping ERP item without manual barcode"""
    erp_item = {
        "item_code": "TEST002",
        "item_name": "Test Item 2",
        "barcode": "AUTO456",
        # manual_barcode missing
    }

    mapped_item = _map_erp_item_to_schema(erp_item)

    assert mapped_item["item_code"] == "TEST002"
    assert mapped_item["barcode"] == "AUTO456"
    assert mapped_item["manual_barcode"] == ""  # Should default to empty string
