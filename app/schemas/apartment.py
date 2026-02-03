from pydantic import BaseModel
from typing import Optional


class ApartmentCreate(BaseModel):
    unit_number: str
    house_id: int


class ApartmentUpdate(BaseModel):
    unit_number: Optional[str] = None
    is_vacant: Optional[bool] = None


# ✅ NEW: lightweight tenant info for apartment listing
class ApartmentTenantResponse(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class ApartmentResponse(BaseModel):
    id: int
    unit_number: str
    is_vacant: bool
    house_id: int

    # ✅ NEW FIELD
    tenant: Optional[ApartmentTenantResponse] = None

    class Config:
        from_attributes = True
