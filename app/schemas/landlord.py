from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


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

    class Config:
        from_attributes = True
