"""
Central reminder service.
Owns all reminder logic: querying, building messages, sending, deduplication, logging.
"""

import json
import re
from html import unescape
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.rent import Rent
from app.models.tenant import Tenant
from app.models.apartment import Apartment
from app.models.house import House
from app.models.rent_reminder import RentReminder
from app.models.rent_reminder_log import RentReminderLog
from app.models.app_setting import AppSetting
from app.services import billing_service
from app.services.rent_reminder_rules import get_due_reminder_types
from app.services.email_service import send_email
from app.services.sms_service import send_sms
from app.services.whatsapp_service import send_whatsapp

# ── Message template ──────────────────────────────────────────────────────────

TEMPLATE_SETTING_KEY = "reminder_message_template"
CHANNELS_SETTING_KEY = "reminder_channels"
SCHEDULE_SETTING_KEY = "reminder_schedule"
SUPPORTED_CHANNELS = ("sms", "whatsapp", "email", "dashboard")
DEFAULT_CHANNELS = ["sms", "whatsapp", "email", "dashboard"]
DEFAULT_REMINDER_SCHEDULE = [
    {
        "reminder_type": "30_DAYS",
        "label": "1 month before due date",
        "days_before_due": 30,
        "enabled": True,
        "trigger_time": "09:00",
    },
    {
        "reminder_type": "7_DAYS",
        "label": "7 days before due date",
        "days_before_due": 7,
        "enabled": True,
        "trigger_time": "09:00",
    },
    {
        "reminder_type": "3_DAYS",
        "label": "3 days before due date",
        "days_before_due": 3,
        "enabled": True,
        "trigger_time": "09:00",
    },
    {
        "reminder_type": "DUE_TODAY",
        "label": "On the due date",
        "days_before_due": 0,
        "enabled": True,
        "trigger_time": "09:00",
    },
    {
        "reminder_type": "OVERDUE",
        "label": "After the due date",
        "days_before_due": -1,
        "enabled": True,
        "trigger_time": "09:00",
    },
]

LEGACY_TEMPLATE = (
    "Dear {tenant_name},\n\n"
    "This is a reminder that your rent for {property_name} ({apartment}) "
    "is due on {due_date}.\n\n"
    "Outstanding balance: {amount}\n\n"
    "Please make payment promptly.\n\n"
    "Regards,\nProperty Management"
)

DEFAULT_TEMPLATE = (
    "<div style=\"margin:0;padding:24px 0;background:#f4efe7;font-family:Georgia,'Times New Roman',serif;color:#1f2937;\">"
    "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eadfce;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.08);\">"
    "<div style=\"padding:28px 32px;background:linear-gradient(135deg,#0f766e,#115e59);color:#ffffff;\">"
    "<div style=\"font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;\">Property Management</div>"
    "<h1 style=\"margin:12px 0 0;font-size:28px;line-height:1.2;font-weight:700;\">Rent Reminder</h1>"
    "</div>"
    "<div style=\"padding:32px;\">"
    "<p style=\"margin:0 0 16px;font-size:16px;line-height:1.7;\">Hello <strong>{tenant_name}</strong>,</p>"
    "<p style=\"margin:0 0 20px;font-size:16px;line-height:1.7;\">"
    "This is a friendly reminder that your rent for <strong>{property_name}</strong> "
    "({apartment}) is due on <strong>{due_date}</strong>."
    "</p>"
    "<div style=\"margin:24px 0;padding:20px 22px;background:#f8fafc;border:1px solid #dbe4ee;border-radius:14px;\">"
    "<div style=\"font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;margin-bottom:8px;\">Outstanding Balance</div>"
    "<div style=\"font-size:30px;line-height:1.1;font-weight:700;color:#0f172a;\">{amount}</div>"
    "</div>"
    "<p style=\"margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;\">"
    "Please make payment before the due date to keep your rent record in good standing."
    "</p>"
    "<p style=\"margin:0;font-size:15px;line-height:1.7;color:#475569;\">"
    "Thank you,<br><strong>Property Management Team</strong>"
    "</p>"
    "</div>"
    "</div>"
    "</div>"
)

SUBJECT_MAP = {
    "30_DAYS": "Rent Reminder: 1 Month to Due Date",
    "7_DAYS": "Rent Reminder: 7 Days to Due Date",
    "3_DAYS": "Rent Reminder: 3 Days to Due Date",
    "DUE_TODAY": "Rent Due Today",
    "OVERDUE": "⚠️ Overdue Rent Notice",
}

CHANNEL_SERVICE_COSTS = {
    "sms": Decimal("5.00"),
    "whatsapp": Decimal("12.00"),
    "email": Decimal("2.50"),
    "dashboard": Decimal("0.00"),
}
WAT_TIMEZONE = ZoneInfo("Africa/Lagos")


def _template_setting_keys(landlord_id: Optional[int]) -> list[str]:
    keys = []
    if landlord_id is not None:
        keys.append(f"{TEMPLATE_SETTING_KEY}:landlord:{landlord_id}")
    keys.append(TEMPLATE_SETTING_KEY)
    return keys


def _schedule_setting_keys(landlord_id: Optional[int]) -> list[str]:
    keys = []
    if landlord_id is not None:
        keys.append(f"{SCHEDULE_SETTING_KEY}:landlord:{landlord_id}")
    keys.append(SCHEDULE_SETTING_KEY)
    return keys


def get_reminder_template(db: Session, landlord_id: Optional[int] = None) -> str:
    for key in _template_setting_keys(landlord_id):
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        if setting:
            return DEFAULT_TEMPLATE if setting.value == LEGACY_TEMPLATE else setting.value

    return DEFAULT_TEMPLATE


def save_reminder_template(
    db: Session, message: str, landlord_id: Optional[int] = None
) -> None:
    key = (
        f"{TEMPLATE_SETTING_KEY}:landlord:{landlord_id}"
        if landlord_id is not None
        else TEMPLATE_SETTING_KEY
    )
    setting = (
        db.query(AppSetting).filter(AppSetting.key == key).first()
    )
    if setting:
        setting.value = message
    else:
        db.add(AppSetting(key=key, value=message))
    db.commit()


def get_enabled_channels(db: Session) -> list[str]:
    setting = (
        db.query(AppSetting).filter(
            AppSetting.key == CHANNELS_SETTING_KEY).first()
    )
    if not setting:
        return DEFAULT_CHANNELS.copy()

    try:
        channels = json.loads(setting.value)
    except json.JSONDecodeError:
        return DEFAULT_CHANNELS.copy()

    if not isinstance(channels, list):
        return DEFAULT_CHANNELS.copy()

    normalized = [str(channel).lower() for channel in channels]
    return [channel for channel in normalized if channel in SUPPORTED_CHANNELS]


def save_enabled_channels(db: Session, channels: list[str]) -> list[str]:
    normalized = []
    for channel in channels:
        value = str(channel).lower()
        if value in SUPPORTED_CHANNELS and value not in normalized:
            normalized.append(value)

    if not normalized:
        raise ValueError("At least one reminder channel must be enabled")

    setting = (
        db.query(AppSetting).filter(
            AppSetting.key == CHANNELS_SETTING_KEY).first()
    )
    payload = json.dumps(normalized)

    if setting:
        setting.value = payload
    else:
        db.add(AppSetting(key=CHANNELS_SETTING_KEY, value=payload))

    db.commit()
    return normalized


def _normalize_schedule_rule(raw_rule: dict) -> dict:
    reminder_type = str(raw_rule.get("reminder_type", "")).upper()
    default_rule = next(
        (rule for rule in DEFAULT_REMINDER_SCHEDULE if rule["reminder_type"] == reminder_type),
        None,
    )
    if not default_rule:
        raise ValueError(f"Unsupported reminder type: {reminder_type}")

    trigger_time = str(raw_rule.get("trigger_time", default_rule["trigger_time"])).strip()
    if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", trigger_time):
        raise ValueError(f"Invalid trigger time for {reminder_type}. Use HH:MM format.")

    return {
        "reminder_type": reminder_type,
        "label": default_rule["label"],
        "days_before_due": default_rule["days_before_due"],
        "enabled": bool(raw_rule.get("enabled", default_rule["enabled"])),
        "trigger_time": trigger_time,
    }


def get_reminder_schedule(db: Session, landlord_id: Optional[int] = None) -> list[dict]:
    for key in _schedule_setting_keys(landlord_id):
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        if not setting:
            continue
        try:
            rules = json.loads(setting.value)
        except json.JSONDecodeError:
            break
        if not isinstance(rules, list):
            break
        try:
            normalized = [_normalize_schedule_rule(rule) for rule in rules]
        except ValueError:
            break
        by_type = {rule["reminder_type"]: rule for rule in normalized}
        return [
            by_type.get(default_rule["reminder_type"], default_rule.copy())
            for default_rule in DEFAULT_REMINDER_SCHEDULE
        ]

    return [rule.copy() for rule in DEFAULT_REMINDER_SCHEDULE]


def save_reminder_schedule(
    db: Session,
    rules: list[dict],
    landlord_id: Optional[int] = None,
) -> list[dict]:
    if not rules:
        raise ValueError("At least one reminder schedule rule must be provided")

    normalized = [_normalize_schedule_rule(rule) for rule in rules]
    payload_by_type = {rule["reminder_type"]: rule for rule in normalized}
    merged_rules = [
        payload_by_type.get(default_rule["reminder_type"], default_rule.copy())
        for default_rule in DEFAULT_REMINDER_SCHEDULE
    ]

    key = (
        f"{SCHEDULE_SETTING_KEY}:landlord:{landlord_id}"
        if landlord_id is not None
        else SCHEDULE_SETTING_KEY
    )
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    payload = json.dumps(merged_rules)
    if setting:
        setting.value = payload
    else:
        db.add(AppSetting(key=key, value=payload))
    db.commit()
    return merged_rules


def _schedule_allows_type(
    db: Session,
    reminder_type: str,
    *,
    landlord_id: Optional[int] = None,
    now: Optional[datetime] = None,
) -> bool:
    current = now or datetime.now(WAT_TIMEZONE)
    schedule = get_reminder_schedule(db, landlord_id=landlord_id)
    rule = next((item for item in schedule if item["reminder_type"] == reminder_type), None)
    if not rule or not rule["enabled"]:
        return False

    hour, minute = map(int, str(rule["trigger_time"]).split(":"))
    scheduled_minutes = hour * 60 + minute
    current_minutes = current.hour * 60 + current.minute
    return current_minutes >= scheduled_minutes


def _build_message(template: str, **ctx) -> str:
    try:
        return template.format(**ctx)
    except (KeyError, ValueError):
        return DEFAULT_TEMPLATE.format(**ctx)


def _looks_like_html(message: str) -> bool:
    return bool(re.search(r"<[a-z][\s\S]*>", message, flags=re.IGNORECASE))


def _plain_text_to_html(message: str) -> str:
    escaped = (
        message.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    paragraphs = [part.strip()
                  for part in re.split(r"\n\s*\n", escaped) if part.strip()]
    rendered = "".join(
        (
            "<p style=\"margin:0 0 16px;font-size:16px;line-height:1.75;color:#334155;\">"
            f"{part.replace(chr(10), '<br>')}"
            "</p>"
        )
        for part in paragraphs
    )

    return (
        "<div style=\"margin:0;padding:24px 0;background:#f4efe7;font-family:Georgia,'Times New Roman',serif;color:#1f2937;\">"
        "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eadfce;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.08);\">"
        "<div style=\"padding:28px 32px;background:linear-gradient(135deg,#0f766e,#115e59);color:#ffffff;\">"
        "<div style=\"font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;\">Property Management</div>"
        "<h1 style=\"margin:12px 0 0;font-size:28px;line-height:1.2;font-weight:700;\">Rent Reminder</h1>"
        "</div>"
        "<div style=\"padding:32px;\">"
        f"{rendered}"
        "</div>"
        "</div>"
        "</div>"
    )


def _html_to_text(message: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", message, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _build_channel_message(channel: str, template: str, **ctx) -> str:
    message = _build_message(template, **ctx)
    if channel == "email":
        return message if _looks_like_html(message) else _plain_text_to_html(message)
    return _html_to_text(message)


def get_channel_service_cost(channel: Optional[str], status: str = "SENT") -> Decimal:
    normalized_channel = str(channel or "").lower()
    if status != "SENT":
        return Decimal("0.00")
    return CHANNEL_SERVICE_COSTS.get(normalized_channel, Decimal("0.00"))


def send_test_reminder(
    db: Session,
    *,
    email: Optional[str] = None,
    phone: Optional[str] = None,
) -> list[str]:
    template = get_reminder_template(db)
    enabled_channels = get_enabled_channels(db)
    sent_channels: list[str] = []
    subject = "Test Rent Reminder"

    for channel in enabled_channels:
        message = _build_channel_message(
            channel,
            template,
            tenant_name="Test Tenant",
            property_name="Sample Property",
            apartment="Unit A1",
            amount="NGN 150,000",
            due_date=date.today(),
        )

        if channel == "dashboard":
            sent_channels.append(channel)
        elif channel == "email" and email:
            send_email(email, subject, message)
            sent_channels.append(channel)
        elif channel == "sms" and phone and send_sms(phone, message):
            sent_channels.append(channel)
        elif channel == "whatsapp" and phone and send_whatsapp(phone, message):
            sent_channels.append(channel)

    return sent_channels


def ensure_landlord_can_send_reminders(db: Session, landlord_id: int) -> None:
    if not billing_service.has_active_landlord_plan_access(db, landlord_id):
        raise ValueError(
            "Your free trial has ended and no active annual plan was found. Upgrade your billing plan to send rent reminders."
        )


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


def run_reminders(
    db: Session,
    landlord_id: Optional[int] = None,
    *,
    respect_schedule: bool = False,
) -> int:
    """
    Evaluate every unpaid rent against reminder rules and dispatch reminders
    across all enabled channels.

    Deduplication: RentReminder has a unique constraint on (rent_id, reminder_type).
    An OVERDUE reminder can only fire once per rent (by design — prevents spam).
    All sends are logged to RentReminderLog regardless of deduplication.

    Returns the number of reminders successfully sent this run.
    """
    if landlord_id is not None:
        ensure_landlord_can_send_reminders(db, landlord_id)

    today = datetime.now(WAT_TIMEZONE).date()
    enabled_channels = get_enabled_channels(db)
    rents = _base_unpaid_query(db, landlord_id).all()
    sent_count = 0
    template_cache: dict[Optional[int], str] = {}

    for rent in rents:
        # Guard: skip if fully paid (decimal comparison-safe)
        if rent.paid_amount >= rent.amount:
            continue

        due_types = get_due_reminder_types(rent.end_date, today)
        if not due_types or not enabled_channels:
            continue

        tenant = rent.tenant
        if not tenant:
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
        template_owner_id = house.landlord_id if house else None

        if template_owner_id is not None and not billing_service.has_active_landlord_plan_access(
            db, template_owner_id
        ):
            continue

        if template_owner_id not in template_cache:
            template_cache[template_owner_id] = get_reminder_template(
                db, landlord_id=template_owner_id
            )

        template = template_cache[template_owner_id]

        for reminder_type in due_types:
            if respect_schedule and not _schedule_allows_type(
                db,
                reminder_type,
                landlord_id=template_owner_id,
            ):
                continue
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

            subject = SUBJECT_MAP.get(reminder_type, "Rent Reminder")
            channel_attempted = False

            for channel in enabled_channels:
                send_status = "SENT"
                message = _build_channel_message(
                    channel,
                    template,
                    tenant_name=tenant.full_name,
                    property_name=property_name,
                    apartment=apt_label,
                    amount=outstanding,
                    due_date=rent.end_date,
                )

                if channel == "dashboard":
                    channel_attempted = True
                elif channel == "email":
                    channel_attempted = True
                    if not tenant.email:
                        send_status = "FAILED"
                    else:
                        try:
                            send_email(tenant.email, subject, message)
                        except Exception as exc:
                            send_status = "FAILED"
                            print(
                                f"❌ Email failed for tenant {tenant.id}: {exc}")
                elif channel == "sms":
                    channel_attempted = True
                    send_status = (
                        "SENT" if tenant.phone and send_sms(
                            tenant.phone, message) else "FAILED"
                    )
                elif channel == "whatsapp":
                    channel_attempted = True
                    send_status = (
                        "SENT"
                        if tenant.phone and send_whatsapp(tenant.phone, message)
                        else "FAILED"
                    )
                else:
                    continue

                db.add(
                    RentReminderLog(
                        rent_id=rent.id,
                        tenant_id=tenant.id,
                        reminder_type=reminder_type,
                        message=message,
                        status=send_status,
                        channel_used=channel,
                        service_cost=get_channel_service_cost(
                            channel, send_status),
                        cost_currency="NGN",
                    )
                )

                if send_status == "SENT":
                    sent_count += 1

            if not channel_attempted:
                continue

            # Record deduplication entry
            db.add(
                RentReminder(rent_id=rent.id, reminder_type=reminder_type)
            )

        db.commit()

    return sent_count
