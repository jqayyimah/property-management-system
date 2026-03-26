"""
Kept for backward compatibility — scheduler and manual script call this.
All logic lives in reminder_service.
"""

from sqlalchemy.orm import Session
from app.services.reminder_service import run_reminders


def run_rent_reminders(db: Session) -> int:
    return run_reminders(db, landlord_id=None, respect_schedule=True)
