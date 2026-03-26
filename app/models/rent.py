from sqlalchemy import (
    Column,
    Integer,
    Date,
    DECIMAL,
    String,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Rent(Base):
    __tablename__ = "rents"

    __table_args__ = (
        UniqueConstraint("tenant_id", "year", name="uq_tenant_year"),
        Index("ix_rents_status_end_date", "status", "end_date"),
    )

    id = Column(Integer, primary_key=True, index=True)

    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id"),
        nullable=False,
        index=True,
    )

    year = Column(Integer, nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False, index=True)

    amount = Column(DECIMAL(12, 2), nullable=False)
    paid_amount = Column(DECIMAL(12, 2), default=0)

    status = Column(String(20), default="UNPAID", index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    reminders = relationship(
        "RentReminder",
        back_populates="rent",
        cascade="all, delete-orphan",
    )

    tenant = relationship("Tenant", back_populates="rents")
