from pydantic import BaseModel
from typing import Optional


class ApartmentCreate(BaseModel):
    unit_number: str
    house_id: int


class ApartmentUpdate(BaseModel):
    unit_number: Optional[str] = None
    is_vacant: Optional[bool] = None


class ApartmentResponse(BaseModel):
    id: int
    unit_number: str
    is_vacant: bool
    house_id: int

    class Config:
        from_attributes = True
