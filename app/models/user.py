from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum
from datetime import datetime, timedelta


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    LANDLORD = "LANDLORD"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    role = Column(Enum(UserRole), nullable=False)

    is_active = Column(Boolean, default=False)

    landlord_id = Column(Integer, nullable=True)  # linked AFTER activation

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reset_token = Column(String(255), nullable=True, index=True)
    
    reset_token_expiry = Column(DateTime, nullable=True)
