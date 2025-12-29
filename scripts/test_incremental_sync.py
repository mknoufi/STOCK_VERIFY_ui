import asyncio
import os
import sys
import logging
from datetime import datetime, timedelta
from unittest.mock import MagicMock

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings
from backend.services.sql_sync_service import SQLSyncService
from backend.sql_server_connector import SQLServerConnector

async def test_incremental_sync():
    # Configure logging
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    logger = logging.getLogger("backend.services.sql_sync_service")
    logger.setLevel(logging.INFO)

    print("Starting Incremental Sync Test (with Mocks)...")

    try:
        # Initialize services
        print("Connecting to MongoDB...")
        client = AsyncIOMotorClient(settings.MONGO_URL)
        mongo_db = client[settings.DB_NAME]
        print(f"Connected to MongoDB: {settings.DB_NAME}")

        print("Initializing SQL Connector (Mocked)...")
        sql_connector = SQLServerConnector()
        # Mock test_connection to return True
        sql_connector.test_connection = MagicMock(return_value=True)
        # Mock get_all_items to return empty list (to avoid actual SQL call)
        sql_connector.get_all_items = MagicMock(return_value=[])

        print("Initializing SQLSyncService...")
        sync_service = SQLSyncService(sql_connector, mongo_db)

        # Check current state in MongoDB
        print("Checking latest item in MongoDB...")
        latest_item = await mongo_db.erp_items.find_one(
            {"sql_modified_date": {"$ne": None}},
            sort=[("sql_modified_date", -1)]
        )

        if latest_item:
            print(f"Latest item in Mongo has sql_modified_date: {latest_item['sql_modified_date']}")
        else:
            print("No items with sql_modified_date found in Mongo.")

        # Trigger sync
        print("\nTriggering sync_quantities_only (Incremental Sync)...")
        result = await sync_service.sync_quantities_only()
        print(f"\nSync Result: {result}")

        # Verify mock call
        if sql_connector.get_all_items.called:
            args, kwargs = sql_connector.get_all_items.call_args
            print(f"\nSQL get_all_items was called with modified_since: {kwargs.get('modified_since')}")

    except Exception as e:
        print(f"\nSync failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_incremental_sync())
