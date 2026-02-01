from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Apartment(Base):
    __tablename__ = "apartments"

    id = Column(Integer, primary_key=True, index=True)
    unit_number = Column(String(50), nullable=False)
    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    is_vacant = Column(Boolean, default=True)

    house = relationship("House", back_populates="apartments")
    tenant = relationship(
        "Tenant",
        back_populates="apartment",
        uselist=False,
    )

