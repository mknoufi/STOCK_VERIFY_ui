import pandas as pd
import os
import sys
from pymongo import MongoClient
from datetime import datetime

# Add project root to path to allow importing backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from backend.config import settings


def import_excel_data(file_path):
    print(f"Reading Excel file: {file_path}")
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return

    print(f"Found {len(df)} rows.")

    # Connect to MongoDB
    try:
        client: MongoClient = MongoClient(settings.MONGO_URL)
        db = client[settings.DB_NAME]
        collection = db["erp_items"]
        print(f"Connected to MongoDB at {settings.MONGO_URL}, DB: {settings.DB_NAME}")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return

    count = 0
    updated = 0

    for index, row in df.iterrows():
        try:
            # Extract fields
            product_name = str(row.get("Product", "")).strip()
            if not product_name or product_name == "nan":
                continue

            # Barcode logic: Mannual Barcode -> Autobarcode -> PLU Code
            barcode = str(row.get("Mannual Barcode", "")).strip()
            if not barcode or barcode == "nan":
                barcode = str(row.get("Autobarcode", "")).strip()
            if not barcode or barcode == "nan":
                barcode = str(row.get("PLU Code", "")).strip()

            if not barcode or barcode == "nan":
                # Skip items without any barcode/identifier?
                # Or use Si No as fallback?
                si_no = str(row.get("Si No", "")).strip()
                if si_no and si_no != "nan":
                    barcode = f"SINO-{si_no}"
                else:
                    continue

            # Item Code logic
            # Use Si No as item_code to ensure uniqueness, as Mfr ID has duplicates
            si_no_val = row.get("Si No", "")
            if pd.notna(si_no_val):
                item_code = str(int(si_no_val))
            else:
                # Fallback to Mfr ID or Barcode
                item_code = str(row.get("Mfr ID", "")).strip()
                if not item_code or item_code == "nan":
                    item_code = barcode

            # Clean up item_code (remove .0 if it was float)
            if item_code.endswith(".0"):
                item_code = item_code[:-2]

            # Numeric fields
            try:
                stock = float(row.get("Stock", 0))
            except (ValueError, TypeError):
                stock = 0.0

            try:
                mrp = float(row.get("MRP", 0))
            except (ValueError, TypeError):
                mrp = 0.0

            try:
                sales_price = float(row.get("Std Sales Price", 0))
            except (ValueError, TypeError):
                sales_price = 0.0

            item_doc = {
                "item_code": item_code,
                "item_name": product_name,
                "barcode": barcode,
                "sql_server_qty": stock,
                "stock_qty": stock,
                "mrp": mrp,
                "sales_price": sales_price,
                "category": str(row.get("Category", "General")).strip(),
                "subcategory": str(row.get("Sub Category", "")).strip(),
                "brand": str(row.get("Brand", "")).strip(),
                "uom": str(row.get("Unit", "")).strip(),
                "hsn_code": str(row.get("HSN Code", "")).strip(),
                "last_sync": datetime.utcnow(),
            }

            # Upsert based on barcode
            result = collection.update_one({"barcode": barcode}, {"$set": item_doc}, upsert=True)

            if result.upserted_id:
                count += 1
            else:
                updated += 1

            if index % 100 == 0:
                print(f"Processed {index} rows...")

        except Exception as e:
            print(f"Error processing row {index}: {e}")

    print(f"Import complete. Inserted: {count}, Updated: {updated}")


if __name__ == "__main__":
    # Assuming script is run from backend/scripts or root
    # Adjust path to find PolosysExport.xlsx in root
    excel_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../PolosysExport.xlsx")
    )

    if not os.path.exists(excel_path):
        print(f"File not found: {excel_path}")
        # Try current directory
        excel_path = "PolosysExport.xlsx"

    if os.path.exists(excel_path):
        import_excel_data(excel_path)
    else:
        print("Could not find PolosysExport.xlsx")
