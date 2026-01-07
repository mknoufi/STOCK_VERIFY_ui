import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from pydantic import ValidationError  # noqa: E402

from backend.api.search_api import SearchItemResponse  # noqa: E402


def test_search_response_validation():
    print("Testing SearchItemResponse validation with data type inconsistencies...")

    test_data = {
        "id": "123",
        "item_name": "Test Item",
        "batch_id": 13212,  # Should be coerced to string
        "mrp": "299.99",  # Should be coerced to float
        "relevance_score": 1.0,
        "match_type": "barcode",
    }

    try:
        item = SearchItemResponse(**test_data)
        print("✓ Successfully initialized SearchItemResponse with inconsistent types.")
        print(f"  batch_id: {item.batch_id} (type: {type(item.batch_id)})")
        print(f"  mrp: {item.mrp} (type: {type(item.mrp)})")
    except ValidationError as e:
        print("✗ Validation failed:")
        print(e)
    except Exception as e:
        print(f"✗ An unexpected error occurred: {e}")


if __name__ == "__main__":
    test_search_response_validation()
