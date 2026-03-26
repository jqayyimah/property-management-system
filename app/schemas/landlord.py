from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from decimal import Decimal


class LandlordCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str


class LandlordUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class LandlordResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str
    created_at: datetime
    user_id: Optional[int] = None
    is_active: bool = False
    billing_status: str = "TRIAL_EXPIRED"
    billing_access_active: bool = False
    current_plan_name: Optional[str] = None
    plan_ends_at: Optional[datetime] = None
    current_plan_amount: Optional[Decimal] = None
    sms_sent_count: int = 0
    whatsapp_sent_count: int = 0
    email_sent_count: int = 0
    sms_cost_total: Decimal = Decimal("0.00")
    whatsapp_cost_total: Decimal = Decimal("0.00")
    email_cost_total: Decimal = Decimal("0.00")
    service_cost_total: Decimal = Decimal("0.00")
    upgrade_recommended: bool = False
    upgrade_recommendation_reason: Optional[str] = None

    class Config:
        from_attributes = True
