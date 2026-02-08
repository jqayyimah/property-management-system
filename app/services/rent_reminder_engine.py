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
        # ✅ Skip fully paid rents
        if rent.paid_amount >= rent.amount:
            continue

        due_types = get_due_reminder_types(rent.end_date, today)

        for reminder_type in due_types:
            # ✅ Prevent duplicate reminders
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

            # ✅ Reminder-specific subject
            subject_map = {
                "90_DAYS": "Rent Reminder: 90 Days to Expiry",
                "30_DAYS": "Rent Reminder: 30 Days to Expiry",
                "7_DAYS": "Rent Reminder: 7 Days to Expiry",
                "EXPIRY": "Rent Expiring Today",
                "OVERDUE": "⚠️ Rent Overdue Notice",
            }

            subject = subject_map.get(
                reminder_type,
                "Rent Expiry Reminder",
            )

            outstanding = rent.amount - rent.paid_amount

            # ✅ Clean email body (no indentation issues)
            body = f"""
Hello {tenant.full_name},

This is a reminder regarding your rent.

Expiry Date: {rent.end_date}
Status: {rent.status}
Outstanding Balance: {outstanding}

Please take the necessary action.

Regards,
Property Management
""".strip()

            send_email(
                tenant.email,
                subject,
                body,
            )

            # ✅ Record reminder (idempotency guarantee)
            db.add(
                RentReminder(
                    rent_id=rent.id,
                    reminder_type=reminder_type,
                )
            )

    db.commit()
