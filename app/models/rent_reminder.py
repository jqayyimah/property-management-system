from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RentReminder(Base):
    __tablename__ = "rent_reminders"

    id = Column(Integer, primary_key=True)
    rent_id = Column(Integer, ForeignKey("rents.id"), nullable=False)
    reminder_type = Column(String(20), nullable=False)
    sent_at = Column(DateTime, server_default=func.now())

    rent = relationship("Rent", back_populates="reminders")
