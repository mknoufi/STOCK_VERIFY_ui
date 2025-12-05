"""
Dynamic Report Generation Service
Generate custom reports with user-defined fields and filters
"""

import io
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, cast

import pandas as pd
from bson import ObjectId

logger = logging.getLogger(__name__)


class DynamicReportService:
    """
    Service for generating dynamic reports with custom fields and formats
    """

    def __init__(self, db):
        self.db = db
        self.report_templates = db.report_templates
        self.generated_reports = db.generated_reports

    async def create_report_template(
        self,
        name: str,
        description: str,
        report_type: str,
        fields: List[Dict[str, Any]],
        filters: Optional[Dict[str, Any]] = None,
        grouping: Optional[List[str]] = None,
        sorting: Optional[List[Dict[str, str]]] = None,
        aggregations: Optional[Dict[str, str]] = None,
        format: str = "excel",
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new report template

        Args:
            name: Template name
            description: Template description
            report_type: Type (items, sessions, variance, audit, custom)
            fields: List of fields to include with config
            filters: Filter criteria
            grouping: Fields to group by
            sorting: Sort configuration
            aggregations: Aggregation functions (sum, avg, count, etc.)
            format: Output format (excel, csv, pdf, json)
            created_by: Username of creator

        Returns:
            Created template
        """
        try:
            template = {
                "name": name,
                "description": description,
                "report_type": report_type,
                "fields": fields,
                "filters": filters or {},
                "grouping": grouping or [],
                "sorting": sorting or [],
                "aggregations": aggregations or {},
                "format": format,
                "created_by": created_by,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "enabled": True,
                "usage_count": 0,
            }

            result = await self.report_templates.insert_one(template)
            template["_id"] = result.inserted_id

            logger.info(f"Created report template: {name}")
            return template

        except Exception as e:
            logger.error(f"Error creating report template: {str(e)}")
            raise

    async def get_report_templates(self, report_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all report templates"""
        try:
            query: Dict[str, Any] = {"enabled": True}
            if report_type:
                query["report_type"] = report_type

            cursor = self.report_templates.find(query).sort("name", 1)
            templates = await cursor.to_list(length=None)

            return cast(List[Dict[str, Any]], templates)

        except Exception as e:
            logger.error(f"Error getting report templates: {str(e)}")
            raise

    async def generate_report(
        self,
        template_id: Optional[str] = None,
        template_data: Optional[Dict[str, Any]] = None,
        runtime_filters: Optional[Dict[str, Any]] = None,
        generated_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a report from template or custom data

        Args:
            template_id: ID of saved template
            template_data: Custom template data (if not using saved template)
            runtime_filters: Additional filters to apply at runtime
            generated_by: Username of generator

        Returns:
            Generated report info with download link
        """
        try:
            # Get template
            if template_id:
                template = await self.report_templates.find_one({"_id": ObjectId(template_id)})
                if not template:
                    raise ValueError(f"Template not found: {template_id}")
            elif template_data:
                template = template_data
            else:
                raise ValueError("Either template_id or template_data must be provided")

            # Merge runtime filters with template filters
            filters = {**template.get("filters", {}), **(runtime_filters or {})}

            # Fetch data based on report type
            data = await self._fetch_report_data(
                report_type=template["report_type"],
                fields=template["fields"],
                filters=filters,
                grouping=template.get("grouping", []),
                sorting=template.get("sorting", []),
            )

            # Apply aggregations
            if template.get("aggregations"):
                data = self._apply_aggregations(
                    data, template["aggregations"], template.get("grouping", [])
                )

            # Generate file in specified format
            file_data, file_name, mime_type = await self._generate_file(
                data=data,
                format=template.get("format", "excel"),
                template_name=template.get("name", "report"),
                fields=template["fields"],
            )

            # Save report record
            report_record = {
                "template_id": template_id if template_id else None,
                "template_name": template.get("name", "Custom Report"),
                "report_type": template["report_type"],
                "filters_applied": filters,
                "record_count": len(data) if isinstance(data, list) else 0,
                "file_name": file_name,
                "file_size": len(file_data) if file_data else 0,
                "mime_type": mime_type,
                "format": template.get("format", "excel"),
                "generated_by": generated_by,
                "generated_at": datetime.utcnow(),
                "download_count": 0,
            }

            result = await self.generated_reports.insert_one(report_record)
            report_id = result.inserted_id

            # Store file data (in production, use cloud storage)
            await self.db.report_files.insert_one(
                {
                    "report_id": report_id,
                    "file_data": file_data,
                    "created_at": datetime.utcnow(),
                }
            )

            # Update template usage count
            if template_id:
                await self.report_templates.update_one(
                    {"_id": ObjectId(template_id)}, {"$inc": {"usage_count": 1}}
                )

            report_record["_id"] = report_id
            logger.info(f"Generated report: {file_name}")

            return report_record

        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            raise

    async def _fetch_report_data(
        self,
        report_type: str,
        fields: List[Dict[str, Any]],
        filters: Dict[str, Any],
        grouping: List[str],
        sorting: List[Dict[str, str]],
    ) -> List[Dict[str, Any]]:
        """Fetch data for report based on type and configuration"""
        try:
            if report_type == "items":
                return await self._fetch_items_data(fields, filters, sorting)
            elif report_type == "sessions":
                return await self._fetch_sessions_data(fields, filters, sorting)
            elif report_type == "variance":
                return await self._fetch_variance_data(fields, filters, sorting)
            elif report_type == "audit":
                return await self._fetch_audit_data(fields, filters, sorting)
            elif report_type == "custom":
                return await self._fetch_custom_data(fields, filters, sorting)
            else:
                raise ValueError(f"Unknown report type: {report_type}")

        except Exception as e:
            logger.error(f"Error fetching report data: {str(e)}")
            raise

    async def _fetch_items_data(
        self,
        fields: List[Dict[str, Any]],
        filters: Dict[str, Any],
        sorting: List[Dict[str, str]],
    ) -> List[Dict[str, Any]]:
        """Fetch items data with dynamic fields"""
        try:
            # Build MongoDB query
            query = self._build_mongo_query(filters)

            # Build projection
            projection = {}
            field_names = [f["name"] for f in fields if f.get("source") != "dynamic"]
            for field_name in field_names:
                projection[field_name] = 1

            # Fetch items
            cursor = self.db.items.find(query, projection)

            # Apply sorting
            if sorting:
                for sort_field in sorting:
                    cursor = cursor.sort(
                        sort_field["field"], 1 if sort_field["order"] == "asc" else -1
                    )

            items = await cursor.to_list(length=10000)

            # Add dynamic fields
            dynamic_fields = [f for f in fields if f.get("source") == "dynamic"]
            if dynamic_fields:
                for item in items:
                    dynamic_values = await self.db.dynamic_field_values.find(
                        {"item_code": item.get("item_code")}
                    ).to_list(length=None)

                    for dv in dynamic_values:
                        item[dv["field_name"]] = dv["value"]

            return cast(List[Dict[str, Any]], items)

        except Exception as e:
            logger.error(f"Error fetching items data: {str(e)}")
            raise

    async def _fetch_sessions_data(
        self,
        fields: List[Dict[str, Any]],
        filters: Dict[str, Any],
        sorting: List[Dict[str, str]],
    ) -> List[Dict[str, Any]]:
        """Fetch sessions data"""
        try:
            query = self._build_mongo_query(filters)

            cursor = self.db.sessions.find(query)

            if sorting:
                for sort_field in sorting:
                    cursor = cursor.sort(
                        sort_field["field"], 1 if sort_field["order"] == "asc" else -1
                    )

            sessions = await cursor.to_list(length=10000)

            # Enrich with related data if needed
            for session in sessions:
                # Add item details if requested
                if any(f["name"].startswith("items.") for f in fields):
                    items = await self.db.session_items.find(
                        {"session_id": session["_id"]}
                    ).to_list(length=None)
                    session["items"] = items

            return cast(List[Dict[str, Any]], sessions)

        except Exception as e:
            logger.error(f"Error fetching sessions data: {str(e)}")
            raise

    async def _fetch_variance_data(
        self,
        fields: List[Dict[str, Any]],
        filters: Dict[str, Any],
        sorting: List[Dict[str, str]],
    ) -> List[Dict[str, Any]]:
        """Fetch variance analysis data"""
        try:
            # Aggregate variance from sessions and items
            pipeline = [
                {"$match": self._build_mongo_query(filters)},
                {
                    "$lookup": {
                        "from": "session_items",
                        "localField": "_id",
                        "foreignField": "session_id",
                        "as": "items",
                    }
                },
                {"$unwind": "$items"},
                {
                    "$group": {
                        "_id": {
                            "session_id": "$_id",
                            "warehouse": "$warehouse",
                            "item_code": "$items.item_code",
                        },
                        "expected_quantity": {"$first": "$items.expected_quantity"},
                        "counted_quantity": {"$first": "$items.counted_quantity"},
                        "variance": {"$first": "$items.variance"},
                        "session_date": {"$first": "$started_at"},
                    }
                },
            ]

            cursor = self.db.sessions.aggregate(pipeline)
            data = await cursor.to_list(length=10000)

            # Flatten the grouped data
            flattened = []
            for record in data:
                flattened.append(
                    {
                        **record["_id"],
                        "expected_quantity": record["expected_quantity"],
                        "counted_quantity": record["counted_quantity"],
                        "variance": record["variance"],
                        "session_date": record["session_date"],
                    }
                )

            return flattened

        except Exception as e:
            logger.error(f"Error fetching variance data: {str(e)}")
            raise

    async def _fetch_audit_data(
        self,
        fields: List[Dict[str, Any]],
        filters: Dict[str, Any],
        sorting: List[Dict[str, str]],
    ) -> List[Dict[str, Any]]:
        """Fetch audit log data"""
        try:
            query = self._build_mongo_query(filters)

            cursor = self.db.activity_logs.find(query)

            if sorting:
                for sort_field in sorting:
                    cursor = cursor.sort(
                        sort_field["field"], 1 if sort_field["order"] == "asc" else -1
                    )

            logs = await cursor.to_list(length=10000)
            return cast(List[Dict[str, Any]], logs)

        except Exception as e:
            logger.error(f"Error fetching audit data: {str(e)}")
            raise

    async def _fetch_custom_data(
        self,
        fields: List[Dict[str, Any]],
        filters: Dict[str, Any],
        sorting: List[Dict[str, str]],
    ) -> List[Dict[str, Any]]:
        """Fetch custom aggregated data"""
        # Custom aggregation logic based on fields configuration
        return []

    def _build_mongo_query(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Build MongoDB query from filter configuration"""
        query = {}

        for field, condition in filters.items():
            if isinstance(condition, dict):
                # Complex condition (e.g., {"$gte": 10, "$lte": 100})
                query[field] = condition
            elif isinstance(condition, list):
                # IN condition
                query[field] = {"$in": condition}
            else:
                # Exact match
                query[field] = condition

        return query

    def _apply_aggregations(
        self,
        data: List[Dict[str, Any]],
        aggregations: Dict[str, str],
        grouping: List[str],
    ) -> List[Dict[str, Any]]:
        """Apply aggregation functions to data"""
        if not grouping:
            return data

        # Use pandas for easy aggregation
        df = pd.DataFrame(data)

        # Build aggregation dict for pandas
        agg_dict = {}
        for field, func in aggregations.items():
            if func in ["sum", "mean", "min", "max", "count"]:
                agg_dict[field] = func

        if agg_dict:
            grouped = df.groupby(grouping).agg(agg_dict).reset_index()
            return cast(List[Dict[str, Any]], grouped.to_dict("records"))

        return data

    async def _generate_file(
        self,
        data: List[Dict[str, Any]],
        format: str,
        template_name: str,
        fields: List[Dict[str, Any]],
    ) -> tuple:
        """Generate report file in specified format"""
        try:
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

            if format == "excel":
                return self._generate_excel(data, template_name, timestamp, fields)
            elif format == "csv":
                return self._generate_csv(data, template_name, timestamp, fields)
            elif format == "json":
                return self._generate_json(data, template_name, timestamp)
            elif format == "pdf":
                return self._generate_pdf(data, template_name, timestamp, fields)
            else:
                raise ValueError(f"Unsupported format: {format}")

        except Exception as e:
            logger.error(f"Error generating file: {str(e)}")
            raise

    def _generate_excel(
        self,
        data: List[Dict[str, Any]],
        template_name: str,
        timestamp: str,
        fields: List[Dict[str, Any]],
    ) -> tuple:
        """Generate Excel file"""
        df = pd.DataFrame(data)

        # Reorder columns based on fields configuration
        if fields:
            ordered_columns = [f["name"] for f in fields if f["name"] in df.columns]
            df = df[ordered_columns]

        # Rename columns based on display labels
        if fields:
            rename_map = {f["name"]: f.get("label", f["name"]) for f in fields}
            df = df.rename(columns=rename_map)

        # Generate Excel file
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Report")

            # Auto-adjust column widths
            worksheet = writer.sheets["Report"]
            for idx, col in enumerate(df.columns):
                max_length = max(df[col].astype(str).apply(len).max(), len(str(col)))
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_length + 2, 50)

        file_data = output.getvalue()
        file_name = f"{template_name}_{timestamp}.xlsx"
        mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        return file_data, file_name, mime_type

    def _generate_csv(
        self,
        data: List[Dict[str, Any]],
        template_name: str,
        timestamp: str,
        fields: List[Dict[str, Any]],
    ) -> tuple:
        """Generate CSV file"""
        df = pd.DataFrame(data)

        # Reorder and rename columns
        if fields:
            ordered_columns = [f["name"] for f in fields if f["name"] in df.columns]
            df = df[ordered_columns]
            rename_map = {f["name"]: f.get("label", f["name"]) for f in fields}
            df = df.rename(columns=rename_map)

        file_data = df.to_csv(index=False).encode("utf-8")
        file_name = f"{template_name}_{timestamp}.csv"
        mime_type = "text/csv"

        return file_data, file_name, mime_type

    def _generate_json(
        self, data: List[Dict[str, Any]], template_name: str, timestamp: str
    ) -> tuple:
        """Generate JSON file"""

        # Convert ObjectId and datetime to strings
        def convert_types(obj):
            if isinstance(obj, ObjectId):
                return str(obj)
            elif isinstance(obj, datetime):
                return obj.isoformat()
            return obj

        json_data = json.dumps(data, default=convert_types, indent=2)
        file_data = json_data.encode("utf-8")
        file_name = f"{template_name}_{timestamp}.json"
        mime_type = "application/json"

        return file_data, file_name, mime_type

    def _generate_pdf(
        self,
        data: List[Dict[str, Any]],
        template_name: str,
        timestamp: str,
        fields: List[Dict[str, Any]],
    ) -> tuple:
        """Generate PDF file (basic implementation)"""
        # For production, use reportlab or weasyprint
        # This is a placeholder
        file_name = f"{template_name}_{timestamp}.pdf"
        mime_type = "application/pdf"
        file_data = b"PDF generation not yet implemented"

        return file_data, file_name, mime_type

    async def get_generated_reports(
        self, generated_by: Optional[str] = None, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get list of generated reports"""
        try:
            query = {}
            if generated_by:
                query["generated_by"] = generated_by

            cursor = self.generated_reports.find(query).sort("generated_at", -1).limit(limit)
            reports = await cursor.to_list(length=None)

            return cast(List[Dict[str, Any]], reports)

        except Exception as e:
            logger.error(f"Error getting generated reports: {str(e)}")
            raise

    async def get_report_file(self, report_id: str) -> tuple:
        """Get report file data for download"""
        try:
            report = await self.generated_reports.find_one({"_id": ObjectId(report_id)})
            if not report:
                raise ValueError(f"Report not found: {report_id}")

            file_record = await self.db.report_files.find_one({"report_id": ObjectId(report_id)})
            if not file_record:
                raise ValueError(f"Report file not found: {report_id}")

            # Increment download count
            await self.generated_reports.update_one(
                {"_id": ObjectId(report_id)}, {"$inc": {"download_count": 1}}
            )

            return file_record["file_data"], report["file_name"], report["mime_type"]

        except Exception as e:
            logger.error(f"Error getting report file: {str(e)}")
            raise
