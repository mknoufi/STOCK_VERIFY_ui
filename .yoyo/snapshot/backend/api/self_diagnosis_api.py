"""
Self-Diagnosis API Endpoints
Provide real-time error diagnosis and health monitoring
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from datetime import timedelta
import logging

from backend.auth.dependencies import get_current_user_async as get_current_user
from backend.services.auto_diagnosis import AutoDiagnosisService

# Global instance
_diagnosis_service = None


def get_auto_diagnosis() -> AutoDiagnosisService:
    """Get global auto-diagnosis service instance"""
    global _diagnosis_service
    if _diagnosis_service is None:
        from server import db

        _diagnosis_service = AutoDiagnosisService(mongo_db=db)
    return _diagnosis_service


logger = logging.getLogger(__name__)

self_diagnosis_router = APIRouter(prefix="/api/diagnosis", tags=["Self-Diagnosis"])


@self_diagnosis_router.get("/health")
async def get_health_with_diagnosis(current_user: dict = Depends(get_current_user)):
    """
    Get comprehensive health status with auto-diagnosis
    """
    try:
        diagnosis_service = get_auto_diagnosis()
        health_report = await diagnosis_service.health_check()
        return health_report
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@self_diagnosis_router.get("/statistics")
async def get_error_statistics(hours: int = 24, current_user: dict = Depends(get_current_user)):
    """
    Get error statistics with analysis
    """
    try:
        diagnosis_service = get_auto_diagnosis()
        time_window = timedelta(hours=hours)
        stats = await diagnosis_service.get_error_statistics(time_window)
        return stats
    except Exception as e:
        logger.error(f"Statistics retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Statistics failed: {str(e)}")


@self_diagnosis_router.post("/diagnose")
async def diagnose_error_endpoint(
    error_info: Dict[str, Any], current_user: dict = Depends(get_current_user)
):
    """
    Manually diagnose an error
    """
    try:
        # Create error object from info
        error_type = error_info.get("error_type", "Exception")
        error_message = error_info.get("error_message", "Unknown error")
        context = error_info.get("context", {})

        # Whitelist of allowed exception types (safe alternative to eval)
        ALLOWED_EXCEPTIONS = {
            "Exception": Exception,
            "ValueError": ValueError,
            "TypeError": TypeError,
            "KeyError": KeyError,
            "IndexError": IndexError,
            "AttributeError": AttributeError,
            "RuntimeError": RuntimeError,
            "NotImplementedError": NotImplementedError,
            "FileNotFoundError": FileNotFoundError,
            "PermissionError": PermissionError,
            "ConnectionError": ConnectionError,
            "TimeoutError": TimeoutError,
            "HTTPException": HTTPException,
        }

        # Create exception instance using whitelist mapping
        exc_class = ALLOWED_EXCEPTIONS.get(error_type, Exception)
        error = exc_class(error_message)

        diagnosis_service = get_auto_diagnosis()
        diagnosis = await diagnosis_service.diagnose_error(error, context)

        return diagnosis.to_dict()
    except Exception as e:
        logger.error(f"Error diagnosis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Diagnosis failed: {str(e)}")


@self_diagnosis_router.post("/auto-fix")
async def attempt_auto_fix(
    error_info: Dict[str, Any], current_user: dict = Depends(get_current_user)
):
    """
    Attempt to auto-fix an error
    """
    if current_user["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Supervisor access required")

    try:
        # Create error from info
        error_type = error_info.get("error_type", "Exception")
        error_message = error_info.get("error_message", "Unknown error")
        context = error_info.get("context", {})

        # Whitelist of allowed exception types (safe alternative to eval)
        ALLOWED_EXCEPTIONS = {
            "Exception": Exception,
            "ValueError": ValueError,
            "TypeError": TypeError,
            "KeyError": KeyError,
            "IndexError": IndexError,
            "AttributeError": AttributeError,
            "RuntimeError": RuntimeError,
            "NotImplementedError": NotImplementedError,
            "FileNotFoundError": FileNotFoundError,
            "PermissionError": PermissionError,
            "ConnectionError": ConnectionError,
            "TimeoutError": TimeoutError,
            "HTTPException": HTTPException,
        }

        exc_class = ALLOWED_EXCEPTIONS.get(error_type, Exception)
        error = exc_class(error_message)

        diagnosis_service = get_auto_diagnosis()
        diagnosis = await diagnosis_service.diagnose_error(error, context)

        if not diagnosis.auto_fixable:
            return {
                "auto_fixable": False,
                "message": "Error is not auto-fixable",
                "diagnosis": diagnosis.to_dict(),
            }

        # Attempt auto-fix
        fix_result = await diagnosis_service.auto_fix_error(diagnosis, context)

        return {
            "auto_fixable": True,
            "fix_attempted": True,
            "fix_successful": fix_result.is_success,
            "fix_result": (
                fix_result.unwrap_or(None) if fix_result.is_success else fix_result._error_message
            ),
            "diagnosis": diagnosis.to_dict(),
        }
    except Exception as e:
        logger.error(f"Auto-fix attempt failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Auto-fix failed: {str(e)}")


@self_diagnosis_router.get("/patterns")
async def get_error_patterns(current_user: dict = Depends(get_current_user)):
    """
    Get known error patterns and their solutions
    """
    try:
        diagnosis_service = get_auto_diagnosis()
        return {
            "patterns": diagnosis_service._error_patterns,
            "auto_fixes_available": list(diagnosis_service._auto_fix_registry.keys()),
            "pattern_count": len(diagnosis_service._error_patterns),
        }
    except Exception as e:
        logger.error(f"Pattern retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pattern retrieval failed: {str(e)}")
