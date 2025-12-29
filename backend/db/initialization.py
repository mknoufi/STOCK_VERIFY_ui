import logging
from datetime import datetime

from backend.utils.auth_utils import get_password_hash

logger = logging.getLogger(__name__)


async def init_default_users(db):
    """Create default users if they don't exist"""
    try:
        # Check for staff1
        staff_exists = await db.users.find_one({"username": "staff1"})
        if not staff_exists:
            await db.users.insert_one(
                {
                    "username": "staff1",
                    "hashed_password": get_password_hash("staff123"),
                    "full_name": "Staff Member",
                    "role": "staff",
                    "is_active": True,
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                }
            )
            logger.info("Default user created: staff1")

        # Check for supervisor
        supervisor_exists = await db.users.find_one({"username": "supervisor"})
        if not supervisor_exists:
            await db.users.insert_one(
                {
                    "username": "supervisor",
                    "hashed_password": get_password_hash("super123"),
                    "full_name": "Supervisor",
                    "role": "supervisor",
                    "is_active": True,
                    "permissions": [],
                    "created_at": datetime.utcnow(),
                }
            )
            logger.info("Default user created: supervisor")

        # Check for admin
        admin_exists = await db.users.find_one({"username": "admin"})
        if not admin_exists:
            await db.users.insert_one(
                {
                    "username": "admin",
                    "hashed_password": get_password_hash("admin123"),
                    "full_name": "Administrator",
                    "role": "admin",
                    "is_active": True,
                    "permissions": ["all"],
                    "created_at": datetime.utcnow(),
                }
            )
            logger.info("Default user created: admin")

    except Exception as e:
        logger.error(f"Error creating default users: {str(e)}")
        raise


async def init_mock_erp_data(db):
    try:
        count = await db.erp_items.count_documents({})
        if count == 0:
            mock_items = [
                {
                    "item_code": "ITEM001",
                    "item_name": "Rice Bag 25kg",
                    "barcode": "1234567890123",
                    "stock_qty": 150.0,
                    "mrp": 1200.0,
                    "category": "Food",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM002",
                    "item_name": "Cooking Oil 5L",
                    "barcode": "1234567890124",
                    "stock_qty": 80.0,
                    "mrp": 650.0,
                    "category": "Food",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM003",
                    "item_name": "Sugar 1kg",
                    "barcode": "1234567890125",
                    "stock_qty": 200.0,
                    "mrp": 50.0,
                    "category": "Food",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM004",
                    "item_name": "Tea Powder 250g",
                    "barcode": "1234567890126",
                    "stock_qty": 95.0,
                    "mrp": 180.0,
                    "category": "Beverages",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM005",
                    "item_name": "Soap Bar",
                    "barcode": "1234567890127",
                    "stock_qty": 300.0,
                    "mrp": 25.0,
                    "category": "Personal Care",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM006",
                    "item_name": "Shampoo 200ml",
                    "barcode": "1234567890128",
                    "stock_qty": 120.0,
                    "mrp": 150.0,
                    "category": "Personal Care",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM007",
                    "item_name": "Toothpaste",
                    "barcode": "1234567890129",
                    "stock_qty": 180.0,
                    "mrp": 75.0,
                    "category": "Personal Care",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM008",
                    "item_name": "Wheat Flour 10kg",
                    "barcode": "1234567890130",
                    "stock_qty": 90.0,
                    "mrp": 400.0,
                    "category": "Food",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM009",
                    "item_name": "Detergent Powder 1kg",
                    "barcode": "1234567890131",
                    "stock_qty": 110.0,
                    "mrp": 120.0,
                    "category": "Household",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM010",
                    "item_name": "Biscuits Pack",
                    "barcode": "1234567890132",
                    "stock_qty": 250.0,
                    "mrp": 30.0,
                    "category": "Snacks",
                    "warehouse": "Main",
                },
                {
                    "item_code": "ITEM_TEST_E2E",
                    "item_name": "E2E Test Item",
                    "barcode": "513456",
                    "stock_qty": 100.0,
                    "mrp": 999.0,
                    "category": "Test",
                    "warehouse": "Main",
                },
            ]
            await db.erp_items.insert_many(mock_items)
            logging.info("Mock ERP data initialized")
    except Exception as e:
        logger.error(f"Error initializing mock ERP data: {str(e)}")
