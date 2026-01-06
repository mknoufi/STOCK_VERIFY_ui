"""
Scheduled Export Service
Automated periodic exports of data to CSV/Excel
"""

import asyncio
import csv
import io
import logging
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

UTC = timezone.utc

logger = logging.getLogger(__name__)


class ExportFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ExportFormat(str, Enum):
    CSV = "csv"
    JSON = "json"


class ScheduledExportService:
    """Service for scheduling and executing automated exports"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def create_export_schedule(
        self,
        name: str,
        export_type: str,  # "sessions", "count_lines", "variance_report", "activity_logs"
        frequency: ExportFrequency,
        format: ExportFormat,
        filters: dict[str, Optional[Any]] = None,
        email_recipients: Optional[list[str]] = None,
        created_by: Optional[str] = None,
    ) -> str:
        """Create a new export schedule"""
        schedule_doc = {
            "name": name,
            "export_type": export_type,
            "frequency": frequency.value,
            "format": format.value,
            "filters": filters or {},
            "email_recipients": email_recipients or [],
            "enabled": True,
            "last_run": None,
            "next_run": self._calculate_next_run(frequency),
            "created_by": created_by,
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
            "run_count": 0,
            "error_count": 0,
        }

        result = await self.db.export_schedules.insert_one(schedule_doc)
        logger.info(f"Created export schedule: {name} ({frequency.value})")

        return str(result.inserted_id)

    async def update_export_schedule(self, schedule_id: str, updates: dict[str, Any]) -> bool:
        """Update an existing export schedule"""
        updates["updated_at"] = datetime.now(UTC)

        # Recalculate next_run if frequency changed
        if "frequency" in updates:
            updates["next_run"] = self._calculate_next_run(ExportFrequency(updates["frequency"]))

        result = await self.db.export_schedules.update_one(
            {"_id": ObjectId(schedule_id)}, {"$set": updates}
        )

        return result.modified_count > 0

    async def delete_export_schedule(self, schedule_id: str) -> bool:
        """Delete an export schedule"""
        result = await self.db.export_schedules.delete_one({"_id": ObjectId(schedule_id)})
        return result.deleted_count > 0

    async def get_export_schedules(self, enabled_only: bool = False) -> list[dict[str, Any]]:
        """Get all export schedules"""
        query = {"enabled": True} if enabled_only else {}

        cursor = self.db.export_schedules.find(query).sort("created_at", -1)
        schedules = await cursor.to_list(length=100)

        # Convert ObjectId to string
        for schedule in schedules:
            schedule["id"] = str(schedule.pop("_id"))

        return schedules

    async def execute_export(self, schedule: dict[str, Any]) -> dict[str, Any]:
        """Execute a single export based on schedule"""
        try:
            export_type = schedule["export_type"]
            filters = schedule.get("filters", {})
            format_type = ExportFormat(schedule["format"])

            # Generate export data based on type
            if export_type == "sessions":
                data = await self._export_sessions(filters)
            elif export_type == "count_lines":
                data = await self._export_count_lines(filters)
            elif export_type == "variance_report":
                data = await self._export_variance_report(filters)
            elif export_type == "activity_logs":
                data = await self._export_activity_logs(filters)
            else:
                raise ValueError(f"Unknown export type: {export_type}")

            # Format data
            if format_type == ExportFormat.CSV:
                file_content = self._format_as_csv(data)
                file_extension = "csv"
            else:
                import json

                file_content = json.dumps(data, indent=2, default=str)
                file_extension = "json"

            # Store export result
            export_doc = {
                "schedule_id": schedule.get("_id") or schedule.get("id"),
                "schedule_name": schedule["name"],
                "export_type": export_type,
                "format": format_type.value,
                "file_content": file_content,
                "file_extension": file_extension,
                "row_count": len(data),
                "created_at": datetime.now(UTC),
                "size_bytes": len(file_content.encode("utf-8")),
            }

            result = await self.db.export_results.insert_one(export_doc)
            export_id = str(result.inserted_id)

            # Update schedule last_run and next_run
            await self.db.export_schedules.update_one(
                {"_id": schedule.get("_id") or ObjectId(schedule.get("id"))},
                {
                    "$set": {
                        "last_run": datetime.now(UTC),
                        "next_run": self._calculate_next_run(
                            ExportFrequency(schedule["frequency"])
                        ),
                        "updated_at": datetime.now(UTC),
                    },
                    "$inc": {"run_count": 1},
                },
            )

            logger.info(f"Export completed: {schedule['name']} - {len(data)} rows")

            return {
                "success": True,
                "export_id": export_id,
                "row_count": len(data),
                "size_bytes": export_doc["size_bytes"],
            }

        except Exception as e:
            logger.error(f"Export failed for {schedule['name']}: {str(e)}")

            # Update error count
            await self.db.export_schedules.update_one(
                {"_id": schedule.get("_id") or ObjectId(schedule.get("id"))},
                {"$inc": {"error_count": 1}},
            )

            return {"success": False, "error": str(e)}

    async def _export_sessions(self, filters: dict[str, Any]) -> list[dict]:
        """Export sessions data"""
        query = {}

        # Apply filters
        if "status" in filters:
            query["status"] = filters["status"]
        if "start_date" in filters:
            query["start_time"] = {"$gte": datetime.fromisoformat(filters["start_date"])}
        if "end_date" in filters:
            query.setdefault("start_time", {})["$lte"] = datetime.fromisoformat(filters["end_date"])

        cursor = self.db.sessions.find(query).sort("start_time", -1)
        sessions = await cursor.to_list(length=10000)

        # Format for export
        export_data = []
        for session in sessions:
            export_data.append(
                {
                    "session_id": str(session["_id"]),
                    "warehouse": session.get("warehouse"),
                    "staff_user": session.get("staff_user"),
                    "staff_name": session.get("staff_name"),
                    "status": session.get("status"),
                    "start_time": session.get("start_time"),
                    "end_time": session.get("end_time"),
                    "items_counted": session.get("items_counted", 0),
                    "total_variance": session.get("total_variance", 0.0),
                }
            )

        return export_data

    async def _export_count_lines(self, filters: dict[str, Any]) -> list[dict]:
        """Export count lines data"""
        query = {}

        if "session_id" in filters:
            query["session_id"] = filters["session_id"]
        if "has_variance" in filters and filters["has_variance"]:
            query["variance"] = {"$ne": 0}

        cursor = self.db.count_lines.find(query).sort("created_at", -1)
        lines = await cursor.to_list(length=10000)

        export_data = []
        for line in lines:
            export_data.append(
                {
                    "line_id": str(line["_id"]),
                    "session_id": line.get("session_id"),
                    "item_code": line.get("item_code"),
                    "item_name": line.get("item_name"),
                    "barcode": line.get("barcode"),
                    "system_stock": line.get("system_stock", 0),
                    "counted_qty": line.get("counted_qty", 0),
                    "variance": line.get("variance", 0),
                    "variance_reason": line.get("variance_reason"),
                    "counted_by": line.get("counted_by"),
                    "counted_at": line.get("counted_at"),
                }
            )

        return export_data

    async def _export_variance_report(self, filters: dict[str, Any]) -> list[dict]:
        """Export variance summary report"""
        # Aggregate variance data
        pipeline = [
            {"$match": {"variance": {"$ne": 0}}},
            {
                "$group": {
                    "_id": "$item_code",
                    "item_name": {"$first": "$item_name"},
                    "total_variance": {"$sum": "$variance"},
                    "occurrences": {"$sum": 1},
                    "last_counted": {"$max": "$counted_at"},
                }
            },
            {"$sort": {"total_variance": -1}},
        ]

        # Cast pipeline to proper type for motor
        from typing import Mapping, Sequence

        typed_pipeline: Sequence[Mapping[str, Any]] = pipeline  # type: ignore[assignment]
        results = await self.db.count_lines.aggregate(typed_pipeline).to_list(length=10000)

        export_data = []
        for result in results:
            export_data.append(
                {
                    "item_code": result["_id"],
                    "item_name": result.get("item_name"),
                    "total_variance": result.get("total_variance", 0),
                    "occurrences": result.get("occurrences", 0),
                    "last_counted": result.get("last_counted"),
                }
            )

        return export_data

    async def _export_activity_logs(self, filters: dict[str, Any]) -> list[dict]:
        """Export activity logs"""
        query = {}

        if "user" in filters:
            query["user"] = filters["user"]
        if "action" in filters:
            query["action"] = filters["action"]
        if "start_date" in filters:
            query["timestamp"] = {"$gte": datetime.fromisoformat(filters["start_date"])}

        cursor = self.db.activity_logs.find(query).sort("timestamp", -1)
        logs = await cursor.to_list(length=10000)

        export_data = []
        for log in logs:
            export_data.append(
                {
                    "timestamp": log.get("timestamp"),
                    "user": log.get("user"),
                    "role": log.get("role"),
                    "action": log.get("action"),
                    "entity_type": log.get("entity_type"),
                    "entity_id": log.get("entity_id"),
                    "details": str(log.get("details", {})),
                    "ip_address": log.get("ip_address"),
                }
            )

        return export_data

    def _format_as_csv(self, data: list[dict]) -> str:
        """Convert data to CSV format"""
        if not data:
            return ""

        output = io.StringIO()

        # Get headers from first row
        headers = list(data[0].keys())
        writer = csv.DictWriter(output, fieldnames=headers)

        writer.writeheader()
        writer.writerows(data)

        return output.getvalue()

    def _calculate_next_run(self, frequency: ExportFrequency) -> datetime:
        """Calculate next run time based on frequency"""
        now = datetime.now(UTC)

        if frequency == ExportFrequency.DAILY:
            # Run at midnight UTC
            next_run = now.replace(hour=0, minute=0, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
        elif frequency == ExportFrequency.WEEKLY:
            # Run on Sunday at midnight UTC
            days_until_sunday = (6 - now.weekday()) % 7
            if days_until_sunday == 0 and now.hour == 0:
                days_until_sunday = 7
            next_run = (now + timedelta(days=days_until_sunday)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        elif frequency == ExportFrequency.MONTHLY:
            # Run on 1st of next month at midnight UTC
            if now.month == 12:
                next_run = now.replace(
                    year=now.year + 1,
                    month=1,
                    day=1,
                    hour=0,
                    minute=0,
                    second=0,
                    microsecond=0,
                )
            else:
                next_run = now.replace(
                    month=now.month + 1,
                    day=1,
                    hour=0,
                    minute=0,
                    second=0,
                    microsecond=0,
                )
        else:
            next_run = now + timedelta(days=1)

        return next_run

    async def _run_scheduler(self):
        """Background task to run scheduled exports"""
        logger.info("Scheduled export service started")

        while self._running:
            try:
                # Find schedules due for execution
                now = datetime.now(UTC)
                due_schedules = await self.db.export_schedules.find(
                    {"enabled": True, "next_run": {"$lte": now}}
                ).to_list(length=100)

                # Execute each due schedule
                for schedule in due_schedules:
                    await self.execute_export(schedule)

                # Sleep for 1 minute before checking again
                await asyncio.sleep(60)

            except Exception as e:
                logger.error(f"Error in export scheduler: {str(e)}")
                await asyncio.sleep(60)

    def start(self):
        """Start the scheduled export service"""
        if self._running:
            logger.warning("Scheduled export service already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_scheduler())
        logger.info("Scheduled export service started")

    async def stop(self):
        """Stop the scheduled export service"""
        if not self._running:
            return

        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Scheduled export service stopped")
