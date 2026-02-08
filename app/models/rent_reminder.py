from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RentReminder(Base):
    __tablename__ = "rent_reminders"

    id = Column(Integer, primary_key=True, index=True)

    # 🔗 Link to rent
    rent_id = Column(Integer, ForeignKey(
        "rents.id", ondelete="CASCADE"), nullable=False)

    # 📌 Reminder type: 14_days, 7_days, 1_day, overdue
    reminder_type = Column(String(20), nullable=False)

    # ⏰ When reminder was sent
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    # 🔁 Relationships
    rent = relationship("Rent", back_populates="reminders")

    # 🚀 Prevent duplicate reminders
    __table_args__ = (
        Index(
            "ix_rent_reminder_unique",
            "rent_id",
            "reminder_type",
            unique=True,
        ),
    )
