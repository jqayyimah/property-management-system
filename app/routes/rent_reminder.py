from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.permissions import require_admin_or_landlord, require_admin
from app.schemas.reminder import (
    TriggerResponse,
    ReminderSummary,
    RentReminderInfo,
    ReminderMessageUpdate,
    ReminderMessageResponse,
    ReminderChannelsUpdate,
    ReminderChannelsResponse,
    ReminderScheduleUpdate,
    ReminderScheduleResponse,
    TestReminderRequest,
    TestReminderResponse,
    ReminderLogResponse,
)
from app.services import reminder_service
from app.services.audit_service import create_audit_log
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
    try:
        sent = reminder_service.run_reminders(db, landlord_id=_landlord_id(user))
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    create_audit_log(
        db,
        action="REMINDERS_TRIGGERED",
        entity_type="REMINDER_BATCH",
        actor=user,
        landlord_id=_landlord_id(user),
        description="Rent reminders triggered manually",
        details={"reminders_sent": sent},
    )
    db.commit()
    return TriggerResponse(success=True, reminders_sent=sent)


# ── Message template settings ─────────────────────────────────────────────────


@router.get("/settings", response_model=ReminderMessageResponse)
def get_message_template(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    return ReminderMessageResponse(
        message=reminder_service.get_reminder_template(
            db, landlord_id=_landlord_id(user)
        )
    )


@router.put("/settings", response_model=ReminderMessageResponse)
def update_message_template(
    body: ReminderMessageUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    reminder_service.save_reminder_template(
        db, body.message, landlord_id=_landlord_id(user)
    )
    create_audit_log(
        db,
        action="REMINDER_TEMPLATE_UPDATED",
        entity_type="REMINDER_SETTINGS",
        actor=user,
        landlord_id=_landlord_id(user),
        description="Reminder message template updated",
        details={"message_preview": body.message[:120]},
    )
    db.commit()
    return ReminderMessageResponse(message=body.message)


@router.get("/channels", response_model=ReminderChannelsResponse)
def get_channels(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    return ReminderChannelsResponse(
        channels=reminder_service.get_enabled_channels(
            db, landlord_id=_landlord_id(user)
        )
    )


@router.put("/channels", response_model=ReminderChannelsResponse)
def update_channels(
    body: ReminderChannelsUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    try:
        channels = reminder_service.save_enabled_channels(
            db, body.channels, landlord_id=_landlord_id(user)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    create_audit_log(
        db,
        action="REMINDER_CHANNELS_UPDATED",
        entity_type="REMINDER_SETTINGS",
        actor=user,
        landlord_id=_landlord_id(user),
        description="Reminder channels updated",
        details={"channels": channels},
    )
    db.commit()
    return ReminderChannelsResponse(channels=channels)


@router.get("/schedule", response_model=ReminderScheduleResponse)
def get_schedule(
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    return ReminderScheduleResponse(
        rules=reminder_service.get_reminder_schedule(
            db, landlord_id=_landlord_id(user)
        )
    )


@router.put("/schedule", response_model=ReminderScheduleResponse)
def update_schedule(
    body: ReminderScheduleUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin_or_landlord),
):
    try:
        rules = reminder_service.save_reminder_schedule(
            db,
            [rule.model_dump() for rule in body.rules],
            landlord_id=_landlord_id(user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    create_audit_log(
        db,
        action="REMINDER_SCHEDULE_UPDATED",
        entity_type="REMINDER_SETTINGS",
        actor=user,
        landlord_id=_landlord_id(user),
        description="Reminder schedule updated",
        details={"rules": rules},
    )
    db.commit()
    return ReminderScheduleResponse(rules=rules)


@router.post("/test-send", response_model=TestReminderResponse)
def test_send_reminder(
    body: TestReminderRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    sent_channels = reminder_service.send_test_reminder(
        db,
        email=body.email,
        phone=body.phone,
    )

    if not sent_channels:
        raise HTTPException(
            status_code=400,
            detail="No enabled reminder channels could be sent. Provide email or phone as needed.",
        )

    create_audit_log(
        db,
        action="TEST_REMINDER_SENT",
        entity_type="REMINDER_TEST",
        actor=user,
        description="Admin sent test reminder",
        details={"sent_channels": sent_channels},
    )
    db.commit()

    return TestReminderResponse(
        message="Test reminder sent successfully",
        sent_channels=sent_channels,
    )


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

    logs = q.limit(limit).all()
    return [
        ReminderLogResponse(
            id=log.id,
            rent_id=log.rent_id,
            tenant_id=log.tenant_id,
            tenant_name=log.tenant.full_name if log.tenant else None,
            landlord_name=(
                log.tenant.apartment.house.landlord.full_name
                if log.tenant and log.tenant.apartment and log.tenant.apartment.house
                else None
            ),
            reminder_type=log.reminder_type,
            message=log.message,
            status=log.status,
            channel_used=log.channel_used,
            service_cost=log.service_cost,
            cost_currency=log.cost_currency,
            sent_at=log.sent_at,
        )
        for log in logs
    ]
