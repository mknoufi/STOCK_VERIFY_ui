#!/usr/bin/env python3
"""
Check MongoDB collections to determine if old collections exist and contain data.
Compares old naming (verification_sessions/verification_records) vs new (sessions/count_lines).
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings


async def check_collections():
    """Check which collections exist and their document counts."""
    
    print("=" * 80)
    print("🔍 MongoDB Collection Analysis")
    print("=" * 80)
    print(f"\nConnecting to: {settings.DB_NAME}")
    print(f"Mongo URL: {settings.MONGO_URL.split('@')[0]}@***")  # Hide credentials
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DB_NAME]
    
    try:
        # Get all collection names
        all_collections = await db.list_collection_names()
        print(f"\n✅ Connected successfully")
        print(f"\n📊 Total collections: {len(all_collections)}")
        print(f"\nAll collections:")
        for coll in sorted(all_collections):
            count = await db[coll].count_documents({})
            print(f"  - {coll}: {count:,} documents")
        
        print("\n" + "=" * 80)
        print("🎯 Collection Name Analysis (Old vs New)")
        print("=" * 80)
        
        # Check for old collections
        old_collections = {
            "verification_sessions": "sessions",
            "verification_records": "count_lines"
        }
        
        found_issues = False
        
        for old_name, new_name in old_collections.items():
            print(f"\n📋 Checking: {old_name} → {new_name}")
            
            old_exists = old_name in all_collections
            new_exists = new_name in all_collections
            
            if old_exists:
                old_count = await db[old_name].count_documents({})
                print(f"  ❌ OLD '{old_name}' EXISTS: {old_count:,} documents")
                
                # Get sample document
                sample = await db[old_name].find_one()
                if sample:
                    print(f"     Sample fields: {list(sample.keys())[:10]}")
                found_issues = True
            else:
                print(f"  ✅ OLD '{old_name}' DOES NOT EXIST")
            
            if new_exists:
                new_count = await db[new_name].count_documents({})
                print(f"  ✅ NEW '{new_name}' EXISTS: {new_count:,} documents")
                
                # Get sample document
                sample = await db[new_name].find_one()
                if sample:
                    print(f"     Sample fields: {list(sample.keys())[:10]}")
            else:
                print(f"  ❌ NEW '{new_name}' DOES NOT EXIST")
                found_issues = True
        
        print("\n" + "=" * 80)
        print("📝 Summary & Recommendations")
        print("=" * 80)
        
        verification_sessions_exists = "verification_sessions" in all_collections
        verification_records_exists = "verification_records" in all_collections
        sessions_exists = "sessions" in all_collections
        count_lines_exists = "count_lines" in all_collections
        
        if verification_sessions_exists or verification_records_exists:
            print("\n⚠️  OLD COLLECTIONS DETECTED:")
            if verification_sessions_exists:
                count = await db.verification_sessions.count_documents({})
                print(f"   - verification_sessions: {count:,} documents")
            if verification_records_exists:
                count = await db.verification_records.count_documents({})
                print(f"   - verification_records: {count:,} documents")
            
            if sessions_exists or count_lines_exists:
                print("\n✅ NEW COLLECTIONS ALSO EXIST:")
                if sessions_exists:
                    count = await db.sessions.count_documents({})
                    print(f"   - sessions: {count:,} documents")
                if count_lines_exists:
                    count = await db.count_lines.count_documents({})
                    print(f"   - count_lines: {count:,} documents")
                
                print("\n🔧 RECOMMENDATION:")
                print("   1. DATA MIGRATION NEEDED")
                print("   2. Both old and new collections exist")
                print("   3. Need to merge/consolidate data")
                print("   4. Update all code references to use new collections")
                print("   5. Archive old collections after verification")
            else:
                print("\n🔧 RECOMMENDATION:")
                print("   1. SIMPLE RENAME")
                print("   2. Old collections exist, new collections don't")
                print("   3. Can rename collections in MongoDB")
                print("   4. Update all code references")
        else:
            print("\n✅ CLEAN STATE:")
            print("   - No old collections found")
            print("   - Only need to update code references")
            print("   - No data migration needed")
        
        # Check for any data in old collections if they exist
        if verification_sessions_exists or verification_records_exists:
            print("\n" + "=" * 80)
            print("📊 Data Comparison (if both old and new exist)")
            print("=" * 80)
            
            if verification_sessions_exists and sessions_exists:
                old_count = await db.verification_sessions.count_documents({})
                new_count = await db.sessions.count_documents({})
                print(f"\nSessions:")
                print(f"  OLD (verification_sessions): {old_count:,}")
                print(f"  NEW (sessions): {new_count:,}")
                print(f"  Difference: {abs(old_count - new_count):,}")
                
                if old_count > 0 and new_count > 0:
                    # Check for ID overlap
                    old_sample = await db.verification_sessions.find_one()
                    new_sample = await db.sessions.find_one()
                    if old_sample and new_sample:
                        print(f"\n  Schema comparison:")
                        print(f"    OLD fields: {list(old_sample.keys())}")
                        print(f"    NEW fields: {list(new_sample.keys())}")
            
            if verification_records_exists and count_lines_exists:
                old_count = await db.verification_records.count_documents({})
                new_count = await db.count_lines.count_documents({})
                print(f"\nRecords:")
                print(f"  OLD (verification_records): {old_count:,}")
                print(f"  NEW (count_lines): {new_count:,}")
                print(f"  Difference: {abs(old_count - new_count):,}")
                
                if old_count > 0 and new_count > 0:
                    # Check for ID overlap
                    old_sample = await db.verification_records.find_one()
                    new_sample = await db.count_lines.find_one()
                    if old_sample and new_sample:
                        print(f"\n  Schema comparison:")
                        print(f"    OLD fields: {list(old_sample.keys())}")
                        print(f"    NEW fields: {list(new_sample.keys())}")
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()
        print("\n✅ Connection closed")


if __name__ == "__main__":
    asyncio.run(check_collections())
