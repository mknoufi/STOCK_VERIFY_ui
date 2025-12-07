#!/usr/bin/env python3
"""
Quick import script for PolosysExport.xlsx
Prioritizes Auto Barcode over Manual Barcode
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from pymongo import MongoClient
from datetime import datetime

def main():
    # Find Excel file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_path = os.path.join(script_dir, "../../PolosysExport.xlsx")

    if not os.path.exists(excel_path):
        print(f"Excel file not found: {excel_path}")
        return

    print(f"Reading {excel_path}...")
    df = pd.read_excel(excel_path)
    print(f"Found {len(df)} rows")

    # Connect to MongoDB
    client = MongoClient("mongodb://localhost:27017")
    db = client.stock_verify
    collection = db.erp_items

    # Clear existing data
    collection.delete_many({})
    print("Cleared existing data")

    count = 0
    batch = []

    def safe_float(val, default=0.0):
        try:
            if pd.isna(val):
                return default
            return float(val)
        except:
            return default

    for idx, row in df.iterrows():
        try:
            product_name = str(row.get("Product", "")).strip()
            if not product_name or product_name == "nan":
                continue

            # Barcode priority: Auto -> Manual -> PLU -> Mfr ID
            barcode = None

            # Try Autobarcode first (primary)
            auto_bc = row.get("Autobarcode")
            if pd.notna(auto_bc) and str(auto_bc).strip() and str(auto_bc).strip() != "0":
                barcode = str(int(float(auto_bc)))

            # Fallback to Manual
            if not barcode:
                manual_bc = row.get("Mannual Barcode")
                if pd.notna(manual_bc) and str(manual_bc).strip() and str(manual_bc).strip() != "nan":
                    barcode = str(manual_bc).strip()

            # Fallback to PLU
            if not barcode:
                plu = row.get("PLU Code")
                if pd.notna(plu) and str(plu).strip() and str(plu).strip() != "0":
                    barcode = str(plu).strip()

            # Fallback to Si No
            if not barcode:
                si_no = row.get("Si No")
                if pd.notna(si_no):
                    barcode = f"SINO-{int(si_no)}"

            if not barcode:
                continue

            # Item code from Si No
            item_code = str(int(row.get("Si No"))) if pd.notna(row.get("Si No")) else barcode

            # All barcode types
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

            # GST
            gst_val = row.get("GST Category Name", "")
            gst_pct = 0.0
            if isinstance(gst_val, str):
                gst_val = gst_val.replace("%", "").replace("n", "").strip()
                try:
                    gst_pct = float(gst_val) if gst_val else 0.0
                except:
                    pass

            item = {
                "item_code": item_code,
                "item_name": product_name,
                "barcode": barcode,
                "auto_barcode": auto_barcode_val,
                "manual_barcode": manual_barcode_val,
                "plu_code": plu_code_val,
                "stock_qty": safe_float(row.get("Stock")),
                "mrp": safe_float(row.get("MRP")),
                "sales_price": safe_float(row.get("Std Sales Price")),
                "last_purchase_price": safe_float(row.get("Last Purchase Cost")),
                "gst_percentage": gst_pct,
                "hsn_code": str(row.get("HSN Code", "")).strip() if pd.notna(row.get("HSN Code")) else "",
                "category": str(row.get("Category", "General")).strip() if pd.notna(row.get("Category")) else "General",
                "subcategory": str(row.get("Sub Category", "")).strip() if pd.notna(row.get("Sub Category")) else "",
                "warehouse": str(row.get("Department", "")).strip() if pd.notna(row.get("Department")) else "",
                "location": str(row.get("Department", "")).strip() if pd.notna(row.get("Department")) else "",
                "uom_code": str(row.get("Unit", "")).strip() if pd.notna(row.get("Unit")) else "",
                "uom_name": str(row.get("Unit", "")).strip() if pd.notna(row.get("Unit")) else "",
                "brand": str(row.get("Brand", "")).strip() if pd.notna(row.get("Brand")) else "",
                "item_alias": str(row.get("Item Alias", "")).strip() if pd.notna(row.get("Item Alias")) else "",
                "verified": False,
                "last_synced": datetime.utcnow(),
                "source": "excel_import"
            }

            batch.append(item)
            count += 1

            if len(batch) >= 500:
                collection.insert_many(batch)
                print(f"Inserted {count} items...")
                batch = []

        except Exception as e:
            print(f"Error on row {idx}: {e}")

    # Insert remaining
    if batch:
        collection.insert_many(batch)

    print(f"\nImport complete! Total: {count} items")

    # Create indexes
    print("Creating indexes...")
    collection.create_index("barcode")
    collection.create_index("auto_barcode")
    collection.create_index("manual_barcode")
    collection.create_index("item_code")
    collection.create_index("category")
    collection.create_index("subcategory")

    # Verify
    total = collection.count_documents({})
    print(f"Total documents: {total}")

    # Sample output
    print("\n=== SAMPLE ITEMS ===")
    for item in collection.find().limit(5):
        name = item.get("item_name", "")[:25]
        bc = item.get("barcode", "")
        auto = item.get("auto_barcode", "N/A")
        cat = item.get("category", "")
        print(f"  {name:25} | barcode: {bc:15} | auto: {str(auto):10} | cat: {cat}")

    client.close()

if __name__ == "__main__":
    main()
