from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RentReminderLog(Base):
    """
    Detailed audit log of every reminder sent.
    Separate from RentReminder (which is the deduplication table).
    """

    __tablename__ = "rent_reminder_logs"

    id = Column(Integer, primary_key=True, index=True)

    rent_id = Column(
        Integer,
        ForeignKey("rents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = Column(
        Integer,
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    reminder_type = Column(String(20), nullable=False)

    # Full message body that was sent
    message = Column(Text, nullable=False)

    # SENT | FAILED
    status = Column(String(20), nullable=False, default="SENT")
    channel_used = Column(String(20), nullable=True)

    sent_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    rent = relationship("Rent")
    tenant = relationship("Tenant")

    __table_args__ = (
        Index("ix_log_sent_at_tenant", "sent_at", "tenant_id"),
    )
