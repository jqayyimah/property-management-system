from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.permissions import require_admin_or_landlord
from app.schemas.reminder import (
    TriggerResponse,
    ReminderSummary,
    RentReminderInfo,
    ReminderMessageUpdate,
    ReminderMessageResponse,
    ReminderLogResponse,
)
from app.services import reminder_service
from app.models.rent_reminder_log import RentReminderLog

router = APIRouter(prefix="/rent-reminders", tags=["Rent Reminders"])


def _landlord_id(user: dict) -> int | None:
    """Return landlord_id for scoping, or None when user is ADMIN."""
    return user["landlord_id"] if user["role"] == "LANDLORD" else None


# ── Dashboard summary ─────────────────────────────────────────────────────────


@router.get("/summary", response_model=ReminderSummary)
def get_summary(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    data = reminder_service.get_summary(db, landlord_id=_landlord_id(user))
    return ReminderSummary(**data)


# ── Rents needing reminders (frontend table data) ─────────────────────────────


@router.get("/", response_model=list[RentReminderInfo])
def list_reminder_rents(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    rows = reminder_service.get_rents_needing_reminders(
        db, landlord_id=_landlord_id(user)
    )
    return [RentReminderInfo(**r) for r in rows]


# ── Manual trigger ────────────────────────────────────────────────────────────


@router.post("/trigger", response_model=TriggerResponse)
def trigger_reminders(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    sent = reminder_service.run_reminders(db, landlord_id=_landlord_id(user))
    return TriggerResponse(success=True, reminders_sent=sent)


# ── Message template settings ─────────────────────────────────────────────────


@router.get("/settings", response_model=ReminderMessageResponse)
def get_message_template(
    db: Session = Depends(get_db),
    _user: dict = Depends(require_admin_or_landlord),
):
    return ReminderMessageResponse(
        message=reminder_service.get_reminder_template(db)
    )


@router.put("/settings", response_model=ReminderMessageResponse)
def update_message_template(
    body: ReminderMessageUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(require_admin_or_landlord),
):
    reminder_service.save_reminder_template(db, body.message)
    return ReminderMessageResponse(message=body.message)


# ── Reminder history ─────────────────────────────────────────────────────────


@router.get("/logs", response_model=list[ReminderLogResponse])
def get_reminder_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    q = db.query(RentReminderLog).order_by(RentReminderLog.sent_at.desc())

    landlord_id = _landlord_id(user)
    if landlord_id:
        from app.models.tenant import Tenant
        from app.models.apartment import Apartment
        from app.models.house import House

        q = (
            q.join(Tenant, RentReminderLog.tenant_id == Tenant.id)
            .join(Apartment, Tenant.apartment_id == Apartment.id)
            .join(House, Apartment.house_id == House.id)
            .filter(House.landlord_id == landlord_id)
        )

    return q.limit(limit).all()
