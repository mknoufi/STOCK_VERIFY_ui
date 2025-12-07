import uuid
from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field, validator

T = TypeVar("T")

# Constants for quantity validation
MIN_QUANTITY = 0.0
MAX_QUANTITY = 1_000_000.0
MAX_PRICE = 10_000_000.0  # 1 crore


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
    auto_barcode: Optional[str] = None
    plu_code: Optional[str] = None
    # Purchase-related fields
    last_purchase_price: Optional[float] = None
    gst_percentage: Optional[float] = None
    hsn_code: Optional[str] = None
    last_purchase_type: Optional[str] = None  # "PI" (Purchase Invoice) or "PE" (Purchase Entry)
    supplier_name: Optional[str] = None
    last_purchase_qty: Optional[float] = None
    last_purchase_date: Optional[datetime] = None
    voucher_number: Optional[str] = None

    # Validators for quantity and price fields
    @validator("stock_qty", "last_purchase_qty", pre=True, always=True)
    def validate_quantity(cls, v):
        """Validate quantity is within acceptable range."""
        if v is None:
            return 0.0
        try:
            val = float(v)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid quantity value: {v}")
        if val < MIN_QUANTITY:
            raise ValueError(f"Quantity must be at least {MIN_QUANTITY}")
        if val > MAX_QUANTITY:
            raise ValueError(f"Quantity must not exceed {MAX_QUANTITY:,.0f}")
        return val

    @validator("mrp", "last_purchase_price", pre=True, always=True)
    def validate_price(cls, v):
        """Validate price is within acceptable range."""
        if v is None:
            return 0.0
        try:
            val = float(v)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid price value: {v}")
        if val < 0:
            raise ValueError("Price cannot be negative")
        if val > MAX_PRICE:
            raise ValueError(f"Price must not exceed {MAX_PRICE:,.0f}")
        return val

    @validator("gst_percentage", pre=True, always=True)
    def validate_gst(cls, v):
        """Validate GST percentage is valid."""
        if v is None:
            return None
        try:
            val = float(v)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid GST percentage: {v}")
        if val < 0 or val > 100:
            raise ValueError("GST percentage must be between 0 and 100")
        return val


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
    damage_included: Optional[bool] = True

    # Validators for quantity fields
    @validator("counted_qty", "damaged_qty", pre=True, always=True)
    def validate_quantity(cls, v):
        """Validate quantity is within acceptable range."""
        if v is None:
            return 0.0
        try:
            val = float(v)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid quantity value: {v}")
        if val < MIN_QUANTITY:
            raise ValueError(f"Quantity must be at least {MIN_QUANTITY}")
        if val > MAX_QUANTITY:
            raise ValueError(f"Quantity must not exceed {MAX_QUANTITY:,.0f}")
        return val

    @validator("mrp_counted", pre=True, always=True)
    def validate_mrp(cls, v):
        """Validate MRP is within acceptable range."""
        if v is None:
            return None
        try:
            val = float(v)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid MRP value: {v}")
        if val < 0:
            raise ValueError("MRP cannot be negative")
        if val > MAX_PRICE:
            raise ValueError(f"MRP must not exceed {MAX_PRICE:,.0f}")
        return val


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    warehouse: str
    floor: Optional[str] = None
    rack: Optional[str] = None
    staff_user: str
    staff_name: str
    status: str = "OPEN"  # OPEN, RECONCILE, CLOSED
    started_at: datetime = Field(default_factory=datetime.utcnow)
    closed_at: Optional[datetime] = None
    total_items: int = 0
    total_variance: float = 0


class SessionCreate(BaseModel):
    warehouse: str
    floor: Optional[str] = None
    rack: Optional[str] = None


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
