import uuid
from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[Dict[str, Any]] = None

    @classmethod
    def success_response(cls, data: T):
        return cls(success=True, data=data)

    @classmethod
    def error_response(cls, error: Dict[str, Any]):
        return cls(success=False, error=error)


class ERPItem(BaseModel):
    item_code: str = ""
    item_name: str = ""
    barcode: str = ""
    stock_qty: float = 0.0
    mrp: float = 0.0
    category: Optional[str] = None
    subcategory: Optional[str] = None
    warehouse: Optional[str] = None
    location: Optional[str] = None
    uom_code: Optional[str] = None
    uom_name: Optional[str] = None
    floor: Optional[str] = None
    rack: Optional[str] = None
    verified: Optional[bool] = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    last_scanned_at: Optional[datetime] = None
    manual_barcode: Optional[str] = None
    image_url: Optional[str] = None


class UserInfo(BaseModel):
    id: str
    username: str
    full_name: str
    role: str
    email: Optional[str] = None
    is_active: bool = True
    permissions: List[str] = Field(default_factory=list)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    role: str


class UserLogin(BaseModel):
    username: str
    password: str


class CorrectionReason(BaseModel):
    code: str
    description: str


class PhotoProof(BaseModel):
    id: str
    url: str
    timestamp: datetime


class CorrectionMetadata(BaseModel):
    reason_code: str
    notes: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None


class CountLineCreate(BaseModel):
    session_id: str
    item_code: str
    counted_qty: float
    damaged_qty: Optional[float] = 0
    damage_included: Optional[bool] = None
    item_condition: Optional[str] = None
    floor_no: Optional[str] = None
    rack_no: Optional[str] = None
    mark_location: Optional[str] = None
    sr_no: Optional[str] = None
    manufacturing_date: Optional[str] = None
    variance_reason: Optional[str] = None
    variance_note: Optional[str] = None
    remark: Optional[str] = None
    photo_base64: Optional[str] = None
    mrp_counted: Optional[float] = None
    split_section: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    correction_reason: Optional[CorrectionReason] = None
    photo_proofs: Optional[List[PhotoProof]] = None
    correction_metadata: Optional[CorrectionMetadata] = None
    category_correction: Optional[str] = None
    subcategory_correction: Optional[str] = None


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    warehouse: str
    staff_user: str
    staff_name: str
    status: str = "OPEN"  # OPEN, RECONCILE, CLOSED
    started_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    total_items: int = 0
    total_variance: float = 0


class SessionCreate(BaseModel):
    warehouse: str


class UnknownItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    barcode: Optional[str] = None
    description: str
    counted_qty: float
    photo_base64: Optional[str] = None
    remark: Optional[str] = None
    reported_by: str
    reported_at: datetime = Field(default_factory=datetime.utcnow)
    item_name: Optional[str] = None
    mrp: Optional[float] = None
    stock: Optional[float] = None
    serial: Optional[str] = None


class UnknownItemCreate(BaseModel):
    session_id: str
    barcode: Optional[str] = None
    description: str
    counted_qty: Optional[float] = 0
    photo_base64: Optional[str] = None
    remark: Optional[str] = None
    item_name: Optional[str] = None
    mrp: Optional[float] = None
    stock: Optional[float] = None
    serial: Optional[str] = None
