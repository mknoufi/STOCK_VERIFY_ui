#!/usr/bin/env python3
"""
Database Inspection Script for Lavanya E-Mart Stock Verification System
Run this to view all database contents in a readable format
"""

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]


async def inspect_database():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print("=" * 80)
    print("📊 LAVANYA E-MART STOCK VERIFICATION DATABASE")
    print("=" * 80)
    print(f"Database: {db_name}")
    print(f"Connection: {mongo_url}")
    print("=" * 80)
    print()

    # Get all collection names
    collections = await db.list_collection_names()
    print(f"📁 Collections: {', '.join(collections)}")
    print()

    # Users
    print("=" * 80)
    print("👥 USERS")
    print("=" * 80)
    users = await db.users.find({}, {"password": 0}).to_list(100)
    for user in users:
        print(f"  • {user['username']:15} | {user['full_name']:20} | Role: {user['role']}")
    print(f"  Total: {len(users)} users")
    print()

    # ERP Items
    print("=" * 80)
    print("📦 ERP ITEMS (Mock Data)")
    print("=" * 80)
    items = await db.erp_items.find().to_list(100)
    print(f"{'Code':<12} {'Name':<25} {'Barcode':<15} {'Stock':<8} {'MRP':<8}")
    print("-" * 80)
    for item in items:
        print(
            f"{item['item_code']:<12} {item['item_name']:<25} {item['barcode']:<15} {item['stock_qty']:<8.0f} ₹{item['mrp']:<8.0f}"
        )
    print(f"\nTotal: {len(items)} items")
    print()

    # Sessions
    print("=" * 80)
    print("📋 COUNTING SESSIONS")
    print("=" * 80)
    sessions = await db.sessions.find().to_list(100)
    if sessions:
        for session in sessions:
            print(f"  Session ID: {session['id']}")
            print(f"  Warehouse: {session['warehouse']}")
            print(f"  Staff: {session['staff_name']} ({session['staff_user']})")
            print(f"  Status: {session['status']}")
            print(f"  Items Counted: {session['total_items']}")
            print(f"  Total Variance: {session['total_variance']}")
            print(f"  Started: {session['started_at']}")
            print("-" * 80)
    else:
        print("  No sessions created yet")
    print(f"Total: {len(sessions)} sessions")
    print()

    # Count Lines
    print("=" * 80)
    print("📊 COUNT LINES")
    print("=" * 80)
    count_lines = await db.count_lines.find().to_list(100)
    if count_lines:
        for line in count_lines:
            variance_sign = "📈" if line["variance"] > 0 else "📉" if line["variance"] < 0 else "✅"
            status_icon = (
                "✅"
                if line["status"] == "approved"
                else "❌" if line["status"] == "rejected" else "⏳"
            )
            print(f"  {status_icon} {line['item_name']}")
            print(f"     Item Code: {line['item_code']}")
            print(
                f"     ERP Qty: {line['erp_qty']} | Counted: {line['counted_qty']} | Variance: {variance_sign} {line['variance']}"
            )
            if line.get("variance_reason"):
                print(f"     Reason: {line['variance_reason']}")
            print(f"     Status: {line['status']} | Counted by: {line['counted_by']}")
            print("-" * 80)
    else:
        print("  No count lines created yet")
    print(f"Total: {len(count_lines)} count lines")
    print()

    # Statistics
    print("=" * 80)
    print("📈 STATISTICS")
    print("=" * 80)
    total_variance = sum(abs(line["variance"]) for line in count_lines)
    approved_lines = len([l for l in count_lines if l["status"] == "approved"])
    rejected_lines = len([l for l in count_lines if l["status"] == "rejected"])
    pending_lines = len([l for l in count_lines if l["status"] == "pending"])

    print(f"  Total Users: {len(users)}")
    print(f"  Total ERP Items: {len(items)}")
    print(f"  Total Sessions: {len(sessions)}")
    print(f"  Total Count Lines: {len(count_lines)}")
    print(f"  Total Variance: {total_variance}")
    print(f"  Approved Lines: {approved_lines}")
    print(f"  Rejected Lines: {rejected_lines}")
    print(f"  Pending Lines: {pending_lines}")
    print()

    client.close()


if __name__ == "__main__":
    asyncio.run(inspect_database())
