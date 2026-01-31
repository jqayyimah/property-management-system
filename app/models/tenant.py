from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)

    # 🔐 mandatory
    email = Column(String(255), nullable=False, unique=True)

    apartment_id = Column(
        Integer,
        ForeignKey("apartments.id"),
        unique=True,
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    apartment = relationship("Apartment", back_populates="tenant")
    rents = relationship("Rent", back_populates="tenant")
