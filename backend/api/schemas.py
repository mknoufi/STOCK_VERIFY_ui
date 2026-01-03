import uuid
from datetime import datetime
from typing import Any, Generic, Optional, TypeVar, Union

from pydantic import BaseModel, Field, field_validator, model_validator

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Union[dict[str, Any], None] = Field(default=None)
    message: Optional[str] = None
    payload_version: str = "1.0"

    model_config = {
        "json_schema_extra": {"examples": []},
        # Exclude None values from serialization to avoid validation issues
    }

    @classmethod
    def success_response(cls, data: T, message: Optional[str] = None):
        return cls(success=True, data=data, error=None, message=message)

    @classmethod
    def error_response(cls, error: dict[str, Any]):
        return cls(success=False, error=error)


class ERPItem(BaseModel):
    model_config = {"extra": "ignore"}  # Ignore extra fields from MongoDB

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
    hsn_code: Optional[str] = None
    gst_category: Optional[str] = None
    gst_percent: Optional[float] = None
    sgst_percent: Optional[float] = None
    cgst_percent: Optional[float] = None
    igst_percent: Optional[float] = None
    floor: Optional[str] = None
    rack: Optional[str] = None
    verified: Optional[bool] = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    last_scanned_at: Optional[datetime] = None
    verified_qty: Optional[float] = None
    variance: Optional[float] = None
    damaged_qty: Optional[float] = None
    non_returnable_damaged_qty: Optional[float] = None
    item_condition: Optional[str] = None
    manual_barcode: Optional[str] = None
    serial_number: Optional[str] = None
    is_serialized: Optional[bool] = None
    verified_floor: Optional[str] = None
    verified_rack: Optional[str] = None
    image_url: Optional[str] = None
    # Sales / pricing metadata
    sales_price: Optional[float] = None
    sale_price: Optional[float] = None
    standard_rate: Optional[float] = None
    last_purchase_rate: Optional[float] = None
    last_purchase_price: Optional[float] = None
    # Brand metadata
    brand_id: Optional[str] = None
    brand_name: Optional[str] = None
    brand_code: Optional[str] = None
    # Supplier metadata
    supplier_id: Optional[str] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    last_purchase_supplier: Optional[str] = None
    supplier_phone: Optional[str] = None
    supplier_city: Optional[str] = None
    supplier_state: Optional[str] = None
    supplier_gst: Optional[str] = None
    # Purchase info
    purchase_price: Optional[float] = None
    last_purchase_qty: Optional[float] = None
    purchase_qty: Optional[float] = None
    purchase_invoice_no: Optional[str] = None
    purchase_reference: Optional[str] = None
    last_purchase_date: Optional[datetime] = None
    last_purchase_cost: Optional[float] = None
    purchase_voucher_type: Optional[str] = None
    purchase_type: Optional[str] = None
    batch_id: Optional[Union[int, str]] = None
    batch_no: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None


class UserInfo(BaseModel):
    id: str
    username: str
    full_name: str
    role: str
    email: Optional[str] = None
    is_active: bool = True
    permissions: list[str] = Field(default_factory=list)


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


class PinLogin(BaseModel):
    """PIN-based login for staff users (4-digit numeric PIN)."""

    pin: str


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
    non_returnable_damaged_qty: Optional[float] = 0
    damage_included: Optional[bool] = None
    item_condition: Optional[str] = None
    floor_no: Optional[str] = None
    rack_no: Optional[str] = None
    mark_location: Optional[str] = None
    sr_no: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    variance_reason: Optional[str] = None
    variance_note: Optional[str] = None
    remark: Optional[str] = None
    photo_base64: Optional[str] = None
    mrp_counted: Optional[float] = None
    split_section: Optional[str] = None
    serial_numbers: Optional[list[str]] = None
    correction_reason: Optional[CorrectionReason] = None
    photo_proofs: Optional[list[PhotoProof]] = None
    correction_metadata: Optional[CorrectionMetadata] = None
    category_correction: Optional[str] = None
    subcategory_correction: Optional[str] = None


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    warehouse: str
    staff_user: str
    staff_name: str
    status: str = "OPEN"  # OPEN, ACTIVE, CLOSED
    type: str = "STANDARD"  # STANDARD, BLIND, STRICT
    started_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    reconciled_at: Optional[datetime] = None
    total_items: int = 0
    total_variance: float = 0
    notes: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v: Any) -> str:
        if isinstance(v, str):
            v = v.upper()
            # Map legacy RECONCILE to ACTIVE for now, or allow it if we can't
            # migrate yet. But the plan says "Normalize session states
            # (OPEN | ACTIVE | CLOSED)".
            # If we strictly enforce it, we might break existing data.
            # Let's allow RECONCILE but prefer ACTIVE.
            if v == "RECONCILE":
                return "ACTIVE"
            return v
        return v

    @model_validator(mode="after")
    def compute_legacy_status(self) -> "Session":
        # If session is ACTIVE but has reconciled_at, present it as RECONCILE
        # to frontend. This maintains backward compatibility while normalizing
        # DB state to ACTIVE.
        if self.status == "ACTIVE" and self.reconciled_at and not self.closed_at:
            self.status = "RECONCILE"
        return self


class SessionCreate(BaseModel):
    warehouse: str
    type: Optional[str] = "STANDARD"


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
