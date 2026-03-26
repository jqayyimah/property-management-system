from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, DECIMAL, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    landlord_id = Column(Integer, ForeignKey("landlords.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("billing_plans.id"), nullable=False, index=True)
    provider = Column(String(50), nullable=False, default="FLUTTERWAVE")
    tx_ref = Column(String(120), nullable=False, unique=True, index=True)
    provider_transaction_id = Column(String(120), nullable=True, unique=True)
    status = Column(String(20), nullable=False, default="INITIALIZED", index=True)
    amount = Column(DECIMAL(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="NGN")
    checkout_link = Column(String(500), nullable=True)
    raw_response = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    landlord = relationship("Landlord", back_populates="payment_transactions")
    plan = relationship("BillingPlan")
