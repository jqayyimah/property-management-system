from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class House(Base):
    __tablename__ = "houses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(255), nullable=False)
    landlord_id = Column(Integer, ForeignKey("landlords.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    landlord = relationship(
        "Landlord",
        back_populates="houses"
    )

    apartments = relationship(
        "Apartment",
        back_populates="house",
        cascade="all, delete-orphan"
    )
