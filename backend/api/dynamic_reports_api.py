"""
Dynamic Report Generation API
Endpoints for creating and generating custom reports
"""

import io
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.services.dynamic_report_service import DynamicReportService

logger = logging.getLogger(__name__)

dynamic_reports_router = APIRouter(prefix="/api/reports", tags=["dynamic-reports"])

# Global service instance
_dynamic_report_service = None


def get_dynamic_report_service() -> DynamicReportService:
    """Get global dynamic report service instance"""
    global _dynamic_report_service
    if _dynamic_report_service is None:
        from server import db

        _dynamic_report_service = DynamicReportService(db)
    return _dynamic_report_service


# Pydantic Models
class ReportField(BaseModel):
    name: str = Field(..., description="Field name")
    label: Optional[str] = Field(None, description="Display label")
    source: str = Field("database", description="Source: database or dynamic")
    format: Optional[str] = Field(None, description="Format specification")


class ReportTemplate(BaseModel):
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    report_type: str = Field(..., description="Report type")
    fields: List[ReportField] = Field(..., description="Fields to include")
    filters: Optional[Dict[str, Any]] = Field(None, description="Filter criteria")
    grouping: Optional[List[str]] = Field(None, description="Group by fields")
    sorting: Optional[List[Dict[str, str]]] = Field(None, description="Sort configuration")
    aggregations: Optional[Dict[str, str]] = Field(None, description="Aggregation functions")
    format: str = Field("excel", description="Output format")


class ReportGeneration(BaseModel):
    template_id: Optional[str] = Field(None, description="Template ID")
    template_data: Optional[ReportTemplate] = Field(None, description="Custom template")
    runtime_filters: Optional[Dict[str, Any]] = Field(None, description="Runtime filters")


@dynamic_reports_router.post("/templates")
async def create_report_template(
    template_data: ReportTemplate,
    current_user: dict = Depends(get_current_user),
    service: DynamicReportService = Depends(get_dynamic_report_service),
):
    """
    Create a new report template

    **Permissions Required:** manage_reports

    **Report Types:**
    - items: Item master data reports
    - sessions: Counting session reports
    - variance: Variance analysis reports
    - audit: Audit log reports
    - custom: Custom aggregated reports

    **Supported Formats:**
    - excel: Excel spreadsheet (.xlsx)
    - csv: Comma-separated values (.csv)
    - json: JSON format (.json)
    - pdf: PDF document (.pdf)

    **Example:**
    ```json
    {
      "name": "Monthly Variance Report",
      "description": "Variance analysis by warehouse",
      "report_type": "variance",
      "fields": [
        {"name": "warehouse", "label": "Warehouse"},
        {"name": "item_code", "label": "Item Code"},
        {"name": "variance", "label": "Variance"}
      ],
      "filters": {
        "session_date": {"$gte": "2025-01-01"}
      },
      "grouping": ["warehouse"],
      "aggregations": {
        "variance": "sum"
      },
      "format": "excel"
    }
    ```
    """
    try:
        template = await service.create_report_template(
            name=template_data.name,
            description=template_data.description,
            report_type=template_data.report_type,
            fields=[f.model_dump() for f in template_data.fields],
            filters=template_data.filters,
            grouping=template_data.grouping,
            sorting=template_data.sorting,
            aggregations=template_data.aggregations,
            format=template_data.format,
            created_by=current_user.get("username"),
        )

        return {
            "success": True,
            "message": "Report template created successfully",
            "template": template,
        }

    except Exception as e:
        logger.error(f"Error creating report template: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_reports_router.get("/templates")
async def get_report_templates(
    report_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    service: DynamicReportService = Depends(get_dynamic_report_service),
):
    """
    Get all report templates

    **Query Parameters:**
    - report_type: Filter by report type (optional)
    """
    try:
        templates = await service.get_report_templates(report_type=report_type)

        return {"success": True, "count": len(templates), "templates": templates}

    except Exception as e:
        logger.error(f"Error getting report templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_reports_router.post("/generate")
async def generate_report(
    generation_data: ReportGeneration,
    current_user: dict = Depends(get_current_user),
    service: DynamicReportService = Depends(get_dynamic_report_service),
):
    """
    Generate a report from template or custom data

    **Permissions Required:** generate_reports

    **Options:**
    1. Use saved template: Provide `template_id`
    2. Use custom template: Provide `template_data`
    3. Override filters: Provide `runtime_filters`

    **Example with Template:**
    ```json
    {
      "template_id": "507f1f77bcf86cd799439011",
      "runtime_filters": {
        "warehouse": "Main Warehouse"
      }
    }
    ```

    **Example with Custom Template:**
    ```json
    {
      "template_data": {
        "name": "Custom Report",
        "report_type": "items",
        "fields": [
          {"name": "item_code", "label": "Code"},
          {"name": "item_name", "label": "Name"}
        ],
        "format": "excel"
      }
    }
    ```

    **Returns:** Report metadata with download link
    """
    try:
        template_dict = None
        if generation_data.template_data:
            template_dict = generation_data.template_data.model_dump()
            template_dict["fields"] = [f.model_dump() for f in generation_data.template_data.fields]

        report = await service.generate_report(
            template_id=generation_data.template_id,
            template_data=template_dict,
            runtime_filters=generation_data.runtime_filters,
            generated_by=current_user.get("username"),
        )

        return {
            "success": True,
            "message": "Report generated successfully",
            "report": {
                "id": str(report["_id"]),
                "file_name": report["file_name"],
                "file_size": report["file_size"],
                "record_count": report["record_count"],
                "format": report["format"],
                "download_url": f"/api/reports/{str(report['_id'])}/download",
                "generated_at": report["generated_at"],
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_reports_router.get("/history")
async def get_generated_reports(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    service: DynamicReportService = Depends(get_dynamic_report_service),
):
    """
    Get history of generated reports

    **Query Parameters:**
    - limit: Maximum number of reports (default: 50)

    **Returns:** List of recently generated reports
    """
    try:
        reports = await service.get_generated_reports(
            generated_by=(
                current_user.get("username") if current_user.get("role") == "staff" else None
            ),
            limit=limit,
        )

        return {"success": True, "count": len(reports), "reports": reports}

    except Exception as e:
        logger.error(f"Error getting generated reports: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_reports_router.get("/{report_id}/download")
async def download_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    service: DynamicReportService = Depends(get_dynamic_report_service),
):
    """
    Download a generated report file

    **Path Parameters:**
    - report_id: ID of the generated report

    **Returns:** File download stream
    """
    try:
        file_data, file_name, mime_type = await service.get_report_file(report_id)

        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=mime_type,
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error downloading report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_reports_router.get("/quick/items-with-fields")
async def quick_report_items_with_fields(
    format: str = "excel",
    current_user: dict = Depends(get_current_user),
    service: DynamicReportService = Depends(get_dynamic_report_service),
):
    """
    Quick report: All items with their dynamic field values

    **Query Parameters:**
    - format: Output format (excel, csv, json) - default: excel

    **Returns:** Immediate file download
    """
    try:
        # Create quick template
        fields_service = service.db.dynamic_field_definitions
        dynamic_fields = await fields_service.find({"enabled": True}).to_list(length=None)

        fields = [
            {"name": "item_code", "label": "Item Code", "source": "database"},
            {"name": "item_name", "label": "Item Name", "source": "database"},
            {"name": "barcode", "label": "Barcode", "source": "database"},
            {"name": "mrp", "label": "MRP", "source": "database"},
        ]

        # Add dynamic fields
        for df in dynamic_fields:
            fields.append(
                {
                    "name": df["field_name"],
                    "label": df["display_label"],
                    "source": "dynamic",
                }
            )

        template_data = {
            "name": "Items with Dynamic Fields",
            "report_type": "items",
            "fields": fields,
            "format": format,
        }

        report = await service.generate_report(
            template_data=template_data, generated_by=current_user.get("username")
        )

        # Immediate download
        file_data, file_name, mime_type = await service.get_report_file(str(report["_id"]))

        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=mime_type,
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    except Exception as e:
        logger.error(f"Error generating quick report: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_reports_router.get("/quick/variance-summary")
async def quick_report_variance_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    warehouse: Optional[str] = None,
    format: str = "excel",
    current_user: dict = Depends(get_current_user),
    service: DynamicReportService = Depends(get_dynamic_report_service),
):
    """
    Quick report: Variance summary with filters

    **Query Parameters:**
    - start_date: Filter from date (ISO format)
    - end_date: Filter to date (ISO format)
    - warehouse: Filter by warehouse
    - format: Output format (excel, csv, json) - default: excel
    """
    try:
        filters = {}
        if start_date:
            filters["session_date"] = {"$gte": start_date}
        if end_date:
            if "session_date" in filters:
                filters["session_date"]["$lte"] = end_date
            else:
                filters["session_date"] = {"$lte": end_date}
        if warehouse:
            filters["warehouse"] = warehouse

        template_data = {
            "name": "Variance Summary Report",
            "report_type": "variance",
            "fields": [
                {"name": "warehouse", "label": "Warehouse"},
                {"name": "item_code", "label": "Item Code"},
                {"name": "expected_quantity", "label": "Expected"},
                {"name": "counted_quantity", "label": "Counted"},
                {"name": "variance", "label": "Variance"},
                {"name": "session_date", "label": "Date"},
            ],
            "filters": filters,
            "sorting": [{"field": "variance", "order": "desc"}],
            "format": format,
        }

        report = await service.generate_report(
            template_data=template_data, generated_by=current_user.get("username")
        )

        # Immediate download
        file_data, file_name, mime_type = await service.get_report_file(str(report["_id"]))

        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=mime_type,
            headers={"Content-Disposition": f"attachment; filename={file_name}"},
        )

    except Exception as e:
        logger.error(f"Error generating variance summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
