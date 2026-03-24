from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import enum
from datetime import datetime, timedelta
from sqlalchemy.orm import relationship


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    LANDLORD = "LANDLORD"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=False)

    landlord_id = Column(
        Integer,
        ForeignKey("landlords.id"),
        nullable=True,
        index=True
    )

    landlord = relationship("Landlord", back_populates="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reset_token = Column(String(255), nullable=True, index=True)
    reset_token_expiry = Column(DateTime, nullable=True)
