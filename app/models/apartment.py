from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from app.database import Base


# 👇 DEFINE ENUM FIRST
class ApartmentType(str, enum.Enum):
    STUDIO = "Studio Room Self Contain"

    ONE_BEDROOM_FLAT = "One Bedroom Flat"
    TWO_BEDROOM_FLAT = "Two Bedroom Flat"
    THREE_BEDROOM_FLAT = "Three Bedroom Flat"
    FOUR_BEDROOM_FLAT = "Four Bedroom Flat"
    FIVE_BEDROOM_FLAT = "Five Bedroom Flat"

    TWO_BEDROOM_DUPLEX = "Two Bedroom Duplex"
    THREE_BEDROOM_DUPLEX = "Three Bedroom Duplex"
    FOUR_BEDROOM_DUPLEX = "Four Bedroom Duplex"
    FIVE_BEDROOM_DUPLEX = "Five Bedroom Duplex"

    TWO_BEDROOM_MAISONETTE = "Two Bedroom Maisonette"
    THREE_BEDROOM_MAISONETTE = "Three Bedroom Maisonette"

    TWO_BEDROOM_TERRACE = "Two Bedroom Terrace"
    THREE_BEDROOM_TERRACE = "Three Bedroom Terrace"
    FOUR_BEDROOM_TERRACE = "Four Bedroom Terrace"

    TWO_BEDROOM_BUNGALOW = "Two Bedroom Bungalow"
    THREE_BEDROOM_BUNGALOW = "Three Bedroom Bungalow"

    PENTHOUSE = "Penthouse"
    SHOP = "Shop / Commercial Space"
    OFFICE = "Office Space"


# 👇 THEN DEFINE MODEL
class Apartment(Base):
    __tablename__ = "apartments"

    __table_args__ = (
        UniqueConstraint("unit_number", "house_id", name="uq_unit_per_house"),
    )

    id = Column(Integer, primary_key=True, index=True)
    unit_number = Column(String(50), nullable=False)

    apartment_type = Column(
        Enum(
            ApartmentType,
            values_callable=lambda obj: [e.value for e in obj]
        ),
        nullable=False
    )

    house_id = Column(Integer, ForeignKey("houses.id"), nullable=False)
    is_vacant = Column(Boolean, default=True)

    house = relationship("House", back_populates="apartments")
    tenant = relationship("Tenant", back_populates="apartment", uselist=False)
