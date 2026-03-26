from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LandlordSubscription(Base):
    __tablename__ = "landlord_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    landlord_id = Column(Integer, ForeignKey("landlords.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("billing_plans.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)
    provider = Column(String(50), nullable=True)
    transaction_reference = Column(String(120), nullable=True, index=True)
    provider_reference = Column(String(120), nullable=True)
    amount_paid = Column(DECIMAL(12, 2), nullable=False, default=0)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    landlord = relationship("Landlord", back_populates="subscriptions")
    plan = relationship("BillingPlan")
