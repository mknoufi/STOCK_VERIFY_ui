from pymongo import MongoClient
import json
from bson import json_util
import os

# Connect to local MongoDB
client = MongoClient("mongodb://localhost:27017/")

# Try to find the correct DB
db_names = client.list_database_names()
target_db_name = "stock_verify"

if "stock_verify" not in db_names:
    print(f"Warning: 'stock_verify' not found in {db_names}. checking for alternatives...")
    for name in db_names:
        if "stock" in name or "verify" in name:
            target_db_name = name
            break

print(f"Using Database: {target_db_name}")
db = client[target_db_name]

# Check if collection exists
if "erp_items" not in db.list_collection_names():
    print("Error: 'erp_items' collection not found.")
    exit(1)

# Query for the item
barcode = "523215"
item = db.erp_items.find_one({"barcode": barcode})

if item:
    print(f"\n✅ Item Found (Barcode: {barcode}):")
    print(json.dumps(item, default=json_util.default, indent=2))
else:
    print(f"\n❌ Item NOT Found (Barcode: {barcode})")
    print("\nSample items in DB:")
    for doc in db.erp_items.find().limit(3):
        print(json.dumps(doc, default=json_util.default, indent=2))
