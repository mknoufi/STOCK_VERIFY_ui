import io
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


class PDFGenerator:
    """
    Utility for generating PDF reports for the Stock Verification System.
    """

    @staticmethod
    def generate_analytics_report(data: dict[str, Any]) -> io.BytesIO:
        """
        Generate a PDF report from analytics data.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = styles["Title"]
        heading_style = styles["Heading2"]
        normal_style = styles["Normal"]

        elements = []

        # Title
        elements.append(Paragraph("Stock Verification Analytics Report", title_style))
        elements.append(Spacer(1, 0.2 * inch))

        # Metadata
        gen_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        elements.append(Paragraph(f"Generated on: {gen_time}", normal_style))
        elements.append(
            Paragraph(f"Period: Last {data.get('period_days', 7)} days", normal_style)
        )
        elements.append(Spacer(1, 0.3 * inch))

        # Summary Stats
        stats = data.get("stats", {})
        elements.append(Paragraph("Summary Statistics", heading_style))

        summary_data = [
            ["Metric", "Value"],
            ["Total Verifications", str(stats.get("total_verifications", 0))],
            ["Total Items Verified", str(stats.get("total_items", 0))],
            ["Unique Users", str(len(stats.get("top_users", [])))],
            ["Avg. Variance", f"{stats.get('avg_variance', 0):.2f}"],
        ]

        summary_table = Table(summary_data, colWidths=[2 * inch, 2 * inch])
        summary_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(summary_table)
        elements.append(Spacer(1, 0.4 * inch))

        # Top Users
        elements.append(Paragraph("Top Performers", heading_style))
        top_users = stats.get("top_users", [])
        if top_users:
            user_data = [["User ID", "Verifications"]]
            for user in top_users[:10]:  # Top 10
                user_data.append(
                    [user.get("_id", "Unknown"), str(user.get("count", 0))]
                )

            user_table = Table(user_data, colWidths=[3 * inch, 1.5 * inch])
            user_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.darkblue),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ]
                )
            )
            elements.append(user_table)
        else:
            elements.append(
                Paragraph("No user data available for this period.", normal_style)
            )

        elements.append(Spacer(1, 0.4 * inch))

        # Category Distribution
        elements.append(Paragraph("Category Distribution", heading_style))
        dist = data.get("category_distribution", [])
        if dist:
            dist_data = [["Category", "Count"]]
            for item in dist:
                dist_data.append(
                    [item.get("_id", "Uncategorized"), str(item.get("count", 0))]
                )

            dist_table = Table(dist_data, colWidths=[3 * inch, 1.5 * inch])
            dist_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.darkgreen),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ]
                )
            )
            elements.append(dist_table)
        else:
            elements.append(Paragraph("No category data available.", normal_style))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer
