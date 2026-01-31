from datetime import date
from sqlalchemy.orm import Session

from app.models.rent import Rent
from app.models.rent_reminder import RentReminder
from app.services.rent_reminder_rules import get_due_reminder_types
from app.services.email_service import send_email


def run_rent_reminders(db: Session):
    today = date.today()

    rents = (
        db.query(Rent)
        .filter(Rent.status != "PAID")
        .all()
    )

    for rent in rents:
        due_types = get_due_reminder_types(rent.end_date, today)

        for reminder_type in due_types:
            already_sent = (
                db.query(RentReminder)
                .filter(
                    RentReminder.rent_id == rent.id,
                    RentReminder.reminder_type == reminder_type,
                )
                .first()
            )

            if already_sent:
                continue

            tenant = rent.tenant
            if not tenant or not tenant.email:
                continue

            subject = "Rent Expiry Reminder"
            body = f"""
Hello {tenant.full_name},

This is a reminder that your rent expires on {rent.end_date}.

Status: {rent.status}
Outstanding Balance: {rent.amount - rent.paid_amount}

Please take necessary action.

Regards,
Property Management
"""

            send_email(tenant.email, subject, body)

            db.add(
                RentReminder(
                    rent_id=rent.id,
                    reminder_type=reminder_type,
                )
            )

    db.commit()
