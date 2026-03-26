from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class BillingPlanResponse(BaseModel):
    id: int
    slug: str
    name: str
    description: str
    price_amount: Decimal
    currency: str
    house_limit: int
    duration_days: Optional[int] = None
    is_default: bool
    is_active: bool

    class Config:
        from_attributes = True


class BillingSubscriptionResponse(BaseModel):
    plan: BillingPlanResponse
    house_limit: int
    houses_used: int
    houses_remaining: int
    subscription_status: str
    started_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    provider: Optional[str] = None


class BillingCheckoutRequest(BaseModel):
    plan_id: int


class BillingCheckoutResponse(BaseModel):
    checkout_link: str
    tx_ref: str


class BillingVerifyRequest(BaseModel):
    transaction_id: int
    tx_ref: str
