import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from pydantic import ValidationError  # noqa: E402

from backend.api.schemas import ERPItem  # noqa: E402


def test_erp_item_validation():
    print("Testing ERPItem validation with data type inconsistencies...")

    test_data = {
        "id": "123",
        "item_name": "Test Item",
        "item_code": 12345,  # Should be coerced to string
        "batch_id": 13212,  # Should be coerced to string
        "mrp": "299.99",  # Should be coerced to float
        "stock_qty": None,  # Should be coerced to 0.0
    }

    try:
        item = ERPItem(**test_data)
        print("✓ Successfully initialized ERPItem with inconsistent types.")
        print(f"  item_code: {item.item_code} (type: {type(item.item_code)})")
        print(f"  batch_id: {item.batch_id} (type: {type(item.batch_id)})")
        print(f"  mrp: {item.mrp} (type: {type(item.mrp)})")
        print(f"  stock_qty: {item.stock_qty} (type: {type(item.stock_qty)})")
    except ValidationError as e:
        print("✗ Validation failed:")
        print(e)
    except Exception as e:
        print(f"✗ An unexpected error occurred: {e}")


if __name__ == "__main__":
    test_erp_item_validation()
