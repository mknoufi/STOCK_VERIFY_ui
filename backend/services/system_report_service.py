import io
import logging
from datetime import datetime, timedelta

import pandas as pd

logger = logging.getLogger(__name__)


class SystemReportService:
    def __init__(self, db):
        self.db = db

    async def generate_report(self, report_id, start_date=None, end_date=None, format="json"):
        if report_id == "system_health" or report_id == "system_metrics":
            data = await self._get_system_health_data(start_date, end_date)
        elif report_id == "user_activity":
            data = await self._get_user_activity_data(start_date, end_date)
        elif report_id == "sync_history":
            data = await self._get_sync_history_data(start_date, end_date)
        elif report_id == "error_logs":
            data = await self._get_error_logs_data(start_date, end_date)
        elif report_id == "audit_trail":
            data = await self._get_audit_trail_data(start_date, end_date)
        elif report_id == "items_inventory":
            data = await self._get_items_inventory_data(start_date, end_date)
        elif report_id == "items_verification":
            data = await self._get_items_verification_data(start_date, end_date)
        elif report_id == "purchase_summary":
            data = await self._get_purchase_summary_data(start_date, end_date)
        else:
            raise ValueError(f"Unknown report ID: {report_id}")

        if format == "json":
            return data
        elif format == "csv":
            return self._to_csv(data)
        elif format == "excel":
            return self._to_excel(data)
        else:
            raise ValueError(f"Unsupported format: {format}")

    async def _get_system_health_data(self, start_date, end_date):
        # Query real system metrics from database or collect live metrics
        import psutil

        try:
            # Collect current system metrics
            cpu_usage = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            memory_usage = memory.percent

            # Get MongoDB connection count
            try:
                server_status = await self.db.command("serverStatus")
                active_connections = server_status.get("connections", {}).get("current", 0)
            except Exception:
                active_connections = 0

            # Try to get historical metrics from database if available
            historical_data = []
            try:
                cursor = self.db.system_metrics.find({}).sort("timestamp", -1).limit(24)
                historical_data = await cursor.to_list(length=24)
            except Exception:
                pass  # Collection may not exist

            # Return current metrics plus historical if available
            current_metrics = {
                "timestamp": datetime.now().isoformat(),
                "cpu_usage": cpu_usage,
                "memory_usage": memory_usage,
                "active_connections": active_connections,
                "disk_usage": psutil.disk_usage('/').percent if hasattr(psutil, 'disk_usage') else 0,
            }

            if historical_data:
                return [current_metrics] + [
                    {
                        "timestamp": m.get("timestamp", "").isoformat() if hasattr(m.get("timestamp", ""), "isoformat") else str(m.get("timestamp", "")),
                        "cpu_usage": m.get("cpu_usage", 0),
                        "memory_usage": m.get("memory_usage", 0),
                        "active_connections": m.get("active_connections", 0),
                    }
                    for m in historical_data
                ]
            else:
                return [current_metrics]
        except Exception as e:
            logger.warning(f"Error collecting system metrics: {e}")
            # Return empty data instead of mock data
            return []

    async def _get_user_activity_data(self, start_date, end_date):
        query = {}
        if start_date:
            query["timestamp"] = {"$gte": start_date}

        cursor = self.db.login_history.find(query).sort("timestamp", -1).limit(100)
        logs = await cursor.to_list(length=100)

        # Transform for report
        return [
            {
                "username": log.get("username"),
                "action": "login",
                "status": log.get("status"),
                "ip_address": log.get("ip_address"),
                "timestamp": log.get("timestamp"),
            }
            for log in logs
        ]

    async def _get_sync_history_data(self, start_date, end_date):
        cursor = self.db.sync_history.find({}).sort("timestamp", -1).limit(100)
        logs = await cursor.to_list(length=100)
        return [
            {
                "sync_type": log.get("type"),
                "status": log.get("status"),
                "items_processed": log.get("items_processed", 0),
                "duration_ms": log.get("duration_ms"),
                "timestamp": log.get("timestamp"),
            }
            for log in logs
        ]

    async def _get_error_logs_data(self, start_date, end_date):
        # Query actual error logs from database
        try:
            query = {}
            if start_date:
                query["timestamp"] = {"$gte": start_date}
            if end_date:
                if "timestamp" in query:
                    query["timestamp"]["$lte"] = end_date
                else:
                    query["timestamp"] = {"$lte": end_date}

            cursor = self.db.error_logs.find(query).sort("timestamp", -1).limit(100)
            logs = await cursor.to_list(length=100)

            return [
                {
                    "error_type": log.get("error_type", "unknown"),
                    "message": log.get("message", ""),
                    "stack_trace": log.get("stack_trace", ""),
                    "endpoint": log.get("endpoint", ""),
                    "user": log.get("user", ""),
                    "timestamp": log.get("timestamp").isoformat() if hasattr(log.get("timestamp"), "isoformat") else str(log.get("timestamp", "")),
                }
                for log in logs
            ]
        except Exception as e:
            logger.warning(f"Error fetching error logs: {e}")
            return []

    async def _get_audit_trail_data(self, start_date, end_date):
        cursor = self.db.audit_logs.find({}).sort("timestamp", -1).limit(100)
        logs = await cursor.to_list(length=100)
        return [
            {
                "action": log.get("action"),
                "user": log.get("user"),
                "details": str(log.get("details", "")),
                "timestamp": log.get("timestamp"),
            }
            for log in logs
        ]

    async def _get_items_inventory_data(self, start_date, end_date):
        """Get complete items inventory with purchase details from real database"""
        try:
            query = {}
            cursor = self.db.erp_items.find(query).limit(5000)
            items = await cursor.to_list(length=5000)

            return [
                {
                    "item_code": item.get("item_code", ""),
                    "item_name": item.get("item_name", ""),
                    "barcode": item.get("barcode", ""),
                    "stock_qty": item.get("stock_qty", 0),
                    "mrp": item.get("mrp", 0),
                    "category": item.get("category", ""),
                    "subcategory": item.get("subcategory", ""),
                    "warehouse": item.get("warehouse", ""),
                    "floor": item.get("floor", ""),
                    "rack": item.get("rack", ""),
                    "uom_code": item.get("uom_code", ""),
                    # Purchase fields
                    "last_purchase_price": item.get("last_purchase_price"),
                    "gst_percentage": item.get("gst_percentage"),
                    "hsn_code": item.get("hsn_code", ""),
                    "last_purchase_type": item.get("last_purchase_type", ""),
                    "supplier_name": item.get("supplier_name", ""),
                    "last_purchase_qty": item.get("last_purchase_qty"),
                    "last_purchase_date": item.get("last_purchase_date").isoformat() if hasattr(item.get("last_purchase_date"), "isoformat") else item.get("last_purchase_date"),
                    "voucher_number": item.get("voucher_number", ""),
                    "last_synced": item.get("last_synced").isoformat() if hasattr(item.get("last_synced"), "isoformat") else item.get("last_synced"),
                }
                for item in items
            ]
        except Exception as e:
            logger.error(f"Error fetching items inventory: {e}")
            return []

    async def _get_items_verification_data(self, start_date, end_date):
        """Get items verification report with variance details from real database"""
        try:
            query = {}
            if start_date:
                query["verified_at"] = {"$gte": start_date}

            # Get items with verification data
            cursor = self.db.erp_items.find(
                {"verified": True} if not query else {**query, "verified": True}
            ).limit(5000)
            items = await cursor.to_list(length=5000)

            return [
                {
                    "item_code": item.get("item_code", ""),
                    "item_name": item.get("item_name", ""),
                    "barcode": item.get("barcode", ""),
                    "system_qty": item.get("stock_qty", 0),
                    "verified_qty": item.get("verified_qty"),
                    "variance": item.get("variance"),
                    "damaged_qty": item.get("damaged_qty"),
                    "verified": item.get("verified", False),
                    "verified_by": item.get("verified_by", ""),
                    "verified_at": item.get("verified_at").isoformat() if hasattr(item.get("verified_at"), "isoformat") else item.get("verified_at"),
                    "category": item.get("category", ""),
                    "warehouse": item.get("warehouse", ""),
                    "floor": item.get("floor", ""),
                    "rack": item.get("rack", ""),
                    # Include purchase info for context
                    "mrp": item.get("mrp", 0),
                    "last_purchase_price": item.get("last_purchase_price"),
                    "gst_percentage": item.get("gst_percentage"),
                }
                for item in items
            ]
        except Exception as e:
            logger.error(f"Error fetching items verification data: {e}")
            return []

    async def _get_purchase_summary_data(self, start_date, end_date):
        """Get purchase summary report with supplier and pricing details from real database"""
        try:
            # Get items with purchase data
            query = {"last_purchase_price": {"$exists": True, "$ne": None}}
            cursor = self.db.erp_items.find(query).sort("last_purchase_date", -1).limit(5000)
            items = await cursor.to_list(length=5000)

            return [
                {
                    "item_code": item.get("item_code", ""),
                    "item_name": item.get("item_name", ""),
                    "last_purchase_price": item.get("last_purchase_price"),
                    "mrp": item.get("mrp", 0),
                    "gst_percentage": item.get("gst_percentage"),
                    "hsn_code": item.get("hsn_code", ""),
                    "last_purchase_type": item.get("last_purchase_type", ""),
                    "supplier_name": item.get("supplier_name", ""),
                    "last_purchase_qty": item.get("last_purchase_qty"),
                    "last_purchase_date": item.get("last_purchase_date").isoformat() if hasattr(item.get("last_purchase_date"), "isoformat") else item.get("last_purchase_date"),
                    "voucher_number": item.get("voucher_number", ""),
                    "current_stock": item.get("stock_qty", 0),
                    "category": item.get("category", ""),
                }
                for item in items
            ]
        except Exception as e:
            logger.error(f"Error fetching purchase summary data: {e}")
            return []

    def _to_csv(self, data):
        if not data:
            return ""
        df = pd.DataFrame(data)
        return df.to_csv(index=False)

    def _to_excel(self, data):
        if not data:
            return b""
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
            df = pd.DataFrame(data)
            df.to_excel(writer, index=False)
        return output.getvalue()
