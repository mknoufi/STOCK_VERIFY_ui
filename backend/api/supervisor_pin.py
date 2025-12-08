import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth.dependencies import get_current_user
from backend.db.runtime import get_db
from backend.services.activity_log import ActivityLogService
from backend.utils.auth_utils import verify_password

router = APIRouter()
logger = logging.getLogger(__name__)


class PinVerificationRequest(BaseModel):
    supervisor_username: str
    pin: str
    action: str
    reason: str
    staff_username: str
    entity_id: Optional[str] = None
    entity_type: Optional[str] = None


@router.post("/supervisor/verify-pin")
async def verify_supervisor_pin(
    request: PinVerificationRequest, current_user: dict = Depends(get_current_user)
):
    """
    Verify supervisor PIN and log the override action.
    """
    db = get_db()

    # 1. Fetch the supervisor user
    supervisor = await db.users.find_one({"username": request.supervisor_username})
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor not found")

    # 2. Verify Role
    if supervisor.get("role") not in ["admin", "supervisor"]:
        raise HTTPException(status_code=403, detail="User is not a supervisor")

    # 3. Verify PIN
    # We reuse verify_password for PINs since they are hashed the same way
    stored_pin_hash = supervisor.get("pin_hash")
    if not stored_pin_hash:
        raise HTTPException(
            status_code=400, detail="Supervisor PIN not set. Please contact administrator."
        )

    if not verify_password(request.pin, stored_pin_hash):
        logger.warning(f"Failed PIN attempt for supervisor {request.supervisor_username}")
        raise HTTPException(status_code=401, detail="Invalid PIN")

    # 4. Log the Activity
    log_service = ActivityLogService(db)
    await log_service.log_activity(
        user=request.supervisor_username,
        role=supervisor.get("role"),
        action=f"override_{request.action}",
        entity_type=request.entity_type or "override",
        entity_id=request.entity_id,
        details={
            "reason": request.reason,
            "staff_user": request.staff_username,
            "requested_by": current_user["username"],
        },
        status="success",
    )

    return {"success": True, "message": "Override authorized"}
