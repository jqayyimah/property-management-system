from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HouseCreate(BaseModel):
    name: str
    address: str
    landlord_id: int


class HouseUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None


class HouseResponse(BaseModel):
    id: int
    name: str
    address: str
    landlord_id: int
    created_at: datetime

    class Config:
        from_attributes = True
