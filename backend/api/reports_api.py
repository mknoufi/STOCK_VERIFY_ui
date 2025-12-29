import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.db.runtime import get_db
from backend.services.analytics_service import AnalyticsService
from backend.utils.pdf_generator import PDFGenerator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports", tags=["Analytics"])


@router.get("/analytics")
async def get_analytics(
    days: int = Query(7, ge=1, le=90), current_user: dict = Depends(get_current_user)
):
    """
    Get analytics data for the dashboard.
    Includes verification trends, top users, and category distribution.
    """
    try:
        db = get_db()
        analytics_service = AnalyticsService(db)

        stats = await analytics_service.get_verification_stats(days=days)
        distribution = await analytics_service.get_category_distribution()

        return {
            "success": True,
            "data": {
                "stats": stats,
                "category_distribution": distribution,
                "period_days": days,
            },
        }
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics data")


@router.get("/analytics/trends")
async def get_trends(
    days: int = Query(30, ge=1, le=365), current_user: dict = Depends(get_current_user)
):
    """
    Get detailed verification trends.
    """
    try:
        db = get_db()
        analytics_service = AnalyticsService(db)
        trends = await analytics_service.get_verification_stats(days=days)
        return {"success": True, "data": trends.get("trends", [])}
    except Exception as e:
        logger.error(f"Error fetching trends: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch trend data")


@router.get("/analytics/export/pdf")
async def export_analytics_pdf(
    days: int = Query(7, ge=1, le=90), current_user: dict = Depends(get_current_user)
):
    """
    Export analytics data as a PDF report.
    """
    try:
        db = get_db()
        analytics_service = AnalyticsService(db)

        stats = await analytics_service.get_verification_stats(days=days)
        distribution = await analytics_service.get_category_distribution()

        data = {
            "stats": stats,
            "category_distribution": distribution,
            "period_days": days,
        }

        pdf_buffer = PDFGenerator.generate_analytics_report(data)

        filename = f"analytics_report_{datetime.now().strftime('%Y%m%d')}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Error exporting PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF report")
