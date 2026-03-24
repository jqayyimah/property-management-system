from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from app.models.user import UserRole


class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    landlord_id: Optional[int] = None

    # 👤 Added
    full_name: Optional[str] = None
    first_name: Optional[str] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class LandlordSignup(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    phone: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "landlord@email.com",
                "password": "StrongPass123",
                "full_name": "John Doe",
                "phone": "08012345678"
            }
        }


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
    confirm_password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str
