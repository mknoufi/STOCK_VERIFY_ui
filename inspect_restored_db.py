import pymongo
from pymongo import MongoClient
import sys

def inspect_db():
    try:
        client = MongoClient('mongodb://localhost:27017/')
        # The repaired collections are likely in the 'local' database or 'test' database,
        # or maybe they are just in the database they belonged to if the catalog was partially recovered?
        # But I deleted the catalog, so they should be in 'local' as orphans?
        # Actually, mongod --repair on orphaned files usually puts them in a 'backup' database or keeps them in 'local'.

        print("Databases:", client.list_database_names())

        # Check 'local' database for orphaned collections
        db = client['local']
        collections = db.list_collection_names()
        print(f"Collections in 'local': {len(collections)}")

        for col_name in collections:
            if "orphan" in col_name:
                count = db[col_name].count_documents({})
                sample = db[col_name].find_one()
                print(f"Collection: {col_name}, Count: {count}")
                if sample:
                    print(f"  Sample keys: {list(sample.keys())}")
                    # Try to identify the collection based on keys
                    if "username" in sample and "hashed_password" in sample:
                        print("  -> IDENTIFIED: users")
                    elif "session_id" in sample:
                        print("  -> IDENTIFIED: sessions")
                    elif "item_code" in sample and "physical_count" in sample:
                        print("  -> IDENTIFIED: stock_counts")
                    elif "barcode" in sample and "description" in sample:
                        print("  -> IDENTIFIED: items")
                    elif "discrepancy_id" in sample:
                        print("  -> IDENTIFIED: discrepancies")

        # Check if 'stock_verify' database exists (it shouldn't, but let's check)
        if 'stock_verify' in client.list_database_names():
            print("Collections in 'stock_verify':", client['stock_verify'].list_collection_names())

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_db()
