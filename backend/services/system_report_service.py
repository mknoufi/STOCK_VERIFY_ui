import io
import logging
from datetime import datetime, timedelta

import pandas as pd

logger = logging.getLogger(__name__)


class SystemReportService:
    def __init__(self, db):
        self.db = db

    async def generate_report(self, report_id, start_date=None, end_date=None, format="json"):
        if report_id == "system_health":
            data = await self._get_system_health_data(start_date, end_date)
        elif report_id == "user_activity":
            data = await self._get_user_activity_data(start_date, end_date)
        elif report_id == "sync_history":
            data = await self._get_sync_history_data(start_date, end_date)
        elif report_id == "error_logs":
            data = await self._get_error_logs_data(start_date, end_date)
        elif report_id == "audit_trail":
            data = await self._get_audit_trail_data(start_date, end_date)
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
        # Mock implementation - replace with actual DB queries
        # In a real scenario, you would query a 'system_metrics' collection
        return [
            {
                "timestamp": datetime.now().isoformat(),
                "cpu_usage": 45,
                "memory_usage": 60,
                "active_connections": 12,
            },
            {
                "timestamp": (datetime.now() - timedelta(hours=1)).isoformat(),
                "cpu_usage": 40,
                "memory_usage": 58,
                "active_connections": 10,
            },
        ]

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
        # Assuming error logs are in a collection or filtered from logs
        # For now, returning mock data or empty list if collection doesn't exist
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
