from sqlalchemy import Column, Integer, String, DECIMAL, Boolean

from app.database import Base


class BillingPlan(Base):
    __tablename__ = "billing_plans"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    price_amount = Column(DECIMAL(12, 2), nullable=False, default=0)
    currency = Column(String(10), nullable=False, default="NGN")
    apartment_limit = Column(Integer, nullable=False, default=0)
    house_limit = Column(Integer, nullable=False)
    duration_days = Column(Integer, nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
