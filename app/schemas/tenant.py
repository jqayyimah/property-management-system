from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class TenantCreate(BaseModel):
    full_name: str
    email: EmailStr   # 🔐 mandatory
    phone: str
    apartment_id: int


class TenantUpdate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    full_name: Optional[str] = None


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
