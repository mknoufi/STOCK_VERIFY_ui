"""
Export Engine - Export snapshots to various formats
Supports CSV, XLSX, and PDF exports
"""

import csv
import io
import logging
from datetime import datetime
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class ExportEngine:
    """
    Export snapshots to different formats
    """

    def __init__(self):
        pass

    def export_to_csv(
        self, snapshot: Dict[str, Any], include_summary: bool = True
    ) -> bytes:
        """
        Export snapshot to CSV
        
        Args:
            snapshot: Snapshot document
            include_summary: Include summary at top
            
        Returns:
            CSV bytes
        """
        output = io.StringIO()
        writer = csv.writer(output)

        # Write metadata
        writer.writerow(["Snapshot Report"])
        writer.writerow(["Name:", snapshot.get("name", "Untitled")])
        writer.writerow(
            ["Created:", datetime.fromtimestamp(snapshot["created_at"]).isoformat()]
        )
        writer.writerow(["Created By:", snapshot.get("created_by", "Unknown")])
        writer.writerow([])

        # Write summary
        if include_summary and snapshot.get("summary"):
            writer.writerow(["Summary"])
            for key, value in snapshot["summary"].items():
                writer.writerow([key, value])
            writer.writerow([])

        # Write data
        row_data = snapshot.get("row_data", [])

        if row_data:
            # Get headers from first row
            headers = list(row_data[0].keys())
            writer.writerow(headers)

            # Write rows
            for row in row_data:
                writer.writerow([row.get(h, "") for h in headers])

        # Convert to bytes
        csv_bytes = output.getvalue().encode("utf-8")
        output.close()

        logger.info(f"✓ CSV export created: {len(row_data)} rows")
        return csv_bytes

    def export_to_xlsx(
        self, snapshot: Dict[str, Any], include_summary: bool = True
    ) -> bytes:
        """
        Export snapshot to Excel (XLSX)
        
        Requires: openpyxl
        """
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Font, PatternFill
        except ImportError:
            raise ImportError("openpyxl is required for XLSX export")

        wb = Workbook()
        ws = wb.active
        ws.title = "Report"

        row_num = 1

        # Metadata
        ws[f"A{row_num}"] = "Snapshot Report"
        ws[f"A{row_num}"].font = Font(bold=True, size=14)
        row_num += 1

        ws[f"A{row_num}"] = "Name:"
        ws[f"B{row_num}"] = snapshot.get("name", "Untitled")
        row_num += 1

        ws[f"A{row_num}"] = "Created:"
        ws[f"B{row_num}"] = datetime.fromtimestamp(snapshot["created_at"]).isoformat()
        row_num += 1

        ws[f"A{row_num}"] = "Created By:"
        ws[f"B{row_num}"] = snapshot.get("created_by", "Unknown")
        row_num += 2

        # Summary
        if include_summary and snapshot.get("summary"):
            ws[f"A{row_num}"] = "Summary"
            ws[f"A{row_num}"].font = Font(bold=True)
            row_num += 1

            for key, value in snapshot["summary"].items():
                ws[f"A{row_num}"] = key
                ws[f"B{row_num}"] = value
                row_num += 1

            row_num += 1

        # Data
        row_data = snapshot.get("row_data", [])

        if row_data:
            # Headers
            headers = list(row_data[0].keys())
            for col_num, header in enumerate(headers, 1):
                cell = ws.cell(row=row_num, column=col_num, value=header)
                cell.font = Font(bold=True)
                cell.fill = PatternFill(
                    start_color="CCCCCC", end_color="CCCCCC", fill_type="solid"
                )

            row_num += 1

            # Rows
            for row in row_data:
                for col_num, header in enumerate(headers, 1):
                    ws.cell(row=row_num, column=col_num, value=row.get(header, ""))
                row_num += 1

        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except (AttributeError, TypeError, ValueError) as e:
                    # Skip cells with problematic values
                    logger.debug(f"Could not calculate cell width: {e}")
                    continue
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width

        # Save to bytes
        output = io.BytesIO()
        wb.save(output)
        xlsx_bytes = output.getvalue()
        output.close()

        logger.info(f"✓ XLSX export created: {len(row_data)} rows")
        return xlsx_bytes

    def export_to_json(self, snapshot: Dict[str, Any]) -> bytes:
        """
        Export snapshot to JSON
        """
        import json

        # Remove MongoDB ObjectId if present
        snapshot_copy = {**snapshot}
        if "_id" in snapshot_copy:
            snapshot_copy["_id"] = str(snapshot_copy["_id"])

        json_bytes = json.dumps(snapshot_copy, indent=2, default=str).encode("utf-8")

        logger.info(f"✓ JSON export created")
        return json_bytes

    def get_export_filename(
        self, snapshot: Dict[str, Any], format: str = "csv"
    ) -> str:
        """
        Generate export filename
        """
        name = snapshot.get("name", "report").replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{name}_{timestamp}.{format}"