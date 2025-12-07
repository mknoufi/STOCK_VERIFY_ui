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

            # Barcode logic: Autobarcode (priority) -> Mannual Barcode -> PLU Code
            barcode = None

            # Try Autobarcode first (primary barcode)
            auto_bc = row.get("Autobarcode")
            if pd.notna(auto_bc) and str(auto_bc).strip() and str(auto_bc).strip() != "0":
                barcode = str(int(float(auto_bc)))

            # Fallback to Manual Barcode
            if not barcode:
                manual_bc = row.get("Mannual Barcode")
                if pd.notna(manual_bc) and str(manual_bc).strip() and str(manual_bc).strip() != "nan":
                    barcode = str(manual_bc).strip()

            # Fallback to PLU Code
            if not barcode:
                plu = row.get("PLU Code")
                if pd.notna(plu) and str(plu).strip() and str(plu).strip() != "0":
                    barcode = str(plu).strip()

            if not barcode:
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

            try:
                last_purchase_price = float(row.get("Last Purchase Cost", 0))
            except (ValueError, TypeError):
                last_purchase_price = 0.0

            # Parse GST percentage
            gst_val = row.get("GST Category Name", "")
            gst_pct = 0.0
            if isinstance(gst_val, str):
                gst_val = gst_val.replace("%", "").replace("n", "").strip()
                try:
                    gst_pct = float(gst_val) if gst_val else 0.0
                except:
                    gst_pct = 0.0
            elif pd.notna(gst_val):
                try:
                    gst_pct = float(gst_val)
                except:
                    pass

            # Store all barcode types
            auto_barcode_val = None
            if pd.notna(row.get("Autobarcode")) and str(row.get("Autobarcode")).strip() != "0":
                try:
                    auto_barcode_val = str(int(float(row.get("Autobarcode"))))
                except:
                    pass

            manual_barcode_val = None
            if pd.notna(row.get("Mannual Barcode")) and str(row.get("Mannual Barcode")).strip():
                manual_barcode_val = str(row.get("Mannual Barcode")).strip()

            plu_code_val = None
            if pd.notna(row.get("PLU Code")) and str(row.get("PLU Code")).strip() != "0":
                plu_code_val = str(row.get("PLU Code")).strip()

            item_doc = {
                "item_code": item_code,
                "item_name": product_name,
                "barcode": barcode,
                "auto_barcode": auto_barcode_val,
                "manual_barcode": manual_barcode_val,
                "plu_code": plu_code_val,
                "sql_server_qty": stock,
                "stock_qty": stock,
                "mrp": mrp,
                "sales_price": sales_price,
                "last_purchase_price": last_purchase_price,
                "gst_percentage": gst_pct,
                "category": str(row.get("Category", "General")).strip() if pd.notna(row.get("Category")) else "General",
                "subcategory": str(row.get("Sub Category", "")).strip() if pd.notna(row.get("Sub Category")) else "",
                "brand": str(row.get("Brand", "")).strip() if pd.notna(row.get("Brand")) else "",
                "uom_code": str(row.get("Unit", "")).strip() if pd.notna(row.get("Unit")) else "",
                "uom_name": str(row.get("Unit", "")).strip() if pd.notna(row.get("Unit")) else "",
                "hsn_code": str(row.get("HSN Code", "")).strip() if pd.notna(row.get("HSN Code")) else "",
                "warehouse": str(row.get("Department", "")).strip() if pd.notna(row.get("Department")) else "",
                "location": str(row.get("Department", "")).strip() if pd.notna(row.get("Department")) else "",
                "item_alias": str(row.get("Item Alias", "")).strip() if pd.notna(row.get("Item Alias")) else "",
                "verified": False,
                "last_synced": datetime.utcnow(),
                "source": "excel_import",
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

    # Create indexes for better query performance
    print("Creating indexes...")
    collection.create_index("barcode")
    collection.create_index("auto_barcode")
    collection.create_index("manual_barcode")
    collection.create_index("item_code")
    collection.create_index("category")
    collection.create_index("subcategory")
    print("Indexes created successfully")

    # Show sample items
    print("\n=== SAMPLE ITEMS (showing barcode source) ===")
    for item in collection.find().limit(5):
        name = item.get("item_name", "")[:30]
        bc = item.get("barcode", "")
        auto = item.get("auto_barcode", "N/A")
        cat = item.get("category", "")
        print(f"  {name:30} | barcode: {bc} | auto: {auto} | cat: {cat}")


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
