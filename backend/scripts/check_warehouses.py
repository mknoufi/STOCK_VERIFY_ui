import os
import sys

# Add project root to path to allow 'from backend.xxx' imports
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.config import settings
from backend.sql_server_connector import SQLServerConnector


def main():
    connector = SQLServerConnector()
    try:
        print("Connecting to SQL Server...")
        connector.connect(
            host=settings.SQL_SERVER_HOST,
            port=settings.SQL_SERVER_PORT,
            database=settings.SQL_SERVER_DATABASE,
            user=settings.SQL_SERVER_USER,
            password=settings.SQL_SERVER_PASSWORD,
        )
        print("Connected.")

        print("Fetching warehouses...")
        warehouses = connector.get_all_warehouses()

        print(f"\nFound {len(warehouses)} warehouses:")
        print("-" * 50)
        for w in warehouses:
            print(f"ID: {w.get('warehouse_id')}, Name: {w.get('warehouse_name')}")
        print("-" * 50)

        # Simulate the filtering logic
        print("\nSimulating filtering logic:")

        showroom_matches = [
            w
            for w in warehouses
            if "floor" in w.get("warehouse_name", "").lower()
            or "showroom" in w.get("warehouse_name", "").lower()
        ]
        print(f"Showroom matches ('floor' or 'showroom'): {len(showroom_matches)}")
        for w in showroom_matches:
            print(f"  - {w.get('warehouse_name')}")

        godown_matches = [
            w for w in warehouses if "godown" in w.get("warehouse_name", "").lower()
        ]
        print(f"Godown matches ('godown'): {len(godown_matches)}")
        for w in godown_matches:
            print(f"  - {w.get('warehouse_name')}")

        others = [
            w
            for w in warehouses
            if w not in showroom_matches and w not in godown_matches
        ]
        print(f"Unmatched warehouses: {len(others)}")
        for w in others:
            print(f"  - {w.get('warehouse_name')}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        try:
            connector.disconnect()
        except Exception:
            pass


if __name__ == "__main__":
    main()
