from pydantic import BaseModel
from typing import Optional
from app.models.apartment import ApartmentType


class ApartmentCreate(BaseModel):
    unit_number: str
    apartment_type: ApartmentType
    house_id: int


class ApartmentUpdate(BaseModel):
    unit_number: Optional[str] = None
    apartment_type: Optional[ApartmentType] = None
    is_vacant: Optional[bool] = None


class ApartmentTenantResponse(BaseModel):
    id: int
    full_name: str

    class Config:
        from_attributes = True


class ApartmentResponse(BaseModel):
    id: int
    unit_number: str
    apartment_type: ApartmentType
    is_vacant: bool
    house_id: int
    tenant: Optional[ApartmentTenantResponse] = None

    class Config:
        from_attributes = True
