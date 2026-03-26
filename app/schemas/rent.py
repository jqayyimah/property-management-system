from pydantic import BaseModel, Field, model_validator
from datetime import date, datetime
from decimal import Decimal


MIN_RENT_YEAR = 2000
MAX_RENT_YEAR = 2100
MAX_RENT_AMOUNT = Decimal("9999999999.99")


class PropertySummary(BaseModel):
    id: int
    name: str
    address: str
    landlord_id: int

    class Config:
        from_attributes = True


class RentCreate(BaseModel):
    tenant_id: int
    year: int = Field(ge=MIN_RENT_YEAR, le=MAX_RENT_YEAR)
    start_date: date
    end_date: date
    amount: Decimal = Field(
        gt=0,
        le=MAX_RENT_AMOUNT,
        max_digits=12,
        decimal_places=2,
        description="Rent amount must be greater than zero and fit within the supported currency range",
    )

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date >= self.end_date:
            raise ValueError("start_date must be before end_date")
        if self.start_date.year != self.year:
            raise ValueError("Rent year must match start_date year")
        if not (MIN_RENT_YEAR <= self.start_date.year <= MAX_RENT_YEAR):
            raise ValueError("start_date year is out of supported range")
        if not (MIN_RENT_YEAR <= self.end_date.year <= MAX_RENT_YEAR):
            raise ValueError("end_date year is out of supported range")
        return self


class RentPayment(BaseModel):
    amount: Decimal = Field(
        gt=0,
        le=MAX_RENT_AMOUNT,
        max_digits=12,
        decimal_places=2,
        description="Payment amount must be greater than zero and fit within the supported currency range",
    )


class RentUpdate(BaseModel):
    amount: Decimal | None = Field(
        default=None,
        gt=0,
        le=MAX_RENT_AMOUNT,
        max_digits=12,
        decimal_places=2,
        description="Updated rent amount must be greater than zero and fit within the supported currency range",
    )
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and not (MIN_RENT_YEAR <= self.start_date.year <= MAX_RENT_YEAR):
            raise ValueError("start_date year is out of supported range")
        if self.end_date and not (MIN_RENT_YEAR <= self.end_date.year <= MAX_RENT_YEAR):
            raise ValueError("end_date year is out of supported range")
        if self.start_date and self.end_date and self.start_date >= self.end_date:
            raise ValueError("start_date must be before end_date")
        return self


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
