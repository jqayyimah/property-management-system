from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LandlordSignup(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str


class ActivateLandlord(BaseModel):
    is_active: bool