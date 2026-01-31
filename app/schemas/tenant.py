from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class TenantCreate(BaseModel):
    full_name: str
    email: EmailStr   # 🔐 mandatory
    phone: Optional[str] = None
    apartment_id: Optional[int] = None


class TenantUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class TenantResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: Optional[str]
    apartment_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True