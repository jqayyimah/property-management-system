from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal


class PropertySummary(BaseModel):
    id: int
    name: str
    address: str
    landlord_id: int

    class Config:
        from_attributes = True


class RentCreate(BaseModel):
    tenant_id: int
    year: int
    start_date: date
    end_date: date
    amount: Decimal = Field(
        gt=0, description="Rent amount must be greater than zero"
    )


class RentPayment(BaseModel):
    amount: Decimal = Field(
        gt=0, description="Payment amount must be greater than zero"
    )


class RentUpdate(BaseModel):
    amount: Decimal | None = Field(
        default=None,
        gt=0,
        description="Updated rent amount must be greater than zero",
    )
    start_date: date | None = None
    end_date: date | None = None


class RentResponse(BaseModel):
    id: int
    tenant_id: int
    year: int
    start_date: date
    end_date: date
    amount: Decimal
    paid_amount: Decimal
    status: str

    # ✅ NEW: property column
    property: PropertySummary

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
