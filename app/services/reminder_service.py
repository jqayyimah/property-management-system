"""
Central reminder service.
Owns all reminder logic: querying, building messages, sending, deduplication, logging.
"""

from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.rent import Rent
from app.models.tenant import Tenant
from app.models.apartment import Apartment
from app.models.house import House
from app.models.rent_reminder import RentReminder
from app.models.rent_reminder_log import RentReminderLog
from app.models.app_setting import AppSetting
from app.services.rent_reminder_rules import get_due_reminder_types
from app.services.email_service import send_email

# ── Message template ──────────────────────────────────────────────────────────

SETTING_KEY = "reminder_message_template"

DEFAULT_TEMPLATE = (
    "Dear {tenant_name},\n\n"
    "This is a reminder that your rent for {property_name} ({apartment}) "
    "is due on {due_date}.\n\n"
    "Outstanding balance: {amount}\n\n"
    "Please make payment promptly.\n\n"
    "Regards,\nProperty Management"
)

SUBJECT_MAP = {
    "7_DAYS": "Rent Reminder: 7 Days to Due Date",
    "3_DAYS": "Rent Reminder: 3 Days to Due Date",
    "DUE_TODAY": "Rent Due Today",
    "OVERDUE": "⚠️ Overdue Rent Notice",
}


def get_reminder_template(db: Session) -> str:
    setting = (
        db.query(AppSetting).filter(AppSetting.key == SETTING_KEY).first()
    )
    return setting.value if setting else DEFAULT_TEMPLATE


def save_reminder_template(db: Session, message: str) -> None:
    setting = (
        db.query(AppSetting).filter(AppSetting.key == SETTING_KEY).first()
    )
    if setting:
        setting.value = message
    else:
        db.add(AppSetting(key=SETTING_KEY, value=message))
    db.commit()


def _build_message(template: str, **ctx) -> str:
    try:
        return template.format(**ctx)
    except (KeyError, ValueError):
        return DEFAULT_TEMPLATE.format(**ctx)


# ── Query helpers ─────────────────────────────────────────────────────────────


def _base_unpaid_query(db: Session, landlord_id: Optional[int]):
    """
    Returns a SQLAlchemy query for unpaid rents, optionally scoped to a landlord.
    When landlord_id is set an INNER JOIN to Apartment→House is applied,
    which naturally excludes tenants with no apartment assigned.
    """
    q = db.query(Rent).filter(Rent.status != "PAID")
    if landlord_id:
        q = (
            q.join(Tenant, Rent.tenant_id == Tenant.id)
            .join(Apartment, Tenant.apartment_id == Apartment.id)
            .join(House, Apartment.house_id == House.id)
            .filter(House.landlord_id == landlord_id)
        )
    return q


# ── Public API ────────────────────────────────────────────────────────────────


def get_summary(db: Session, landlord_id: Optional[int] = None) -> dict:
    today = date.today()

    total_upcoming = (
        _base_unpaid_query(db, landlord_id)
        .filter(Rent.end_date >= today)
        .count()
    )
    total_overdue = (
        _base_unpaid_query(db, landlord_id)
        .filter(Rent.end_date < today)
        .count()
    )

    log_q = db.query(RentReminderLog).filter(
        func.date(RentReminderLog.sent_at) == today,
        RentReminderLog.status == "SENT",
    )
    if landlord_id:
        log_q = (
            log_q.join(Tenant, RentReminderLog.tenant_id == Tenant.id)
            .join(Apartment, Tenant.apartment_id == Apartment.id)
            .join(House, Apartment.house_id == House.id)
            .filter(House.landlord_id == landlord_id)
        )
    total_sent_today = log_q.count()

    return {
        "total_upcoming": total_upcoming,
        "total_overdue": total_overdue,
        "total_sent_today": total_sent_today,
    }


def get_rents_needing_reminders(
    db: Session, landlord_id: Optional[int] = None
) -> list[dict]:
    """Return structured data for every unpaid rent — used by the frontend table."""
    rents = _base_unpaid_query(db, landlord_id).all()
    result = []

    for rent in rents:
        tenant = rent.tenant
        if not tenant:
            continue

        apartment = tenant.apartment
        house = apartment.house if apartment else None

        property_name = house.name if house else "—"
        apt_label = (
            f"{house.name} - {apartment.apartment_type} - {apartment.unit_number}"
            if apartment and house
            else "—"
        )

        last_log = (
            db.query(RentReminderLog)
            .filter(RentReminderLog.rent_id == rent.id)
            .order_by(RentReminderLog.sent_at.desc())
            .first()
        )

        result.append(
            {
                "rent_id": rent.id,
                "tenant_id": tenant.id,
                "tenant_name": tenant.full_name,
                "property_name": property_name,
                "apartment": apt_label,
                "end_date": rent.end_date,
                "amount": rent.amount,
                "paid_amount": rent.paid_amount,
                "status": rent.status,
                "last_reminder_type": last_log.reminder_type if last_log else None,
                "last_reminder_sent_at": last_log.sent_at if last_log else None,
            }
        )

    return result


def run_reminders(db: Session, landlord_id: Optional[int] = None) -> int:
    """
    Evaluate every unpaid rent against reminder rules and dispatch emails.

    Deduplication: RentReminder has a unique constraint on (rent_id, reminder_type).
    An OVERDUE reminder can only fire once per rent (by design — prevents spam).
    All sends are logged to RentReminderLog regardless of deduplication.

    Returns the number of reminders successfully sent this run.
    """
    today = date.today()
    template = get_reminder_template(db)
    rents = _base_unpaid_query(db, landlord_id).all()
    sent_count = 0

    for rent in rents:
        # Guard: skip if fully paid (decimal comparison-safe)
        if rent.paid_amount >= rent.amount:
            continue

        due_types = get_due_reminder_types(rent.end_date, today)
        if not due_types:
            continue

        tenant = rent.tenant
        if not tenant or not tenant.email:
            continue

        apartment = tenant.apartment
        house = apartment.house if apartment else None
        property_name = house.name if house else "N/A"
        apt_label = (
            f"{house.name} - {apartment.apartment_type} - {apartment.unit_number}"
            if apartment and house
            else "N/A"
        )
        outstanding = rent.amount - rent.paid_amount

        for reminder_type in due_types:
            # Deduplication check — skip if already sent for this (rent, type) pair
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

            message = _build_message(
                template,
                tenant_name=tenant.full_name,
                property_name=property_name,
                apartment=apt_label,
                amount=outstanding,
                due_date=rent.end_date,
            )
            subject = SUBJECT_MAP.get(reminder_type, "Rent Reminder")

            send_status = "SENT"
            try:
                send_email(tenant.email, subject, message)
            except Exception as exc:
                send_status = "FAILED"
                print(f"❌ Email failed for tenant {tenant.id}: {exc}")

            # Record deduplication entry
            db.add(
                RentReminder(rent_id=rent.id, reminder_type=reminder_type)
            )

            # Record audit log entry
            db.add(
                RentReminderLog(
                    rent_id=rent.id,
                    tenant_id=tenant.id,
                    reminder_type=reminder_type,
                    message=message,
                    status=send_status,
                )
            )

            if send_status == "SENT":
                sent_count += 1

        db.commit()

    return sent_count
